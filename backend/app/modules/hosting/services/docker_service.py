"""
Docker Management Service.

Low-level Docker operations for VPS container management.
"""
import os
import secrets
import hashlib
import logging
import tarfile
import zipfile
import tempfile
import shutil
import json
import time
import io
import re
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Iterator, BinaryIO, List, Any
from cryptography.fernet import Fernet, InvalidToken

try:
    import docker
    from docker.errors import DockerException, APIError, NotFound
    from docker.types import Mount
except ImportError:
    # Docker SDK not installed - will use mock for development
    docker = None
    DockerException = Exception
    APIError = Exception
    NotFound = Exception
    Mount = None

try:
    import yaml
except ImportError:
    # PyYAML not installed - will fall back to line-based patching
    yaml = None

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hosting.models import VPSSubscription, ContainerInstance, ContainerStatus
from app.modules.hosting.repository import ContainerInstanceRepository
from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DockerManagementService:
    """Service for managing Docker containers for VPS hosting.

    Note: Docker client is lazily initialized only when actually needed,
    to avoid unnecessary warnings when service is imported but not used.
    """

    def __init__(self, db: AsyncSession):
        """Initialize Docker management service (lazy Docker client initialization)."""
        self.db = db
        self.repository = ContainerInstanceRepository(db)

        # Lazy Docker client initialization - only initialize when actually needed
        self._client = None
        self._docker_available = None
        self._client_initialized = False

        # Network configuration
        self.ip_network_base = "172.20"
        self.ssh_port_start = 2222

        # Encryption key for passwords (should be in env)
        encryption_key = os.getenv("VPS_PASSWORD_ENCRYPTION_KEY")
        if not encryption_key:
            # Generate a key for development (MUST be in env for production)
            encryption_key = Fernet.generate_key().decode()
            logger.warning("Using generated encryption key - set VPS_PASSWORD_ENCRYPTION_KEY in production!")

        self.cipher = Fernet(encryption_key.encode())

    def _ensure_docker_client(self):
        """Initialize Docker client if not already initialized (lazy initialization)."""
        if self._client_initialized:
            return

        self._client_initialized = True

        if docker:
            try:
                # Connect to Docker socket (or socket proxy in production)
                # In development: unix:///var/run/docker.sock
                # In production: tcp://docker-socket-proxy:2375
                docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
                self._client = docker.DockerClient(base_url=docker_host)
                
                # Actually test the connection by calling a lightweight API method
                # This will fail immediately if there's a permission or connection issue
                self._client.ping()
                
                self._docker_available = True
                logger.info(f"Docker client initialized and verified with host: {docker_host}")
            except Exception as e:
                logger.warning(f"Docker client not available: {e}")
                self._client = None
                self._docker_available = False
        else:
            logger.warning("Docker SDK not installed")
            self._client = None
            self._docker_available = False

    @property
    def client(self):
        """Get Docker client (lazy initialization)."""
        self._ensure_docker_client()
        return self._client

    @property
    def docker_available(self):
        """Check if Docker is available (lazy initialization)."""
        self._ensure_docker_client()
        return self._docker_available

    def _get_unique_subnet_octet(self, subscription_id: str) -> int:
        """
        Generate a unique third octet (1-254) for network subnet based on subscription ID.
        
        Uses hash of subscription ID to ensure consistent subnet per subscription
        while avoiding overlaps between different subscriptions.
        """
        # Hash the subscription ID to get a consistent value
        hash_obj = hashlib.md5(subscription_id.encode())
        hash_int = int(hash_obj.hexdigest(), 16)
        # Map to range 1-254 (avoid 0 and 255)
        octet = (hash_int % 253) + 1
        return octet

    async def create_container(self, subscription: VPSSubscription) -> ContainerInstance:
        """
        Create a fully isolated Docker container with dedicated network and resources.

        Args:
            subscription: VPS subscription with plan details

        Returns:
            ContainerInstance model with container details

        Raises:
            DockerException: If container creation fails
        """
        if not self.docker_available:
            raise Exception("Docker is not available")

        try:
            # Generate identifiers
            customer8 = str(subscription.customer_id)[:8]
            sub8 = str(subscription.id)[:8]
            container_name = f"vps-{customer8}-{subscription.plan.slug}-{sub8}"
            network_name = f"vps-net-{customer8}-{sub8}"

            # Allocate unique IP and SSH port
            ip_address = await self.repository.get_next_available_ip()
            ssh_port = await self.repository.get_next_available_ssh_port()
            http_port = await self.repository.get_next_available_http_port()
            logger.info(f"Allocated ports - SSH: {ssh_port}, HTTP: {http_port}")

            # Generate root password
            root_password = self._generate_password()
            encrypted_password = self._encrypt_password(root_password)

            # Create isolated bridge network with unique subnet per subscription
            # Use subscription ID hash to ensure unique subnet (avoids overlaps)
            subnet_octet = self._get_unique_subnet_octet(str(subscription.id))
            shared_network = None  # Initialize for Docker proxy access

            try:
                network = self.client.networks.create(
                    name=network_name,
                    driver="bridge",
                    ipam=docker.types.IPAMConfig(
                        pool_configs=[docker.types.IPAMPool(
                            subnet=f"{self.ip_network_base}.{subnet_octet}.0/24",
                            gateway=f"{self.ip_network_base}.{subnet_octet}.1"
                        )]
                    ),
                    internal=False  # Allow internet access
                )
                logger.info(f"Created network: {network_name}")
            except APIError as e:
                # Check if network already exists
                if "already exists" in str(e).lower() or "already in use" in str(e).lower():
                    logger.info(f"Network {network_name} already exists, reusing it")
                    try:
                        network = self.client.networks.get(network_name)
                    except NotFound:
                        # Network was deleted between creation attempt and get, re-raise original error
                        logger.error(f"Network {network_name} creation failed and network not found: {e}")
                        raise
                else:
                    # Other API error during creation, re-raise
                    logger.error(f"Failed to create network {network_name}: {e}")
                    raise
            except Exception as e:
                # Unexpected error, try to get existing network as fallback
                logger.warning(f"Unexpected error creating network {network_name}: {e}, attempting to get existing network")
                try:
                    network = self.client.networks.get(network_name)
                    logger.info(f"Found existing network: {network_name}")
                except NotFound:
                    # Network doesn't exist, re-raise original error
                    logger.error(f"Network {network_name} does not exist and creation failed: {e}")
                    raise

            # Get cloudmanager-network for Docker proxy access
            # VPS will connect to this network to access docker-socket-proxy
            # NOTE: docker-compose usually prefixes network names (e.g. "manil_cloudmanager-network"),
            # so we try to discover the real network via the proxy container attachments.
            try:
                shared_network = None
                shared_network_name = None

                # 1) Direct lookup (works if network was created with explicit name)
                try:
                    shared_network = self.client.networks.get("cloudmanager-network")
                    shared_network_name = "cloudmanager-network"
                except Exception:
                    shared_network = None

                # 2) Discover via proxy container's networks (handles compose-prefixed names)
                if not shared_network:
                    proxy_container = None
                    try:
                        proxy_container = self.client.containers.get("cloudmanager-docker-proxy")
                    except Exception:
                        try:
                            proxy_container = self.client.containers.get("docker-socket-proxy")
                        except Exception:
                            proxy_container = None

                    proxy_networks = (proxy_container.attrs.get("NetworkSettings", {}).get("Networks", {}) or {}) if proxy_container else {}
                    if proxy_networks:
                        # Prefer the expected suffix; otherwise fall back to any network that contains "cloudmanager".
                        candidates = list(proxy_networks.keys())
                        preferred = next((n for n in candidates if n.endswith("cloudmanager-network")), None)
                        if not preferred:
                            preferred = next((n for n in candidates if "cloudmanager" in n), None)
                        shared_network_name = preferred or candidates[0]
                        try:
                            shared_network = self.client.networks.get(shared_network_name)
                        except Exception:
                            shared_network = None

                if shared_network:
                    logger.info(f"Found shared network '{shared_network_name}', VPS will access host Docker via proxy on this network")
                else:
                    logger.warning("Could not locate shared cloudmanager network; Docker proxy access may be unavailable")
            except NotFound:
                logger.warning("cloudmanager-network not found, Docker-in-Docker will not be available")
                shared_network = None
            except Exception as e:
                logger.warning(f"Error getting cloudmanager-network: {e}, Docker-in-Docker will not be available")
                shared_network = None

            # Create persistent volume path
            volume_path = f"/var/lib/vps-volumes/{container_name}"
            os.makedirs(volume_path, exist_ok=True)

            # Pull Docker image (subscription override > plan default)
            docker_image = getattr(subscription, "os_docker_image", None) or subscription.plan.docker_image
            logger.info(f"Pulling image: {docker_image}")
            self.client.images.pull(docker_image)

            # Prepare hostname
            hostname = f"vps-{subscription.plan.slug}-{sub8}"

            # Command to keep container running and set up SSH
            # This will: set root password, install/start SSH, then keep running
            # Note: SSH installation is done here synchronously to avoid apt-get lock conflicts
            # with later Docker installation
            container_command = [
                "/bin/bash", "-c",
                (
                    "set -e && "
                    f"echo 'root:{root_password}' | chpasswd && "
                    "if ! command -v sshd &> /dev/null || ! command -v nginx &> /dev/null; then "
                    # Install SSH and Nginx with lock file to prevent conflicts
                    "flock -x /var/lock/apt-setup.lock -c '"
                    "DEBIAN_FRONTEND=noninteractive apt-get update -qq && "
                    "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openssh-server nginx && "
                    "rm -rf /var/lib/apt/lists/*"
                    "'; "
                    "fi && "
                    "mkdir -p /var/run/sshd && "
                    "echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config && "
                    "echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config && "
                    "/usr/sbin/sshd -D & "
                    "exec tail -f /dev/null"
                )
            ]
            
            # Create container with HARDENED security configuration
            # NOTE: When VPS_DOCKER_ENGINE_MODE=dind, Docker-in-Docker requires writable cgroups.
            # On many hosts (notably Docker Desktop) this effectively requires running the VPS container
            # with elevated privileges + host cgroup namespace.
            dind_mode = (getattr(settings, "VPS_DOCKER_ENGINE_MODE", "auto") or "auto").strip().lower() == "dind"
            create_kwargs = dict(
                image=docker_image,
                name=container_name,
                hostname=hostname,
                command=container_command,

                # === RESOURCE LIMITS ===
                # CPU quota (cores * 100000)
                cpu_quota=int(subscription.plan.cpu_cores * 100000),
                # Memory limit
                mem_limit=f"{subscription.plan.ram_gb}g",
                # Memory swap limit (same as memory = no swap)
                memswap_limit=f"{subscription.plan.ram_gb}g",
                # Storage limit (if supported by storage driver)
                storage_opt={"size": f"{subscription.plan.storage_gb}g"},

                # === PROCESS LIMITS ===
                # Prevent fork bombs
                pids_limit=2048,

                # === ULIMITS ===
                ulimits=[
                    docker.types.Ulimit(name='nofile', soft=1024, hard=2048),  # File descriptors
                    docker.types.Ulimit(name='nproc', soft=512, hard=1024)     # Processes
                ] if docker else None,

                # === NETWORK ===
                network=network_name,

                # === PORT MAPPING ===
                # Map container port 22 to unique host port (SSH)
                # Map container port 80 to unique host port (HTTP for service domains)
                ports={
                    '22/tcp': ssh_port,
                    '80/tcp': http_port
                },

                # === VOLUMES ===
                mounts=[
                    Mount(target="/data", source=volume_path, type="bind", read_only=False),
                    # DinD requires writable cgroups for nested container creation (build/run).
                    # Bind-mount cgroup fs when in DinD mode.
                    *(
                        [Mount(target="/sys/fs/cgroup", source="/sys/fs/cgroup", type="bind", read_only=False)]
                        if dind_mode
                        else []
                    ),
                    # NOTE: Docker socket NOT mounted directly for security
                    # VPS accesses Docker via docker-socket-proxy over TCP (see DOCKER_HOST env var)
                ] if Mount else None,

                # === SECURITY HARDENING ===
                # CRITICAL: Never run as root
                # user="1000:1000",  # Uncomment if image supports non-root user

                # For Docker-in-Docker support, we need specific capabilities
                # These allow running Docker inside the VPS while maintaining some security
                cap_add=[
                    # Basic capabilities
                    "CHOWN",           # Change file ownership
                    "DAC_OVERRIDE",    # Bypass file permissions
                    "SETGID",          # Set group ID
                    "SETUID",          # Set user ID
                    "NET_BIND_SERVICE", # Bind to ports < 1024
                    # Docker-specific capabilities
                    "SYS_ADMIN",       # Required for mounting filesystems (Docker volumes)
                    "NET_ADMIN",       # Required for Docker networking
                    "SYS_RESOURCE",    # Required for resource management
                    "MKNOD",           # Required for device creation
                    "AUDIT_WRITE",     # Required for audit logs
                    "SYS_CHROOT",      # Required for chroot operations
                ],

                # Security options - allow some privileges for Docker
                security_opt=[
                    # NOTE: no-new-privileges is disabled to allow Docker operations
                    # The Docker Socket Proxy restricts what operations are allowed
                    "apparmor:unconfined",  # Required for Docker-in-Docker (use colon, not =)
                    "seccomp:unconfined"    # Required for Docker-in-Docker (use colon, not =)
                ],

                # Cgroup namespace - gives container its own cgroup view.
                # Docker SDK arg name differs by version; we set it below in a compatible way.

                # CRITICAL: Never run in privileged mode
                # We use capabilities instead for better security
                # DinD typically requires privileged mode to get writable cgroup controllers on Docker Desktop/Linux.
                privileged=True if dind_mode else False,

                # NOTE: read_only=True disabled to allow SSH installation at runtime
                # TODO: Use custom image with SSH pre-installed for better security
                # read_only=True,

                # Writable /tmp with size limit
                tmpfs={
                    '/tmp': 'size=100m,mode=1777',
                    '/var/tmp': 'size=50m,mode=1777'
                },

                # === AUTO-RESTART POLICY ===
                restart_policy={"Name": "unless-stopped"},

                # === HEALTHCHECK ===
                healthcheck={
                    # Check if SSH service is running
                    "test": ["CMD-SHELL", "nc -z localhost 22 || exit 1"],
                    "interval": 30000000000,    # 30 seconds (nanoseconds)
                    "timeout": 10000000000,     # 10 seconds
                    "retries": 3,
                    "start_period": 60000000000 # 60 seconds grace period
                },

                # === RUN DETACHED ===
                detach=True,

                # === ENVIRONMENT VARIABLES ===
                environment={
                    "ROOT_PASSWORD": root_password,  # Will be used by entrypoint
                    "CONTAINER_ID": str(subscription.id)[:8],
                    "VPS_SUBSCRIPTION_ID": str(subscription.id),
                    # Docker engine selection:
                    # - If VPS_DOCKER_ENGINE_MODE=dind, do NOT pin DOCKER_HOST to the host proxy (build must happen inside VPS).
                    # - Otherwise, default to host Docker proxy for compatibility/performance.
                    **(
                        {}
                        if (getattr(settings, "VPS_DOCKER_ENGINE_MODE", "auto") or "auto").strip().lower() == "dind"
                        else {
                            # Use docker-compose container_name for reliable DNS on the shared network.
                            "DOCKER_HOST": "tcp://cloudmanager-docker-proxy:2375",
                            "DOCKER_API_VERSION": "1.41",
                        }
                    ),
                },

                # === LABELS ===
                labels={
                    "vps.subscription_id": str(subscription.id),
                    "vps.customer_id": str(subscription.customer_id),
                    "vps.plan": subscription.plan.slug,
                    "vps.managed": "true"
                }
            )

            if dind_mode:
                create_kwargs["cgroupns_mode"] = "host"

            try:
                container = self.client.containers.create(**create_kwargs)
            except TypeError as e:
                msg = str(e)
                if "cgroupns_mode" in msg:
                    create_kwargs.pop("cgroupns_mode", None)
                    create_kwargs["cgroupns"] = "host" if dind_mode else "private"
                    container = self.client.containers.create(**create_kwargs)
                elif "cgroupns" in msg:
                    create_kwargs.pop("cgroupns_mode", None)
                    create_kwargs.pop("cgroupns", None)
                    container = self.client.containers.create(**create_kwargs)
                else:
                    raise

            # Start the container
            container.start()
            logger.info(f"Container {container_name} started with ID: {container.id}")

            # Connect to cloudmanager-network for Docker proxy access (if available)
            if shared_network and (getattr(settings, "VPS_DOCKER_ENGINE_MODE", "auto") or "auto").strip().lower() != "dind":
                try:
                    # Add explicit aliases so the VPS can reliably resolve the proxy
                    # regardless of docker-compose service/container_name differences.
                    #
                    # If it's already connected, Docker won't update aliases in-place,
                    # so disconnect/reconnect to enforce aliases.
                    try:
                        shared_network.disconnect(container, force=True)
                    except Exception:
                        pass
                    shared_network.connect(
                        container,
                        aliases=["docker-socket-proxy", "cloudmanager-docker-proxy"],
                    )
                    logger.info(f"Connected VPS to cloudmanager-network for Docker proxy access")
                except Exception as e:
                    logger.warning(f"Could not connect VPS to cloudmanager-network: {e}")
                    logger.warning("Docker-in-Docker will not be available for this VPS")

            # Create ContainerInstance model
            instance = ContainerInstance(
                subscription_id=subscription.id,
                container_id=container.id,
                container_name=container_name,
                ip_address=ip_address,
                network_name=network_name,
                hostname=hostname,
                ssh_port=ssh_port,
                http_port=http_port,
                root_password=encrypted_password,
                status=ContainerStatus.RUNNING,
                cpu_limit=subscription.plan.cpu_cores,
                memory_limit_gb=subscription.plan.ram_gb,
                storage_limit_gb=subscription.plan.storage_gb,
                data_volume_path=volume_path,
                first_started_at=datetime.utcnow(),
                last_started_at=datetime.utcnow()
            )

            return instance

        except Exception as e:
            logger.error(f"Failed to create container: {e}")
            # Attempt cleanup
            await self._cleanup_failed_container(container_name, network_name)
            raise

    async def start_container(self, container_id: str) -> bool:
        """
        Start a stopped container.

        Args:
            container_id: Docker container ID

        Returns:
            True if successful, False otherwise
        """
        if not self.docker_available:
            return False

        try:
            container = self.client.containers.get(container_id)
            container.start()
            logger.info(f"Container {container_id[:12]} started")
            return True
        except Exception as e:
            logger.error(f"Failed to start container {container_id}: {e}")
            return False

    async def stop_container(self, container_id: str, timeout: int = 30) -> bool:
        """
        Gracefully stop a running container.

        Args:
            container_id: Docker container ID
            timeout: Seconds to wait before killing

        Returns:
            True if successful, False otherwise
        """
        if not self.docker_available:
            return False

        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=timeout)
            logger.info(f"Container {container_id[:12]} stopped")
            return True
        except Exception as e:
            logger.error(f"Failed to stop container {container_id}: {e}")
            return False

    async def reboot_container(self, container_id: str) -> bool:
        """
        Reboot a container (restart).

        Args:
            container_id: Docker container ID

        Returns:
            True if successful, False otherwise
        """
        if not self.docker_available:
            return False

        try:
            container = self.client.containers.get(container_id)
            container.restart(timeout=30)
            logger.info(f"Container {container_id[:12]} rebooted")
            return True
        except Exception as e:
            logger.error(f"Failed to reboot container {container_id}: {e}")
            return False

    async def delete_container(self, container_id: str, remove_volumes: bool = True) -> bool:
        """
        Permanently delete a container and optionally its volumes.

        Args:
            container_id: Docker container ID
            remove_volumes: Whether to remove persistent volumes

        Returns:
            True if successful, False otherwise
        """
        if not self.docker_available:
            return False

        try:
            container = self.client.containers.get(container_id)

            # Get network and volume info before deletion
            attrs = container.attrs
            networks = list(attrs['NetworkSettings']['Networks'].keys())
            network_name = networks[0] if networks else None

            # Get volume path
            mounts = attrs.get('Mounts', [])
            volume_path = None
            for mount in mounts:
                if mount.get('Type') == 'bind' and '/data' in mount.get('Destination', ''):
                    volume_path = mount.get('Source')
                    break

            # Stop if running
            if container.status == 'running':
                container.stop(timeout=30)

            # Remove container
            container.remove(force=True)
            logger.info(f"Container {container_id[:12]} removed")

            # Remove network
            if network_name:
                try:
                    network = self.client.networks.get(network_name)
                    network.remove()
                    logger.info(f"Network {network_name} removed")
                except Exception as e:
                    logger.warning(f"Could not remove network {network_name}: {e}")

            # Remove volumes
            if remove_volumes and volume_path:
                try:
                    import shutil
                    shutil.rmtree(volume_path, ignore_errors=True)
                    logger.info(f"Volume {volume_path} removed")
                except Exception as e:
                    logger.warning(f"Could not remove volume {volume_path}: {e}")

            return True
        except Exception as e:
            logger.error(f"Failed to delete container {container_id}: {e}")
            return False

    async def get_container_stats(self, container_id: str) -> Optional[Dict]:
        """
        Fetch real-time resource usage statistics.

        Args:
            container_id: Docker container ID

        Returns:
            Dictionary with CPU, memory, network, and block I/O stats
        """
        if not self.docker_available:
            return None

        try:
            container = self.client.containers.get(container_id)

            # Get stats snapshot
            stats = container.stats(stream=False)

            # Parse CPU usage
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                        stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                           stats['precpu_stats']['system_cpu_usage']
            cpu_count = stats['cpu_stats']['online_cpus']

            if system_delta > 0 and cpu_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * cpu_count * 100.0
            else:
                cpu_percent = 0.0

            # Parse memory usage
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 1)
            memory_percent = (memory_usage / memory_limit) * 100.0 if memory_limit > 0 else 0.0

            # Parse network I/O
            network_rx = 0
            network_tx = 0
            networks = stats.get('networks', {})
            for interface, data in networks.items():
                network_rx += data.get('rx_bytes', 0)
                network_tx += data.get('tx_bytes', 0)

            # Parse block I/O
            block_read = 0
            block_write = 0
            blkio_stats = stats.get('blkio_stats', {})
            io_service_bytes = blkio_stats.get('io_service_bytes_recursive', [])
            for entry in io_service_bytes:
                if entry.get('op') == 'Read':
                    block_read += entry.get('value', 0)
                elif entry.get('op') == 'Write':
                    block_write += entry.get('value', 0)

            # Process count
            pids_stats = stats.get('pids_stats', {})
            process_count = pids_stats.get('current')

            return {
                'cpu_usage_percent': round(cpu_percent, 2),
                'memory_usage_mb': round(memory_usage / (1024 * 1024), 2),
                'memory_usage_percent': round(memory_percent, 2),
                'network_rx_bytes': network_rx,
                'network_tx_bytes': network_tx,
                'block_read_bytes': block_read,
                'block_write_bytes': block_write,
                'process_count': process_count
            }
        except Exception as e:
            logger.error(f"Failed to get stats for container {container_id}: {e}")
            return None

    async def get_container_status(self, container_id: str) -> Optional[str]:
        """Get current container status."""
        if not self.docker_available:
            return None

        try:
            container = self.client.containers.get(container_id)
            return container.status
        except Exception as e:
            logger.error(f"Failed to get status for container {container_id}: {e}")
            return None

    async def exec_command(self, container_id: str, command: str, tty: bool = False) -> Optional[Dict]:
        """
        Execute command inside container (synchronous, returns all output).
        
        Args:
            container_id: Docker container ID
            command: Command to execute
            tty: Allocate a pseudo-TTY (for interactive commands)
        
        Returns:
            Dict with exit_code and output
        """
        if not self.docker_available:
            return None

        try:
            container = self.client.containers.get(container_id)
            exit_code, output = container.exec_run(command, tty=tty)
            return {
                'exit_code': exit_code,
                'output': output.decode('utf-8', errors='replace') if output else ''
            }
        except Exception as e:
            logger.error(f"Failed to exec command in container {container_id}: {e}")
            return None
    
    def exec_command_stream(self, container_id: str, command: str, tty: bool = False) -> Iterator[str]:
        """
        Execute command with streaming output for real-time terminal.

        Returns generator that yields output chunks.

        Args:
            container_id: Docker container ID
            command: Command to execute
            tty: Allocate a pseudo-TTY (for interactive commands)
        """
        if not self.docker_available:
            return iter(())

        try:
            container = self.client.containers.get(container_id)

            # Use the newer exec_run API with stream=True
            # This returns a generator that yields output chunks
            exec_result = container.exec_run(
                cmd=command,
                tty=tty,
                stream=True,
                demux=False  # Don't separate stdout/stderr when tty=True
            )

            # exec_run with stream=True returns a generator
            for chunk in exec_result.output:
                if chunk:
                    yield chunk.decode('utf-8', errors='replace')
        except Exception as e:
            logger.error(f"Failed to exec streaming command in container {container_id}: {e}")
            yield f"Error: {str(e)}\n"

    async def deploy_files_to_container(
        self,
        container_id: str,
        archive_path: str,
        target_path: str = "/data",
        extract: bool = True
    ) -> Dict[str, any]:
        """
        Deploy files to container by extracting archive and copying to target path.
        
        Args:
            container_id: Docker container ID
            archive_path: Path to archive file (zip, tar, tar.gz) on host
            target_path: Target directory in container (default: /data)
            extract: Whether to extract archive or copy as-is
        
        Returns:
            Dict with deployment status, details, and logs
        """
        if not self.docker_available:
            return {
                "success": False,
                "error": "Docker not available",
                "logs": ["❌ Docker not available"]
            }
        
        temp_dir = None
        logs = []
        
        def add_log(message: str, level: str = "info"):
            """Add a log message with timestamp."""
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{timestamp}] {message}"
            logs.append(log_entry)
            if level == "error":
                logger.error(log_entry)
            else:
                logger.info(log_entry)
        
        try:
            add_log("🚀 Starting deployment process...")
            container = self.client.containers.get(container_id)
            
            # Create temporary directory for extraction
            temp_dir = tempfile.mkdtemp(prefix="vps_deploy_")
            extracted_path = os.path.join(temp_dir, "extracted")
            os.makedirs(extracted_path, exist_ok=True)
            add_log(f"📁 Created temporary directory: {temp_dir}")
            
            # Extract archive
            archive_file = Path(archive_path)
            if not archive_file.exists():
                add_log(f"❌ Archive not found: {archive_path}", "error")
                return {
                    "success": False,
                    "error": f"Archive not found: {archive_path}",
                    "logs": logs
                }
            
            archive_size = os.path.getsize(archive_path)
            add_log(f"📦 Archive size: {(archive_size / 1024 / 1024):.2f} MB")
            add_log(f"📂 Extracting archive: {archive_file.name}")
            
            if archive_file.suffix == '.zip':
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    file_list = zip_ref.namelist()
                    zip_ref.extractall(extracted_path)
                    add_log(f"✅ Extracted {len(file_list)} files from ZIP archive")
            elif archive_file.suffix in ['.tar', '.gz'] or archive_file.name.endswith('.tar.gz'):
                with tarfile.open(archive_path, 'r:*') as tar_ref:
                    members = tar_ref.getmembers()
                    tar_ref.extractall(extracted_path)
                    add_log(f"✅ Extracted {len(members)} items from TAR archive")
            else:
                add_log(f"❌ Unsupported archive format: {archive_file.suffix}", "error")
                return {
                    "success": False,
                    "error": f"Unsupported archive format: {archive_file.suffix}",
                    "logs": logs
                }
            
            # Create tar archive of extracted files for docker cp
            tar_path = os.path.join(temp_dir, "deploy.tar")
            add_log("📦 Creating deployment archive...")
            # Filter macOS metadata that can break extraction inside container (AppleDouble / __MACOSX).
            def _tar_filter(tarinfo: tarfile.TarInfo) -> tarfile.TarInfo | None:
                name = (tarinfo.name or "").lstrip("./")
                base = os.path.basename(name)
                parts = name.split("/")
                if "__MACOSX" in parts:
                    return None
                if base == ".DS_Store" or base.startswith("._"):
                    return None
                return tarinfo
            # IMPORTANT:
            # Use arcname="." so extracted files land directly in target_path.
            # Using basename(target_path) would create /target/target/... (e.g. /dataz/dataz/...).
            with tarfile.open(tar_path, 'w') as tar:
                tar.add(extracted_path, arcname=".", filter=_tar_filter)
            tar_size = os.path.getsize(tar_path)
            add_log(f"✅ Created deployment archive: {(tar_size / 1024 / 1024):.2f} MB")
            
            # Copy to container using docker cp (via put_archive)
            add_log(f"📤 Copying files to container at {target_path}...")
            
            # Ensure target directory exists in container
            mkdir_result = container.exec_run(f"mkdir -p {target_path}")
            if mkdir_result.exit_code == 0:
                add_log(f"✅ Created target directory: {target_path}")
            else:
                add_log(f"⚠️  Warning: mkdir returned exit code {mkdir_result.exit_code}")
            
            # Use put_archive to copy files
            with open(tar_path, 'rb') as tar_file:
                container.put_archive(path=target_path, data=tar_file.read())
            add_log("✅ Files copied to container")
            
            # Get file count for reporting
            result = container.exec_run(f"sh -c 'find {target_path} -type f | wc -l'")
            try:
                file_count = int(result.output.decode('utf-8').strip()) if result.output else 0
            except (ValueError, AttributeError):
                file_count = 0
            add_log(f"📊 Found {file_count} files in target directory")
            
            # Verify deployment
            verify_result = container.exec_run(f"sh -c 'ls -la {target_path} | head -10'")
            if verify_result.exit_code == 0:
                add_log("✅ Deployment verification successful")
            
            add_log(f"🎉 Successfully deployed {file_count} files to {target_path}")
            
            # Check for docker-compose.yml and automatically run docker-compose up -d
            add_log("")
            add_log("🔍 Searching for docker-compose.yml (recursive search)...")
            
            # Search recursively for docker-compose.yml or docker-compose.yaml
            compose_search = container.exec_run(
                f"sh -c 'find {target_path} -type f \\( -name \"docker-compose.yml\" -o -name \"docker-compose.yaml\" \\) | head -1'",
                user="root"
            )
            
            compose_file = None
            compose_dir = target_path
            docker_compose_output = ""
            
            if compose_search.exit_code == 0 and compose_search.output:
                found_path = compose_search.output.decode('utf-8', errors='replace').strip()
                if found_path:
                    # Extract directory and filename
                    path_obj = Path(found_path)
                    compose_dir = str(path_obj.parent)
                    compose_file = path_obj.name
                    add_log(f"✅ Found {compose_file} at: {found_path}")
                    add_log(f"📁 Using directory: {compose_dir}")
                else:
                    add_log("ℹ️  No docker-compose.yml found in any subdirectory")
            else:
                add_log("ℹ️  No docker-compose.yml found in any subdirectory")
            
            if compose_file:
                add_log(f"✅ Found {compose_file} - automatically starting services...")
                add_log("")
                
                # Run docker-compose up -d
                # Use the directory where docker-compose.yml was found
                full_command = f"cd {compose_dir} && (docker compose -f {compose_file} up -d || docker-compose -f {compose_file} up -d)"
                add_log(f"📝 Running: {full_command}")
                
                result = container.exec_run(
                    f"sh -c '{full_command}'",
                    user="root",
                    workdir=compose_dir
                )
                
                docker_compose_output = result.output.decode('utf-8', errors='replace') if result.output else ""
                
                if result.exit_code == 0:
                    add_log("✅ Docker Compose services started successfully")
                    # Add output to logs
                    if docker_compose_output:
                        for line in docker_compose_output.split('\n'):
                            if line.strip():
                                add_log(line.strip())
                else:
                    add_log(f"⚠️  Docker Compose command completed with exit code {result.exit_code}")
                    if docker_compose_output:
                        for line in docker_compose_output.split('\n'):
                            if line.strip():
                                add_log(line.strip(), "error")
            else:
                add_log("ℹ️  No docker-compose.yml found - skipping automatic startup")
            
            return {
                "success": True,
                "target_path": target_path,
                "files_deployed": file_count,
                "archive_size": archive_size,
                "docker_compose_run": compose_file is not None,
                "docker_compose_output": docker_compose_output if compose_file else None,
                "logs": logs
            }
            
        except Exception as e:
            error_msg = str(e)
            add_log(f"❌ Deployment failed: {error_msg}", "error")
            logger.error(f"Failed to deploy files to container {container_id}: {e}", exc_info=True)
            return {
                "success": False,
                "error": error_msg,
                "logs": logs
            }
        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    if logs:
                        logs.append(f"🧹 Cleaned up temporary directory")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory: {e}")
    
    def deploy_files_to_container_stream(
        self,
        container_id: str,
        archive_path: str,
        target_path: str = "/data",
        extract: bool = True
    ) -> Iterator[str]:
        """
        Deploy files to container with streaming logs.
        
        Yields log messages as they occur during deployment.
        
        Args:
            container_id: Docker container ID
            archive_path: Path to archive file (zip, tar, tar.gz) on host
            target_path: Target directory in container (default: /data)
            extract: Whether to extract archive or copy as-is
        
        Yields:
            Log messages as strings
        """
        if not self.docker_available:
            # Use a deploy-specific error event so the client can handle it deterministically.
            yield "event: deploy_error\ndata: " + json.dumps({"error": "Docker not available"}) + "\n\n"
            return
        
        temp_dir = None
        
        # Get VPS container to access IP and port info for service URLs
        try:
            vps_container = self.client.containers.get(container_id)
            vps_ip = None
            vps_ssh_port = None
            try:
                # Try to get IP from container networks
                networks = vps_container.attrs.get("NetworkSettings", {}).get("Networks", {})
                if networks:
                    # Get first network's IP
                    first_net = next(iter(networks.values()))
                    vps_ip = first_net.get("IPAddress")
                # Get SSH port mapping
                port_bindings = vps_container.attrs.get("NetworkSettings", {}).get("Ports", {})
                if "22/tcp" in port_bindings and port_bindings["22/tcp"]:
                    vps_ssh_port = port_bindings["22/tcp"][0].get("HostPort")
            except Exception:
                pass
        except Exception:
            vps_container = None
            vps_ip = None
            vps_ssh_port = None
        
        def log(message: str, level: str = "info"):
            """Yield a log message with timestamp."""
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{timestamp}] {message}"
            # IMPORTANT: Do not emit generic SSE "error" events for log lines.
            # The frontend treats event=error as fatal and will stop reading the stream,
            # which hides the underlying failure output.
            if level == "error":
                logger.error(log_entry)
            else:
                logger.info(log_entry)
            yield f"data: {log_entry}\n\n"
        
        try:
            yield from log("🚀 Starting deployment process...")
            container = self.client.containers.get(container_id)
            deploy_debug = settings.DEBUG or os.getenv("DEPLOY_DEBUG_LOGS", "false").lower() in ("1", "true", "yes", "on", "1")
            engine_mode = (getattr(settings, "VPS_DOCKER_ENGINE_MODE", None) or os.getenv("VPS_DOCKER_ENGINE_MODE", "auto")).strip().lower()
            if engine_mode not in ("auto", "proxy", "dind"):
                engine_mode = "auto"
            if deploy_debug:
                yield from log(f"🧩 VPS_DOCKER_ENGINE_MODE={engine_mode}")
            
            # Create temporary directory for extraction
            temp_dir = tempfile.mkdtemp(prefix="vps_deploy_")
            extracted_path = os.path.join(temp_dir, "extracted")
            os.makedirs(extracted_path, exist_ok=True)
            yield from log(f"📁 Created temporary directory: {temp_dir}")
            
            # Extract archive
            archive_file = Path(archive_path)
            if not archive_file.exists():
                yield from log(f"❌ Archive not found: {archive_path}", "error")
                yield "event: deploy_error\ndata: " + json.dumps({"error": f"Archive not found: {archive_path}"}) + "\n\n"
                return
            
            archive_size = os.path.getsize(archive_path)
            yield from log(f"📦 Archive size: {(archive_size / 1024 / 1024):.2f} MB")
            yield from log(f"📂 Extracting archive: {archive_file.name}")
            
            if archive_file.suffix == '.zip':
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    file_list = zip_ref.namelist()
                    zip_ref.extractall(extracted_path)
                    yield from log(f"✅ Extracted {len(file_list)} files from ZIP archive")
            elif archive_file.suffix in ['.tar', '.gz'] or archive_file.name.endswith('.tar.gz'):
                with tarfile.open(archive_path, 'r:*') as tar_ref:
                    members = tar_ref.getmembers()
                    tar_ref.extractall(extracted_path)
                    yield from log(f"✅ Extracted {len(members)} items from TAR archive")
            else:
                yield from log(f"❌ Unsupported archive format: {archive_file.suffix}", "error")
                yield "event: deploy_error\ndata: " + json.dumps({"error": f"Unsupported archive format: {archive_file.suffix}"}) + "\n\n"
                return
            
            # Create tar archive of extracted files for docker cp
            tar_path = os.path.join(temp_dir, "deploy.tar")
            yield from log("📦 Creating deployment archive...")
            # Filter macOS metadata that can break extraction inside container (AppleDouble / __MACOSX).
            def _tar_filter(tarinfo: tarfile.TarInfo) -> tarfile.TarInfo | None:
                name = (tarinfo.name or "").lstrip("./")
                base = os.path.basename(name)
                parts = name.split("/")
                if "__MACOSX" in parts:
                    return None
                if base == ".DS_Store" or base.startswith("._"):
                    return None
                return tarinfo
            # IMPORTANT:
            # Use arcname="." so extracted files land directly in target_path.
            # Using basename(target_path) would create /target/target/... (e.g. /dataz/dataz/...).
            with tarfile.open(tar_path, 'w') as tar:
                tar.add(extracted_path, arcname=".", filter=_tar_filter)
            tar_size = os.path.getsize(tar_path)
            yield from log(f"✅ Created deployment archive: {(tar_size / 1024 / 1024):.2f} MB")
            
            # Copy to container using docker cp (via put_archive)
            yield from log(f"📤 Copying files to container at {target_path}...")
            
            # Ensure target directory exists in container
            mkdir_result = container.exec_run(f"mkdir -p {target_path}")
            if mkdir_result.exit_code == 0:
                yield from log(f"✅ Created target directory: {target_path}")
            else:
                yield from log(f"⚠️  Warning: mkdir returned exit code {mkdir_result.exit_code}")
            
            # Use put_archive to copy files
            with open(tar_path, 'rb') as tar_file:
                container.put_archive(path=target_path, data=tar_file.read())
            yield from log("✅ Files copied to container")
            
            # Get file count for reporting
            result = container.exec_run(f"sh -c 'find {target_path} -type f | wc -l'")
            try:
                file_count = int(result.output.decode('utf-8').strip()) if result.output else 0
            except (ValueError, AttributeError):
                file_count = 0
            yield from log(f"📊 Found {file_count} files in target directory")
            
            # Verify deployment
            verify_result = container.exec_run(f"sh -c 'ls -la {target_path} | head -10'")
            if verify_result.exit_code == 0:
                yield from log("✅ Deployment verification successful")
            
            yield from log(f"🎉 Successfully deployed {file_count} files to {target_path}")
            
            # Check for docker-compose.yml and automatically run docker-compose up -d
            yield from log("")
            yield from log("🔍 Searching for docker-compose.yml (recursive search)...")
            
            # Search recursively for docker-compose.yml or docker-compose.yaml
            # Find the first occurrence and use its directory
            compose_search = container.exec_run(
                f"sh -c 'find {target_path} -type f \\( -name \"docker-compose.yml\" -o -name \"docker-compose.yaml\" \\) | head -1'",
                user="root"
            )
            
            compose_file = None
            compose_dir = target_path
            
            if compose_search.exit_code == 0 and compose_search.output:
                found_path = compose_search.output.decode('utf-8', errors='replace').strip()
                if found_path:
                    # Extract directory and filename
                    path_obj = Path(found_path)
                    compose_dir = str(path_obj.parent)
                    compose_file = path_obj.name
                    yield from log(f"✅ Found {compose_file} at: {found_path}")
                    yield from log(f"📁 Using directory: {compose_dir}")
                else:
                    yield from log("ℹ️  No docker-compose.yml found in any subdirectory")
            else:
                yield from log("ℹ️  No docker-compose.yml found in any subdirectory")
            
            if compose_file:
                yield from log(f"✅ Found {compose_file} - automatically starting services...")
                yield from log("")
                use_proxy = False
                proxy_host = None

                # Best-effort: normalize permissions for common entrypoint scripts in the deployed project.
                # Archives (especially ZIP) often lose executable bits, and docker-compose bind mounts can
                # override image layers that previously `chmod +x`'d the script. This causes:
                #   exec: "/app/entrypoint.sh": permission denied
                yield from log("🛠 Normalizing script permissions (chmod +x) in deployed project...")
                try:
                    normalize_cmd = (
                        "sh -c 'set +e; "
                        f"cd {compose_dir} 2>/dev/null || exit 0; "
                        # Emit a short note if the compose file appears to bind-mount into /app.
                        f"if grep -Eq \":/app(/|\\s|$)\" {compose_file} 2>/dev/null; then "
                        "  echo \"ℹ️  Note: compose appears to mount a volume into /app; executable bits may come from uploaded files.\"; "
                        "fi; "
                        # chmod +x for entrypoint.sh and *.sh up to a reasonable depth
                        "find . -maxdepth 6 -type f \\( -name \"entrypoint.sh\" -o -name \"*.sh\" \\) -print0 2>/dev/null "
                        "| xargs -0 -r sh -c '"
                        "for f in \"$@\"; do "
                        "  chmod +x \"$f\" 2>/dev/null || true; "
                        "  sed -i \"s/\\r$//\" \"$f\" 2>/dev/null || true; "
                        "done' _; "
                        "true'"
                    )
                    norm_res = container.exec_run(normalize_cmd, user="root", workdir=compose_dir)
                    if norm_res.output:
                        out = norm_res.output.decode("utf-8", errors="replace").strip()
                        if out:
                            for line in out.splitlines()[-5:]:
                                if line.strip():
                                    yield f"data: {line}\n\n"
                except Exception:
                    pass

                # IMPORTANT:
                # Ensure the Docker CLI exists BEFORE any proxy reachability checks.
                # Otherwise `docker version` fails with "docker: not found", and we incorrectly fall back to DinD.
                yield from log("🔍 Ensuring Docker CLI is available in VPS...")
                docker_cli_check = container.exec_run(
                    "sh -c 'command -v docker >/dev/null 2>&1'",
                    user="root",
                )
                if docker_cli_check.exit_code != 0:
                    yield from log("⚙️ Installing Docker CLI inside VPS (required for docker compose)...")
                    install_cmd = (
                        "sh -c 'set -e; "
                        # wait for dpkg/apt locks (SSH install / other tasks may be running)
                        "for i in $(seq 1 90); do "
                        "  if pgrep -x apt-get >/dev/null 2>&1 || pgrep -x dpkg >/dev/null 2>&1 || "
                        "     lsof /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then "
                        "    sleep 2; "
                        "  else "
                        "    break; "
                        "  fi; "
                        "done; "
                        "export DEBIAN_FRONTEND=noninteractive; "
                        "apt-get update -qq; "
                        # Prefer compose plugin; fallback to docker-compose package.
                        "apt-get install -y -qq docker.io docker-compose-plugin || apt-get install -y -qq docker.io docker-compose; "
                        "docker --version; "
                        "(docker compose version || docker-compose --version) 2>/dev/null || true"
                        "'"
                    )
                    install_res = container.exec_run(install_cmd, user="root")
                    if install_res.exit_code != 0:
                        out = install_res.output.decode("utf-8", errors="replace") if install_res.output else ""
                        yield from log(f"❌ Failed to install Docker CLI: {out[-500:]}", level="error")
                        yield "event: deploy_error\ndata: " + json.dumps({"error": "Failed to install Docker CLI in VPS. Try again once apt/dpkg locks clear."}) + "\n\n"
                        return

                # Engine selection note:
                # - In dind mode we must NOT even probe docker-socket-proxy because that makes builds happen on the host.
                # - In auto/proxy mode we prefer proxy and fall back to DinD if unreachable.
                if engine_mode == "dind":
                    yield from log("🔧 VPS_DOCKER_ENGINE_MODE=dind: skipping docker-socket-proxy checks; using DinD inside VPS")
                else:
                    # Prefer using host Docker via docker-socket-proxy (avoids Docker-in-Docker cgroup/overlay issues).
                    # Fallback to DinD only if proxy is unreachable.
                    yield from log("🔍 Checking Docker access via docker-socket-proxy...")

                    # Ensure VPS container is connected to cloudmanager-network (so it can reach the proxy).
                    # If already connected without aliases, disconnect/reconnect to enforce aliases.
                    shared_net = None
                    shared_net_name = None
                    proxy_container = None
                    proxy_networks: dict = {}
                    proxy_ip = None

                    # Discover proxy container + its networks (also used for IP probing and diagnostics)
                    try:
                        try:
                            proxy_container = self.client.containers.get("cloudmanager-docker-proxy")
                        except Exception:
                            proxy_container = self.client.containers.get("docker-socket-proxy")
                        proxy_networks = proxy_container.attrs.get("NetworkSettings", {}).get("Networks", {}) or {}
                    except Exception:
                        proxy_container = None
                        proxy_networks = {}

                    # Determine the real shared network name.
                    # - Prefer exact "cloudmanager-network"
                    # - Else prefer compose-prefixed network ending with "cloudmanager-network"
                    # - Else fall back to any network containing "cloudmanager"
                    try:
                        try:
                            shared_net = self.client.networks.get("cloudmanager-network")
                            shared_net_name = "cloudmanager-network"
                        except Exception:
                            shared_net = None

                        if not shared_net and proxy_networks:
                            candidates = list(proxy_networks.keys())
                            preferred = next((n for n in candidates if n.endswith("cloudmanager-network")), None)
                            if not preferred:
                                preferred = next((n for n in candidates if "cloudmanager" in n), None)
                            shared_net_name = preferred or candidates[0]
                            try:
                                shared_net = self.client.networks.get(shared_net_name)
                            except Exception:
                                shared_net = None
                    except Exception:
                        shared_net = None
                        shared_net_name = None

                    # Resolve proxy IP on that same shared network, if possible.
                    if proxy_networks:
                        if shared_net_name and shared_net_name in proxy_networks:
                            proxy_ip = (proxy_networks.get(shared_net_name) or {}).get("IPAddress")
                        else:
                            # fallback to any attached network ip
                            try:
                                proxy_ip = next(iter(proxy_networks.values())).get("IPAddress")
                            except Exception:
                                proxy_ip = None

                    if shared_net and shared_net_name:
                        try:
                            # Refresh attrs: Docker SDK does not always keep NetworkSettings up to date.
                            try:
                                container.reload()
                            except Exception:
                                pass
                            networks = container.attrs.get("NetworkSettings", {}).get("Networks", {})
                            existing = networks.get(shared_net_name)
                            existing_aliases = set((existing or {}).get("Aliases") or [])
                            desired_aliases = {"docker-socket-proxy", "cloudmanager-docker-proxy"}
                            if existing and not (desired_aliases & existing_aliases):
                                try:
                                    shared_net.disconnect(container, force=True)
                                except Exception:
                                    pass
                            shared_net.connect(
                                container,
                                aliases=list(desired_aliases),
                            )
                            try:
                                container.reload()
                            except Exception:
                                pass
                        except Exception as e:
                            # If it's already connected, Docker may refuse a second connect with:
                            # 403 Forbidden (... endpoint with name ... already exists in network ...)
                            # Treat that as success (the VPS is already on the shared network).
                            msg = str(e)
                            if "already exists in network" in msg:
                                if deploy_debug:
                                    yield from log(f"ℹ️  VPS already connected to '{shared_net_name}' (endpoint exists); continuing")
                            else:
                                # already connected / cannot connect - continue probing
                                yield from log(f"ℹ️  Could not (re)connect VPS to shared network '{shared_net_name}': {e}")
                    else:
                        # No shared network found; proxy cannot be reachable via DNS.
                        if proxy_networks:
                            yield from log(
                                "ℹ️  Proxy container networks: " + ", ".join(sorted(proxy_networks.keys()))
                            )
                        else:
                            yield from log("ℹ️  Proxy container not found or has no networks; cannot attach VPS for proxy access")

                    if deploy_debug:
                        try:
                            proxy_name = getattr(proxy_container, "name", None) or "<unknown>"
                        except Exception:
                            proxy_name = "<unknown>"
                        yield from log(f"🧩 Proxy container: {proxy_name}")
                        yield from log(f"🧩 Shared network resolved: {shared_net_name or '<none>'}")
                        yield from log(f"🧩 Proxy IP resolved: {proxy_ip or '<none>'}")

                    if deploy_debug:
                        try:
                            networks_now = container.attrs.get("NetworkSettings", {}).get("Networks", {}) or {}
                            net_lines = []
                            for net_name, net_cfg in networks_now.items():
                                ip = (net_cfg or {}).get("IPAddress")
                                aliases = (net_cfg or {}).get("Aliases") or []
                                net_lines.append(f"{net_name}: ip={ip} aliases={aliases}")
                            if net_lines:
                                yield from log("🧩 VPS networks: " + " | ".join(net_lines))
                        except Exception as e:
                            yield from log(f"🧩 VPS networks: <failed to read: {e}>")

                        # DNS hints
                        try:
                            dns_hint = container.exec_run("sh -c 'echo ---/etc/resolv.conf---; cat /etc/resolv.conf 2>/dev/null || true; echo ---/etc/hosts---; tail -n 20 /etc/hosts 2>/dev/null || true'", user="root")
                            out = dns_hint.output.decode("utf-8", errors="replace") if dns_hint.output else ""
                            if out.strip():
                                for line in out.strip().split("\n")[-30:]:
                                    yield f"data: {line}\n\n"
                        except Exception:
                            pass

                    # Try IP-based proxy host as well (avoids DNS issues)
                    # (proxy_container/proxy_ip already resolved above)

                    # Prefer IP first (most reliable), then names.
                    proxy_candidates: list[str] = []
                    if proxy_ip:
                        proxy_candidates.append(f"tcp://{proxy_ip}:2375")
                    proxy_candidates.extend([
                        "tcp://cloudmanager-docker-proxy:2375",
                        "tcp://docker-socket-proxy:2375",
                    ])

                    for candidate in proxy_candidates:
                        # IMPORTANT:
                        # Don't use a pipeline (`| head`) without preserving the exit code — it can mask failures.
                        # We run docker version twice: once to capture exit code, once to show a short diagnostic.
                        check = container.exec_run(
                            "sh -c '"
                            f"DOCKER_HOST={candidate} docker version >/dev/null 2>&1; "
                            "ec=$?; "
                            f"DOCKER_HOST={candidate} docker version 2>&1 | head -5; "
                            "exit $ec"
                            "'",
                            user="root",
                        )
                        if check.exit_code == 0:
                            use_proxy = True
                            proxy_host = candidate
                            break

                        try:
                            msg = check.output.decode("utf-8", errors="replace").strip()
                        except Exception:
                            msg = ""
                        if msg:
                            yield from log(f"ℹ️  Proxy check failed for {candidate}: {msg}")
                        if deploy_debug:
                            # Provide more actionable diagnostics: DNS resolution + TCP connect to 2375 (if possible)
                            host_for_dns = candidate.replace("tcp://", "").split(":")[0]
                            try:
                                dns_check = container.exec_run(
                                    "sh -c '"
                                    f"echo \"resolving {host_for_dns}\"; "
                                    f"(getent hosts {host_for_dns} 2>/dev/null || echo \"getent not available or no record\"); "
                                    "true"
                                    "'",
                                    user="root",
                                )
                                out = dns_check.output.decode("utf-8", errors="replace") if dns_check.output else ""
                                for line in out.strip().split("\n")[-5:]:
                                    if line.strip():
                                        yield f"data: {line}\n\n"
                            except Exception:
                                pass

                            # Try a quick TCP connect (bash /dev/tcp). Not all images have bash; ignore failures.
                            try:
                                tcp_check = container.exec_run(
                                    "sh -c '"
                                    f"(command -v bash >/dev/null 2>&1 && bash -lc \"cat < /dev/null > /dev/tcp/{host_for_dns}/2375\" && echo \"tcp:2375 OK\" ) "
                                    "|| echo \"tcp:2375 CHECK_SKIPPED_OR_FAILED\""
                                    "'",
                                    user="root",
                                )
                                out = tcp_check.output.decode("utf-8", errors="replace") if tcp_check.output else ""
                                for line in out.strip().split("\n")[-3:]:
                                    if line.strip():
                                        yield f"data: {line}\n\n"
                            except Exception:
                                pass

                    if use_proxy and proxy_host:
                        yield from log(f"✅ Using host Docker via {proxy_host}")
                    else:
                        if engine_mode == "proxy":
                            yield from log("❌ VPS_DOCKER_ENGINE_MODE=proxy but docker-socket-proxy is not reachable", level="error")
                            yield "event: deploy_error\ndata: " + json.dumps({"error": "Host Docker proxy required but not reachable from VPS"}) + "\n\n"
                            return

                        # Safety guard:
                        # Falling back to DinD only works if the VPS container was CREATED to support DinD
                        # (privileged + writable cgroups). A normal unprivileged container will have
                        # /sys/fs/cgroup mounted read-only, and nested docker build/run will fail with:
                        #   mkdir /sys/fs/cgroup/docker: read-only file system
                        try:
                            container.reload()
                        except Exception:
                            pass
                        is_privileged = bool((container.attrs.get("HostConfig", {}) or {}).get("Privileged"))
                        if not is_privileged:
                            yield from log(
                                "❌ Cannot fall back to Docker-in-Docker: this VPS was not created with DinD privileges "
                                "(container is not privileged; cgroups are typically read-only).",
                                level="error",
                            )
                            yield from log(
                                "💡 Fix: either restore docker-socket-proxy connectivity (recommended), "
                                "or recreate the VPS with VPS_DOCKER_ENGINE_MODE=dind so it is created privileged with writable cgroups.",
                                level="error",
                            )
                            yield "event: deploy_error\ndata: " + json.dumps({
                                "error": "Proxy unreachable and DinD fallback is not possible for this VPS (not DinD-capable). Recreate with VPS_DOCKER_ENGINE_MODE=dind or fix proxy."
                            }) + "\n\n"
                            return

                        yield from log("⚠️  docker-socket-proxy not reachable from VPS; falling back to Docker-in-Docker", level="error")
                        yield from log("🔍 Checking Docker daemon status...")
                        if not self._ensure_docker_daemon_running(container):
                            yield from log("❌ Docker daemon is not running and could not be started", level="error")
                            # Include a short dockerd log tail for actionable debugging.
                            try:
                                err_log = container.exec_run(
                                    "sh -c 'tail -80 /var/log/dockerd.log 2>/dev/null || echo no_dockerd_logs'",
                                    user="root",
                                )
                                err_out = err_log.output.decode("utf-8", errors="replace") if err_log.output else ""
                                if err_out.strip():
                                    yield from log("📄 dockerd.log (tail):")
                                    for line in err_out.strip().split("\n")[-80:]:
                                        if line.strip():
                                            yield f"data: {line}\n\n"
                            except Exception:
                                pass
                            yield from log("💡 Please install Docker or start the daemon manually")
                            # terminal failure
                            yield "event: deploy_error\ndata: " + json.dumps({"error": "Docker not available inside VPS (proxy unreachable and DinD failed)"}) + "\n\n"
                            return
                        yield from log("✅ Docker daemon is running")
                        # Double-check connectivity (pgrep can lie; docker compose needs the socket).
                        ready_check = container.exec_run(
                            "sh -c 'DOCKER_HOST=unix:///var/run/docker.sock docker info >/dev/null 2>&1'",
                            user="root",
                        )
                        if ready_check.exit_code != 0:
                            yield from log("⚠️  Docker daemon process exists but socket is not ready; restarting dockerd...", level="error")
                            if not self._ensure_docker_daemon_running(container):
                                yield from log("❌ Docker daemon is still not reachable after restart", level="error")
                                try:
                                    err_log = container.exec_run(
                                        "sh -c 'tail -80 /var/log/dockerd.log 2>/dev/null || echo no_dockerd_logs'",
                                        user="root",
                                    )
                                    err_out = err_log.output.decode("utf-8", errors="replace") if err_log.output else ""
                                    if err_out.strip():
                                        yield from log("📄 dockerd.log (tail):")
                                        for line in err_out.strip().split("\n")[-80:]:
                                            if line.strip():
                                                yield f"data: {line}\n\n"
                                except Exception:
                                    pass
                                yield "event: deploy_error\ndata: " + json.dumps({"error": "Docker daemon is not reachable inside VPS (DinD failed)"}) + "\n\n"
                                return

                yield from log("")

                # If forced DinD, ensure we run against local dockerd (inside the VPS) even if proxy is reachable.
                if engine_mode == "dind":
                    # Hard requirement: DinD needs a DinD-capable VPS container.
                    try:
                        container.reload()
                    except Exception:
                        pass
                    is_privileged = bool((container.attrs.get("HostConfig", {}) or {}).get("Privileged"))
                    if not is_privileged:
                        yield from log(
                            "❌ VPS_DOCKER_ENGINE_MODE=dind but this VPS container is not privileged. DinD cannot work with read-only cgroups.",
                            level="error",
                        )
                        yield from log(
                            "💡 Recreate the VPS after setting VPS_DOCKER_ENGINE_MODE=dind on the CloudManager host.",
                            level="error",
                        )
                        yield "event: deploy_error\ndata: " + json.dumps({
                            "error": "DinD requested but VPS is not DinD-capable (not privileged). Recreate VPS with VPS_DOCKER_ENGINE_MODE=dind."
                        }) + "\n\n"
                        return

                    if use_proxy:
                        yield from log("🔧 VPS_DOCKER_ENGINE_MODE=dind: ignoring host Docker proxy; using DinD inside VPS")
                    use_proxy = False
                    proxy_host = None
                    yield from log("🔍 Ensuring Docker daemon is running inside VPS (DinD)...")
                    if not self._ensure_docker_daemon_running(container):
                        yield from log("❌ Docker daemon is not running inside VPS and could not be started", level="error")
                        # Surface dockerd logs + quick diagnostics (this is the key missing piece).
                        try:
                            diag = container.exec_run(
                                "sh -c '"
                                "echo ---dockerd.log---; tail -120 /var/log/dockerd.log 2>/dev/null || echo no_dockerd_log; "
                                "echo ---ps dockerd---; (ps aux 2>/dev/null | grep -E \"[d]ockerd\" || true); "
                                "echo ---docker.sock---; ls -la /var/run/docker.sock 2>/dev/null || echo no_sock; "
                                "echo ---cgroup---; (mount | grep cgroup || true); "
                                "echo ---cgroupfs---; (ls -la /sys/fs/cgroup 2>/dev/null | head -50 || true); "
                                "echo ---iptables---; (command -v iptables >/dev/null 2>&1 && iptables -L -n 2>/dev/null | head -30 || echo no_iptables_or_denied); "
                                "true'"
                                ,
                                user="root",
                            )
                            diag_out = diag.output.decode("utf-8", errors="replace") if diag.output else ""
                            if diag_out.strip():
                                yield from log("📄 DinD diagnostics (tail):")
                                for line in diag_out.strip().split("\n")[-160:]:
                                    if line.strip():
                                        yield f"data: {line}\n\n"
                        except Exception:
                            pass
                        yield "event: deploy_error\ndata: " + json.dumps({"error": "Docker-in-Docker daemon not available inside VPS"}) + "\n\n"
                        return
                    yield from log("✅ Docker daemon is ready inside VPS")

                # Run docker-compose up -d and capture the *real* failure output.
                # Use the directory where docker-compose.yml was found
                full_command = f"cd {compose_dir} && (docker compose -f {compose_file} up -d || docker-compose -f {compose_file} up -d)"

                yield from log(f"📝 Running: {full_command}")
                yield from log("")

                yield from log("🔧 Executing docker-compose from inside VPS container")
                if use_proxy:
                    yield from log(f"📦 Docker engine is host Docker via {proxy_host}")
                else:
                    yield from log("📦 Docker engine is Docker-in-Docker (/var/run/docker.sock)")

                # Write full compose output to a file, then emit a tail so we always include
                # the actual failing lines (e.g. npm install failure), even if output is huge.
                compose_log_path = f"/tmp/cloudmanager_compose_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
                # Disable BuildKit by default to reduce cgroup-related failures in constrained envs.
                # IMPORTANT: export env vars so they apply to the whole shell session, not just `cd` (builtin).
                # Always override DOCKER_HOST so VPS env vars don't accidentally force host proxy when we want DinD.
                export_env = "export DOCKER_HOST=unix:///var/run/docker.sock DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0;"
                if use_proxy and proxy_host:
                    export_env = f"export DOCKER_HOST={proxy_host} DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0;"

                runner = (
                    "sh -c '"
                    f"{export_env} cd {compose_dir} && "
                    f"({full_command}) > {compose_log_path} 2>&1; "
                    "ec=$?; "
                    "echo __CM_EXIT_CODE__:$ec; "
                    f"tail -n 400 {compose_log_path} 2>/dev/null || true; "
                    "exit $ec"
                    "'"
                )
                result = container.exec_run(runner, user="root", workdir=compose_dir, stream=False)

                exit_code = result.exit_code
                output = result.output.decode('utf-8', errors='replace') if result.output else ""

                # If using host Docker via proxy and compose failed due to host-port conflicts,
                # auto-patch the compose file to use random available host ports (published=0 via "0:target")
                # and retry once.
                if use_proxy and exit_code != 0:
                    # Example: "Bind for 0.0.0.0:5432 failed: port is already allocated"
                    # Be permissive: Docker may include other host IPs, and line breaks can be messy.
                    conflict_ports = sorted(
                        set(
                            int(p)
                            for p in re.findall(
                                r"Bind for (?:[0-9]{1,3}\.){3}[0-9]{1,3}:(\d+) failed: port is already allocated",
                                output,
                            )
                        )
                    )
                    if conflict_ports:
                        yield from log(
                            "⚠️  Host port conflict detected (already in use on CloudManager host): "
                            + ", ".join(str(p) for p in conflict_ports),
                            level="error",
                        )
                        yield from log("🩹 Auto-patching docker-compose ports to use random host ports and retrying once...")

                        # Read original compose file from inside the VPS container.
                        compose_path = f"{compose_dir}/{compose_file}"
                        read_compose = container.exec_run(f"sh -c 'cat {compose_path} 2>/dev/null'", user="root")
                        compose_text = read_compose.output.decode("utf-8", errors="replace") if read_compose.output else ""

                        if compose_text.strip():
                            # Patch lines like: - "5432:5432" or - 5432:5432 to - "0:5432" / - 0:5432
                            # Also handle host IP form: - "0.0.0.0:5432:5432"
                            # Only for conflicting host ports; leave container port unchanged.
                            def _patch_line(line: str) -> str:
                                # 1) host:container[/proto]
                                m = re.match(r"^(\s*-\s*['\"]?)(\d+):(\d+)(.*)$", line)
                                if m:
                                    prefix, host_p, cont_p, rest = m.groups()
                                    try:
                                        hp = int(host_p)
                                    except Exception:
                                        return line
                                    if hp in conflict_ports:
                                        return f"{prefix}0:{cont_p}{rest}"
                                    return line

                                # 2) ip:host:container[/proto]
                                m = re.match(r"^(\s*-\s*['\"]?)(?:[0-9]{1,3}\.){3}[0-9]{1,3}:(\d+):(\d+)(.*)$", line)
                                if m:
                                    prefix, host_p, cont_p, rest = m.groups()
                                    try:
                                        hp = int(host_p)
                                    except Exception:
                                        return line
                                    if hp in conflict_ports:
                                        # Drop the host IP and let Docker pick a free port.
                                        return f"{prefix}0:{cont_p}{rest}"
                                    return line

                                return line

                            patched_lines = [_patch_line(ln) for ln in compose_text.splitlines()]
                            patched_text = "\n".join(patched_lines) + "\n"

                            patched_name = ".cloudmanager.compose.patched.yml"
                            patched_path = f"{compose_dir}/{patched_name}"

                            # Upload patched file via put_archive to avoid shell command length limits.
                            tar_bytes = io.BytesIO()
                            with tarfile.open(fileobj=tar_bytes, mode="w") as tf:
                                data = patched_text.encode("utf-8")
                                info = tarfile.TarInfo(name=patched_name)
                                info.size = len(data)
                                info.mtime = int(time.time())
                                tf.addfile(info, io.BytesIO(data))
                            tar_bytes.seek(0)
                            container.put_archive(path=compose_dir, data=tar_bytes.read())

                            yield from log(f"📝 Retrying with patched compose file: {patched_path}")

                            patched_command = f"cd {compose_dir} && (docker compose -f {patched_name} up -d || docker-compose -f {patched_name} up -d)"
                            patched_runner = (
                                "sh -c '"
                                f"{export_env} cd {compose_dir} && "
                                f"({patched_command}) > {compose_log_path} 2>&1; "
                                "ec=$?; "
                                "echo __CM_EXIT_CODE__:$ec; "
                                f"tail -n 400 {compose_log_path} 2>/dev/null || true; "
                                "exit $ec"
                                "'"
                            )
                            result_retry = container.exec_run(patched_runner, user="root", workdir=compose_dir, stream=False)
                            exit_code = result_retry.exit_code
                            output = result_retry.output.decode('utf-8', errors='replace') if result_retry.output else ""

                # If compose failed due to entrypoint permission denied, this is very commonly caused by bind-mounting
                # project sources over /app (e.g. `- ./backend:/app`). That bind mount overwrites the image layer where
                # Dockerfile did `chmod +x /app/entrypoint.sh`, so runc can't exec it.
                #
                # We already try to normalize permissions above, but some projects may still fail (CRLF, missing exec bit,
                # or different entrypoint path). As a last resort, retry once with /app bind mounts removed.
                if exit_code != 0:
                    out_l = (output or "").lower()
                    if ("permission denied" in out_l) and ("/app/entrypoint" in out_l or "entrypoint.sh" in out_l):
                        yield from log("")
                        yield from log(
                            "🩹 Detected entrypoint permission issue (likely due to bind-mount into /app). "
                            "Retrying once with /app bind mounts removed...",
                            level="error",
                        )
                        try:
                            compose_path = f"{compose_dir}/{compose_file}"
                            read_compose = container.exec_run(f"sh -c 'cat {compose_path} 2>/dev/null'", user="root")
                            compose_text = read_compose.output.decode("utf-8", errors="replace") if read_compose.output else ""
                        except Exception:
                            compose_text = ""

                        if compose_text.strip():
                            # Use YAML-based patching to safely remove /app bind mounts
                            # This preserves YAML structure and prevents corruption
                            patched_text = self._patch_compose_remove_app_binds(compose_text)
                            
                            # Log if patching failed or no changes were needed
                            if not patched_text:
                                if yaml is None:
                                    yield from log("⚠️  PyYAML not available, cannot patch compose file safely", level="error")
                                else:
                                    yield from log("⚠️  Failed to patch compose file or no /app bind mounts found", level="error")
                            
                            # Only retry if patching succeeded and actually changed something
                            if patched_text and patched_text != compose_text:
                                patched_name = ".cloudmanager.compose.noappbind.yml"
                                patched_path = f"{compose_dir}/{patched_name}"

                                tar_bytes = io.BytesIO()
                                with tarfile.open(fileobj=tar_bytes, mode="w") as tf:
                                    data = patched_text.encode("utf-8")
                                    info = tarfile.TarInfo(name=patched_name)
                                    info.size = len(data)
                                    info.mtime = int(time.time())
                                    tf.addfile(info, io.BytesIO(data))
                                tar_bytes.seek(0)
                                container.put_archive(path=compose_dir, data=tar_bytes.read())

                                yield from log(f"📝 Retrying with patched compose file (no /app bind mounts): {patched_path}")

                                patched_command = f"cd {compose_dir} && (docker compose -f {patched_name} up -d || docker-compose -f {patched_name} up -d)"
                                patched_runner = (
                                    "sh -c '"
                                    f"{export_env} cd {compose_dir} && "
                                    f"({patched_command}) > {compose_log_path} 2>&1; "
                                    "ec=$?; "
                                    "echo __CM_EXIT_CODE__:$ec; "
                                    f"tail -n 400 {compose_log_path} 2>/dev/null || true; "
                                    "exit $ec"
                                    "'"
                                )
                                result_retry = container.exec_run(patched_runner, user="root", workdir=compose_dir, stream=False)
                                exit_code = result_retry.exit_code
                                output = result_retry.output.decode('utf-8', errors='replace') if result_retry.output else ""

                # If DinD was selected and compose failed due to a dead socket, try one restart + retry.
                if (not use_proxy) and exit_code != 0 and ("Cannot connect to the Docker daemon" in output):
                    yield from log("")
                    yield from log("🔁 Docker Compose failed due to Docker socket connectivity; restarting dockerd and retrying once...", level="error")
                    if self._ensure_docker_daemon_running(container):
                        result_retry = container.exec_run(runner, user="root", workdir=compose_dir, stream=False)
                        exit_code = result_retry.exit_code
                        output = result_retry.output.decode('utf-8', errors='replace') if result_retry.output else ""
                    else:
                        yield from log("❌ Could not restart dockerd for retry", level="error")
                        try:
                            err_log = container.exec_run(
                                "sh -c 'tail -80 /var/log/dockerd.log 2>/dev/null || echo no_dockerd_logs'",
                                user="root",
                            )
                            err_out = err_log.output.decode("utf-8", errors="replace") if err_log.output else ""
                            if err_out.strip():
                                yield from log("📄 dockerd.log (tail):")
                                for line in err_out.strip().split("\n")[-80:]:
                                    if line.strip():
                                        yield f"data: {line}\n\n"
                        except Exception:
                            pass

                if output.strip():
                    yield from log("📤 Docker Compose (tail) output:")
                    for line in output.split('\n'):
                        if line.strip():
                            yield f"data: {line}\n\n"
                else:
                    yield from log("ℹ️  Docker Compose produced no output (unexpected).")

                # Check exit code
                yield from log("")
                if exit_code == 0:
                    yield from log(f"✅ Docker Compose completed successfully (exit code: {exit_code})")
                else:
                    yield from log(f"⚠️  Docker Compose completed with exit code: {exit_code}", level="error")

                # Verify the command succeeded by checking containers
                yield from log("")
                yield from log("🔍 Verifying container creation...")

                # Check if docker-compose created any containers from this compose file
                # Use docker-compose ps to check services defined in the compose file
                ps_prefix = f"DOCKER_HOST={proxy_host} " if (use_proxy and proxy_host) else ""
                ps_compose_result = container.exec_run(
                    f"sh -c 'cd {compose_dir} && ({ps_prefix}docker compose -f {compose_file} ps -a --format json 2>/dev/null || {ps_prefix}docker-compose -f {compose_file} ps --quiet 2>/dev/null)'",
                    user="root",
                    workdir=compose_dir
                )

                if ps_compose_result.exit_code == 0 and ps_compose_result.output:
                    compose_containers = ps_compose_result.output.decode('utf-8', errors='replace').strip()
                    if compose_containers:
                        yield from log(f"✅ Docker Compose services are defined")

                        # Get detailed status of these containers
                        status_result = container.exec_run(
                            f"sh -c 'cd {compose_dir} && ({ps_prefix}docker compose -f {compose_file} ps 2>/dev/null || {ps_prefix}docker-compose -f {compose_file} ps)'",
                            user="root",
                            workdir=compose_dir
                        )

                        if status_result.exit_code == 0 and status_result.output:
                            status_output = status_result.output.decode('utf-8', errors='replace').strip()
                            if status_output:
                                yield from log("📊 Container status from compose file:")
                                for line in status_output.split('\n'):
                                    if line.strip():
                                        yield f"data: {line}\n\n"

                                # Check if any are actually running
                                if 'Up' in status_output or 'running' in status_output.lower():
                                    yield from log("✅ Some services are running")
                                else:
                                    yield from log("⚠️  Services were created but may not be running yet")
                                    yield from log("💡 Check logs with: docker-compose logs")
                            else:
                                yield from log("⚠️  Could not get container status")
                    else:
                        yield from log("⚠️  No containers found for this compose file")
                        yield from log("💡 This might be normal if docker-compose.yml has no services defined")
                else:
                    # Fallback: check all docker containers
                    yield from log("ℹ️  Checking all Docker containers in VPS...")
                    ps_all_result = container.exec_run(
                        f"sh -c '{ps_prefix}docker ps -a --format \"table {{{{.Names}}}}\\t{{{{.Status}}}}\\t{{{{.Image}}}}\" 2>/dev/null | head -20'",
                        user="root"
                    )

                    if ps_all_result.exit_code == 0 and ps_all_result.output:
                        all_containers = ps_all_result.output.decode('utf-8', errors='replace').strip()
                        if all_containers:
                            yield from log("📊 All Docker containers in VPS:")
                            for line in all_containers.split('\n'):
                                if line.strip():
                                    yield f"data: {line}\n\n"
                        else:
                            yield from log("ℹ️  No Docker containers found in VPS")
                    else:
                        yield from log("⚠️  Could not list Docker containers (Docker daemon may not be accessible)")

                yield from log("")
                if exit_code == 0:
                    yield from log("✅ Docker Compose deployment completed successfully")
                    
                    # Extract service routes/URLs for successful deployments
                    service_routes = []
                    if compose_file and exit_code == 0:
                        try:
                            # Get service ports from docker compose ps
                            routes_result = container.exec_run(
                                f"sh -c 'cd {compose_dir} && ({ps_prefix}docker compose -f {compose_file} ps --format json 2>/dev/null || {ps_prefix}docker-compose -f {compose_file} ps --format json 2>/dev/null || echo \"[]\")'",
                                user="root",
                                workdir=compose_dir
                            )
                            
                            if routes_result.exit_code == 0 and routes_result.output:
                                try:
                                    routes_json = routes_result.output.decode('utf-8', errors='replace').strip()
                                    # Handle both single JSON object and array
                                    if routes_json.startswith('['):
                                        services_data = json.loads(routes_json)
                                    elif routes_json.startswith('{'):
                                        services_data = [json.loads(routes_json)]
                                    else:
                                        services_data = []
                                    
                                    # Also get port mappings from docker ps inside VPS
                                    ports_result = container.exec_run(
                                        f"sh -c '{ps_prefix}docker ps --format \"{{{{.Names}}}}\\t{{{{.Ports}}}}\" 2>/dev/null'",
                                        user="root"
                                    )
                                    
                                    ports_map = {}
                                    if ports_result.exit_code == 0 and ports_result.output:
                                        ports_output = ports_result.output.decode('utf-8', errors='replace').strip()
                                        for line in ports_output.split('\n'):
                                            if '\t' in line:
                                                name, ports_str = line.split('\t', 1)
                                                ports_map[name] = ports_str
                                    
                                    # Build service routes
                                    for service in services_data:
                                        service_name = service.get('Service', service.get('Name', ''))
                                        service_state = service.get('State', service.get('Status', ''))
                                        
                                        if 'Up' in service_state or 'running' in service_state.lower():
                                            # Get ports for this service
                                            service_ports = ports_map.get(service_name, '')
                                            if service_ports:
                                                # Parse port mappings like "0.0.0.0:8000->8000/tcp, 0.0.0.0:5173->5173/tcp"
                                                port_matches = re.findall(r'0\.0\.0\.0:(\d+)->\d+/tcp', service_ports)
                                                for host_port in port_matches:
                                                    # Use VPS IP if available, otherwise use localhost
                                                    base_url = f"http://{vps_ip}" if vps_ip else "http://localhost"
                                                    service_routes.append({
                                                        "service": service_name,
                                                        "port": int(host_port),
                                                        "url": f"{base_url}:{host_port}",
                                                        "internal_port": None  # Could extract from mapping if needed
                                                    })
                                except Exception as e:
                                    logger.debug(f"Failed to parse service routes: {e}")
                        except Exception as e:
                            logger.debug(f"Failed to extract service routes: {e}")
                    
                    if service_routes:
                        yield from log("")
                        yield from log("🌐 Service Routes:")
                        for route in service_routes:
                            yield from log(f"  • {route['service']}: {route['url']}")
                else:
                    yield from log("⚠️  Docker Compose deployment completed with warnings/errors", level="error")
                    # Emit a single terminal failure event at the end (after logs are streamed),
                    # so the frontend can stop cleanly without losing the actual failure output.
                    yield "event: deploy_error\ndata: " + json.dumps({
                        "error": f"Docker Compose failed (exit code: {exit_code}). See logs above."
                    }) + "\n\n"
            else:
                yield from log("ℹ️  No docker-compose.yml found - skipping automatic startup")
            
            success_data = {
                'files_deployed': file_count,
                'target_path': target_path,
                'docker_compose_run': compose_file is not None
            }
            if compose_file and exit_code == 0:
                success_data['service_routes'] = service_routes

                # Auto-create domains for discovered services
                if service_routes:
                    try:
                        import asyncio
                        from app.modules.hosting.services.service_domain_service import ServiceDomainService

                        domain_service = ServiceDomainService(self.db)
                        base_domain = os.getenv("VPS_BASE_DOMAIN", "vps.localhost")

                        yield from log("🌐 Creating service domains...")

                        # Run async code synchronously within sync generator
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)

                        created_domains = loop.run_until_complete(
                            domain_service.auto_create_domains_for_deployment(
                                subscription_id=subscription.id,
                                service_routes=service_routes,
                                base_domain=base_domain
                            )
                        )

                        if created_domains:
                            # Add domain info to response
                            success_data['domains_created'] = [
                                {
                                    'service': d.service_name,
                                    'domain': d.domain_name,
                                    'url': f"http://{d.domain_name}",
                                    'active': d.is_active,
                                    'proxy_configured': d.proxy_configured
                                }
                                for d in created_domains
                            ]

                            yield from log(f"✅ Created {len(created_domains)} domain(s)")
                            for d in created_domains:
                                status = "✓" if d.proxy_configured else "⚠"
                                yield from log(f"  {status} {d.service_name}: http://{d.domain_name}")
                        else:
                            yield from log("ℹ️  No new domains created (may already exist)")

                    except Exception as e:
                        logger.warning(f"Failed to auto-create domains: {e}", exc_info=True)
                        yield from log(f"⚠️  Domain creation failed: {str(e)}", level="warning")

            yield f"event: success\ndata: {json.dumps(success_data)}\n\n"
            
        except Exception as e:
            error_msg = str(e)
            yield from log(f"❌ Deployment failed: {error_msg}", "error")
            logger.error(f"Failed to deploy files to container {container_id}: {e}", exc_info=True)
            yield "event: deploy_error\ndata: " + json.dumps({"error": error_msg}) + "\n\n"
        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    yield from log("🧹 Cleaned up temporary directory")
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory: {e}")
            yield "event: close\ndata: deployment_completed\n\n"
    
    async def install_docker_in_container(self, container_id: str) -> Dict[str, any]:
        """
        Install Docker and docker-compose in a container.
        
        Args:
            container_id: Docker container ID
            
        Returns:
            Dict with installation status and output
        """
        if not self.docker_available:
            return {
                "success": False,
                "error": "Docker not available on host"
            }
        
        try:
            container = self.client.containers.get(container_id)
            logs = []
            
            # Detect OS distribution
            result = container.exec_run("sh -c 'lsb_release -is 2>/dev/null || cat /etc/os-release | grep ^ID= | cut -d= -f2 | tr -d \\\"'", user="root")
            if result.exit_code == 0:
                os_id = result.output.decode('utf-8', errors='replace').strip().lower()
            else:
                # Default to ubuntu if detection fails
                os_id = "ubuntu"
                logs.append(f"Could not detect OS, defaulting to ubuntu")
            
            # Map OS to Docker repository
            if "ubuntu" in os_id or "debian" not in os_id:
                docker_os = "ubuntu"
            else:
                docker_os = "debian"
            
            logs.append(f"Detected OS: {os_id}, using Docker repository for: {docker_os}")

            # IMPORTANT: Wait for any existing apt-get processes to finish FIRST
            # The container startup script might be installing SSH
            logs.append("Waiting for container initialization to complete...")
            logs.append("Checking for existing apt-get processes...")
            max_wait = 120  # 2 minutes (reduced from 5)
            wait_interval = 3  # Check every 3 seconds
            waited = 0
            
            while waited < max_wait:
                # Check for both apt-get processes and lock files
                check_result = container.exec_run(
                    "sh -c 'pgrep -x apt-get > /dev/null 2>&1 && echo running || (lsof /var/lib/dpkg/lock-frontend > /dev/null 2>&1 && echo locked || echo none)'",
                    user="root"
                )
                if check_result.exit_code == 0:
                    output = check_result.output.decode('utf-8', errors='replace').strip()
                    if output == "none":
                        logs.append("No existing apt-get processes or locks found, proceeding...")
                        break
                    elif output == "locked":
                        logs.append(f"apt-get lock file exists, waiting... (waited {waited}s)")
                        time.sleep(wait_interval)
                        waited += wait_interval
                    else:
                        # Check if the process is actually still running
                        pid_check = container.exec_run(
                            f"sh -c 'ps -p {output} > /dev/null 2>&1 && echo running || echo dead'",
                            user="root"
                        )
                        if pid_check.exit_code == 0:
                            pid_output = pid_check.output.decode('utf-8', errors='replace').strip()
                            if pid_output == "dead":
                                logs.append("apt-get process appears to be dead, proceeding...")
                                break
                        logs.append(f"Waiting for apt-get process to finish... (waited {waited}s)")
                        time.sleep(wait_interval)
                        waited += wait_interval
                else:
                    # If check fails, assume no process and continue
                    logs.append("Could not check apt-get status, proceeding...")
                    break
            
            if waited >= max_wait:
                logs.append(f"⚠️ Timeout waiting for apt-get (waited {waited}s), proceeding anyway...")
                # Don't fail, just log warning - sometimes processes can be stuck but we can still proceed

            # Now update package lists (after waiting for lock to clear)
            logs.append("Updating package lists...")
            result = container.exec_run("sh -c 'apt-get update 2>&1'", user="root")
            logs.append(f"Update packages: exit_code={result.exit_code}")
            if result.exit_code != 0:
                error_output = result.output.decode('utf-8', errors='replace') if result.output else "Unknown error"
                # Only fail if it's a real error, not just permission warnings
                if "Operation not permitted" not in error_output and "E:" in error_output:
                    return {
                        "success": False,
                        "error": f"Failed to update packages: {error_output}",
                        "logs": logs
                    }

            # Install prerequisites
            logs.append("Installing Docker prerequisites...")
            result = container.exec_run(
                "sh -c 'apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release'",
                user="root"
            )
            logs.append(f"Install prerequisites: exit_code={result.exit_code}")
            if result.exit_code != 0:
                error_output = result.output.decode('utf-8', errors='replace') if result.output else "Unknown error"
                # Check if it's a lock error and suggest retry
                if "lock" in error_output.lower() or "held by process" in error_output.lower():
                    return {
                        "success": False,
                        "error": f"Package manager is locked. Please wait a moment and try again. Error: {error_output}",
                        "logs": logs
                    }
                return {
                    "success": False,
                    "error": f"Failed to install prerequisites: {error_output}",
                    "logs": logs
                }
            
            # Create keyrings directory
            result = container.exec_run("mkdir -p /etc/apt/keyrings", user="root")
            if result.exit_code != 0:
                return {
                    "success": False,
                    "error": f"Failed to create keyrings directory: {result.output.decode('utf-8', errors='replace')}",
                    "logs": logs
                }
            
            # Add Docker's official GPG key (use correct OS)
            # Use --batch --yes to avoid tty issues, and redirect stderr to avoid curl writing errors
            result = container.exec_run(
                f"sh -c 'curl -fsSL https://download.docker.com/linux/{docker_os}/gpg 2>/dev/null | gpg --batch --yes --dearmor -o /etc/apt/keyrings/docker.gpg 2>&1'",
                user="root"
            )
            logs.append(f"Add Docker GPG key: exit_code={result.exit_code}")
            if result.exit_code != 0:
                error_output = result.output.decode('utf-8', errors='replace') if result.output else "Unknown error"
                # Check if the key file was actually created despite the error
                check_result = container.exec_run("test -f /etc/apt/keyrings/docker.gpg", user="root")
                if check_result.exit_code == 0:
                    logs.append("Docker GPG key file exists despite error, continuing...")
                else:
                    return {
                        "success": False,
                        "error": f"Failed to add Docker GPG key: {error_output}",
                        "logs": logs
                    }
            
            # Set up Docker repository (use correct OS)
            result = container.exec_run(
                f"sh -c 'echo \"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/{docker_os} $(lsb_release -cs) stable\" | tee /etc/apt/sources.list.d/docker.list > /dev/null'",
                user="root"
            )
            logs.append(f"Setup Docker repo: exit_code={result.exit_code}")
            if result.exit_code != 0:
                return {
                    "success": False,
                    "error": f"Failed to set up Docker repository: {result.output.decode('utf-8', errors='replace')}",
                    "logs": logs
                }
            
            # Update packages again (ignore permission warnings)
            result = container.exec_run("sh -c 'apt-get update 2>&1 | grep -v \"Operation not permitted\" || true'", user="root")
            logs.append(f"Update packages (after repo add): exit_code={result.exit_code}")
            # Verify the update worked by checking if Docker packages are available
            result_check = container.exec_run("sh -c 'apt-cache search docker-ce 2>/dev/null | head -1'", user="root")
            if result_check.exit_code != 0:
                # Try without filtering warnings
                result = container.exec_run("sh -c 'apt-get update'", user="root")
                if result.exit_code != 0:
                    error_output = result.output.decode('utf-8', errors='replace') if result.output else "Unknown error"
                    # Check if it's a real error or just permission warnings
                    if "404 Not Found" in error_output or "does not have a Release file" in error_output:
                        return {
                            "success": False,
                            "error": f"Failed to update packages: {error_output}",
                            "logs": logs
                        }
                    elif "Operation not permitted" not in error_output:
                        return {
                            "success": False,
                            "error": f"Failed to update packages: {error_output}",
                            "logs": logs
                        }
            
            # Install Docker Engine
            result = container.exec_run(
                "sh -c 'apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin'",
                user="root"
            )
            logs.append(f"Install Docker: exit_code={result.exit_code}")
            if result.exit_code != 0:
                return {
                    "success": False,
                    "error": f"Failed to install Docker: {result.output.decode('utf-8', errors='replace')}",
                    "logs": logs
                }
            
            # Install docker-compose standalone (fallback)
            result = container.exec_run(
                "sh -c 'curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose'",
                user="root"
            )
            logs.append(f"Install docker-compose: exit_code={result.exit_code}")
            
            # Verify installation
            result = container.exec_run("sh -c 'docker --version'", user="root")
            docker_version = result.output.decode('utf-8', errors='replace').strip() if result.output else "unknown"
            logs.append(f"Docker version: {docker_version}")
            
            result = container.exec_run("sh -c 'docker compose version'", user="root")
            compose_version = result.output.decode('utf-8', errors='replace').strip() if result.output else "unknown"
            logs.append(f"Docker Compose version: {compose_version}")
            
            # Start Docker daemon if not running
            logs.append("Checking Docker daemon status...")
            check_daemon = container.exec_run("sh -c 'pgrep -x dockerd || echo not_running'", user="root")
            if check_daemon.exit_code == 0:
                output = check_daemon.output.decode('utf-8', errors='replace').strip()
                if output == "not_running":
                    logs.append("Starting Docker daemon...")
                    # Create necessary directories
                    container.exec_run("mkdir -p /var/run", user="root")
                    container.exec_run("mkdir -p /var/lib/docker", user="root")

                    # Configure Docker daemon for nested Docker (DinD)
                    # Use VFS storage driver instead of overlayfs (avoids overlayfs-on-overlayfs issues)
                    daemon_config = {
                        "log-level": "info",
                        "insecure-registries": []
                    }
                    daemon_json = json.dumps(daemon_config, indent=2)
                    # Use heredoc to avoid fragile shell quoting.
                    container.exec_run(
                        "sh -c 'mkdir -p /etc/docker && cat > /etc/docker/daemon.json << \"EOF\"\n"
                        + daemon_json
                        + "\nEOF\n'",
                        user="root",
                    )
                    logs.append("Configured Docker daemon with VFS storage driver for DinD compatibility")

                    # Start dockerd in background with VFS storage driver
                    start_result = container.exec_run(
                        "sh -c 'nohup dockerd --storage-driver=vfs > /var/log/dockerd.log 2>&1 &'",
                        user="root"
                    )
                    if start_result.exit_code == 0:
                        # Wait for daemon to start
                        import time
                        time.sleep(3)
                        # Verify it's running
                        verify_result = container.exec_run("sh -c 'pgrep -x dockerd || echo not_running'", user="root")
                        if verify_result.exit_code == 0:
                            verify_output = verify_result.output.decode('utf-8', errors='replace').strip()
                            if verify_output != "not_running":
                                logs.append("✅ Docker daemon started successfully")
                            else:
                                logs.append("⚠️ Docker daemon may not have started properly")
                        else:
                            logs.append("⚠️ Could not verify Docker daemon status")
                    else:
                        error_msg = start_result.output.decode('utf-8', errors='replace') if start_result.output else "Unknown error"
                        logs.append(f"⚠️ Failed to start dockerd: {error_msg}")
                else:
                    logs.append("✅ Docker daemon is already running")
            else:
                logs.append("⚠️ Could not check Docker daemon status")
            
            return {
                "success": True,
                "docker_version": docker_version,
                "compose_version": compose_version,
                "logs": logs
            }
            
        except Exception as e:
            logger.error(f"Failed to install Docker in container {container_id}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def _ensure_docker_daemon_running(self, container) -> bool:
        """
        Ensure Docker daemon is running in the container.
        
        Args:
            container: Docker container object
            
        Returns:
            True if daemon is running, False otherwise
        """
        def _docker_ready() -> bool:
            """
            Validate the daemon is actually reachable via the default unix socket.
            `pgrep dockerd` can be true while the daemon is still initializing or the socket is unusable.
            """
            try:
                # Force local socket; the VPS container may have DOCKER_HOST env set to the proxy.
                res = container.exec_run(
                    "sh -c 'DOCKER_HOST=unix:///var/run/docker.sock docker info >/dev/null 2>&1'",
                    user="root",
                )
                return res.exit_code == 0
            except Exception:
                return False

        def _cgroup_is_read_only() -> bool:
            """
            Detect the common Docker Desktop / nested-container limitation:
            cgroup2 mounted read-only inside the VPS container. In that case, DinD cannot create cgroups
            and any docker build/run will fail with mkdir /sys/fs/cgroup/docker: read-only file system.
            """
            try:
                # `mount` output is typically:
                #   cgroup on /sys/fs/cgroup type cgroup2 (ro,nosuid,nodev,noexec,relatime)
                # NOT "cgroup2 on /sys/fs/cgroup", so detect via "type cgroup2".
                res = container.exec_run(
                    "sh -c 'mount | grep -E \"on /sys/fs/cgroup .*type cgroup2\" || true'",
                    user="root",
                )
                out = res.output.decode("utf-8", errors="replace") if res.output else ""
                return ("type cgroup2" in out) and ("(ro," in out or " ro," in out or "(ro)" in out)
            except Exception:
                return False

        def _write_daemon_json_vfs() -> None:
            daemon_config = {
                "log-level": "info",
                "insecure-registries": [],
            }
            daemon_json = json.dumps(daemon_config, indent=2)
            # Use a heredoc so quoting works reliably across sh/bash (POSIX sh cannot escape quotes inside single quotes).
            container.exec_run(
                "sh -c 'mkdir -p /etc/docker && cat > /etc/docker/daemon.json << \"EOF\"\n"
                + daemon_json
                + "\nEOF\n'",
                user="root",
            )

        def _start_dockerd_vfs(clear_graph: bool = False) -> bool:
            try:
                container.exec_run("sh -c 'mkdir -p /var/run /var/lib/docker /etc/docker'", user="root")
                # Best-effort: make cgroup writable inside the VPS container (required for nested containers).
                # This may fail depending on how the VPS container itself is configured; we still try to proceed.
                container.exec_run("sh -c 'mount -o remount,rw /sys/fs/cgroup 2>/dev/null || true'", user="root")
                # If cgroup2 is still read-only, DinD cannot work on this host/runtime.
                if _cgroup_is_read_only():
                    try:
                        container.exec_run(
                            "sh -c 'echo \"cgroup2 is mounted read-only at /sys/fs/cgroup; DinD is not supported on this host/runtime\" >> /var/log/dockerd.log 2>/dev/null || true'",
                            user="root",
                        )
                    except Exception:
                        pass
                    return False
                _write_daemon_json_vfs()
                if clear_graph:
                    container.exec_run("sh -c 'rm -rf /var/lib/docker/* 2>/dev/null || true'", user="root")
                # Remove any stale socket before restart
                container.exec_run("sh -c 'rm -f /var/run/docker.sock 2>/dev/null || true'", user="root")
                # Start dockerd detached; be explicit about the unix socket and storage driver.
                container.exec_run(
                    "sh -c 'setsid dockerd --host=unix:///var/run/docker.sock --storage-driver=vfs > /var/log/dockerd.log 2>&1 < /dev/null &'",
                    user="root",
                )
                # Wait up to ~20s for the daemon to become reachable.
                for _ in range(20):
                    time.sleep(1)
                    if _docker_ready():
                        return True
                return False
            except Exception:
                return False

        # If docker is already reachable, we're done.
        if _docker_ready():
            return True

        # Check if dockerd is running
        check_result = container.exec_run("sh -c 'pgrep -x dockerd || echo not_running'", user="root")
        if check_result.exit_code == 0:
            output = check_result.output.decode('utf-8', errors='replace').strip()
            if output == "not_running":
                # Try to start dockerd
                logger.info("Docker daemon not running, attempting to start...")
                ok = _start_dockerd_vfs(clear_graph=False)
                if ok:
                    logger.info("Docker daemon started and is reachable via /var/run/docker.sock")
                    return True

                # If start failed, check logs for overlay/graphdriver errors and retry with a clean graph.
                try:
                    error_log = container.exec_run(
                        "sh -c 'tail -80 /var/log/dockerd.log 2>/dev/null || echo no_logs'",
                        user="root",
                    )
                    error_output = error_log.output.decode('utf-8', errors='replace') if error_log.output else ""
                except Exception:
                    error_output = ""

                if any(
                    s in (error_output or "").lower()
                    for s in ["overlay", "graphdriver", "failed to mount", "invalid argument"]
                ):
                    logger.warning("dockerd failed to become ready; retrying with cleaned /var/lib/docker and vfs driver")
                    ok2 = _start_dockerd_vfs(clear_graph=True)
                    if ok2:
                        return True
                    logger.warning(f"dockerd still not ready after retry. Logs: {(error_output or '')[:500]}")
                    return False

                logger.warning(f"dockerd failed to become ready. Logs: {(error_output or '')[:500]}")
                return False
            else:
                # Daemon process exists; ensure it's actually reachable.
                if _docker_ready():
                    return True

                # Restart dockerd if the process exists but the socket is unusable.
                logger.warning("dockerd is running but docker client cannot connect; restarting dockerd with vfs")
                try:
                    container.exec_run("sh -c 'pkill -x dockerd 2>/dev/null || true'", user="root")
                except Exception:
                    pass

                ok = _start_dockerd_vfs(clear_graph=False)
                if ok:
                    return True

                # As last resort, retry with a clean graph (handles overlayfs-on-overlayfs leftovers).
                ok2 = _start_dockerd_vfs(clear_graph=True)
                return ok2
        else:
            logger.warning("Could not check Docker daemon status")
            return False
    
    async def run_docker_compose(
        self,
        container_id: str,
        compose_file_path: str,
        command: str = "up -d",
        working_dir: str = "/data"
    ) -> Dict[str, any]:
        """
        Run docker-compose command in container.
        
        Args:
            container_id: Docker container ID
            compose_file_path: Path to docker-compose.yml file (relative to working_dir)
            command: docker-compose command (e.g., "up -d", "down", "ps")
            working_dir: Working directory where docker-compose.yml is located
            
        Returns:
            Dict with command output and exit code
        """
        if not self.docker_available:
            return {
                "success": False,
                "error": "Docker not available on host"
            }
        
        try:
            container = self.client.containers.get(container_id)
            
            # Ensure Docker daemon is running
            if not self._ensure_docker_daemon_running(container):
                return {
                    "success": False,
                    "error": "Docker daemon is not running and could not be started"
                }
            
            # Build the command
            # Try docker compose (plugin) first, fallback to docker-compose
            full_command = f"cd {working_dir} && (docker compose -f {compose_file_path} {command} || docker-compose -f {compose_file_path} {command})"
            
            result = container.exec_run(
                f"sh -c '{full_command}'",
                user="root",
                workdir=working_dir
            )
            
            output = result.output.decode('utf-8', errors='replace') if result.output else ""
            
            return {
                "success": result.exit_code == 0,
                "exit_code": result.exit_code,
                "output": output,
                "command": full_command
            }
            
        except Exception as e:
            logger.error(f"Failed to run docker-compose in container {container_id}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def run_docker_compose_stream(
        self,
        container_id: str,
        compose_file_path: str,
        command: str = "up -d",
        working_dir: str = "/data"
    ) -> Iterator[str]:
        """
        Run docker-compose command in container with streaming output.
        
        Yields log lines in real-time via SSE format.
        
        Args:
            container_id: Docker container ID
            compose_file_path: Path to docker-compose.yml file (relative to working_dir)
            command: docker-compose command (e.g., "up -d", "down", "ps")
            working_dir: Working directory where docker-compose.yml is located
            
        Yields:
            SSE-formatted log lines
        """
        if not self.docker_available:
            yield f"event: error\ndata: {json.dumps({'error': 'Docker not available on host'})}\n\n"
            return
        
        def log(message: str, level: str = "info"):
            """Yield a log message with timestamp."""
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{timestamp}] {message}"
            if level == "error":
                logger.error(log_entry)
                yield f"event: error\ndata: {json.dumps({'message': log_entry})}\n\n"
            else:
                logger.info(log_entry)
                yield f"data: {log_entry}\n\n"
        
        try:
            yield from log("🚀 Starting docker-compose command...")
            container = self.client.containers.get(container_id)
            
            # Ensure Docker daemon is running
            yield from log("🔍 Checking Docker daemon status...")
            if not self._ensure_docker_daemon_running(container):
                yield from log("❌ Docker daemon is not running and could not be started", level="error")
                return
            yield from log("✅ Docker daemon is running")
            
            # Build the command
            # Try docker compose (plugin) first, fallback to docker-compose
            full_command = f"cd {working_dir} && (docker compose -f {compose_file_path} {command} || docker-compose -f {compose_file_path} {command})"
            
            yield from log(f"📝 Command: {full_command}")
            yield from log(f"📁 Working directory: {working_dir}")
            yield from log(f"📄 Compose file: {compose_file_path}")
            yield from log("")
            
            # Execute with streaming
            exec_instance = container.exec_run(
                f"sh -c '{full_command}'",
                user="root",
                workdir=working_dir,
                stream=True,
                demux=True  # Separate stdout and stderr
            )
            
            # Stream output line by line in real-time
            buffer_stdout = ""
            buffer_stderr = ""
            
            for chunk in exec_instance:
                if chunk is None:
                    continue
                
                # Handle different return formats from Docker SDK
                # With demux=True, it should return (stdout, stderr) tuple
                # But sometimes it might return just bytes or a different format
                stdout_chunk = None
                stderr_chunk = None
                
                if isinstance(chunk, tuple) and len(chunk) == 2:
                    stdout_chunk, stderr_chunk = chunk
                elif isinstance(chunk, bytes):
                    # If demux didn't work, treat all as stdout
                    stdout_chunk = chunk
                else:
                    # Unknown format, skip
                    continue
                
                # Process stdout - yield immediately as lines arrive
                if stdout_chunk:
                    text = stdout_chunk.decode('utf-8', errors='replace')
                    buffer_stdout += text
                    # Yield complete lines immediately (don't wait for more)
                    while '\n' in buffer_stdout:
                        line, buffer_stdout = buffer_stdout.split('\n', 1)
                        # Yield all lines (even empty ones for formatting)
                        yield f"data: {line}\n\n"
                
                # Process stderr - yield immediately as lines arrive
                if stderr_chunk:
                    text = stderr_chunk.decode('utf-8', errors='replace')
                    buffer_stderr += text
                    # Yield complete lines immediately
                    while '\n' in buffer_stderr:
                        line, buffer_stderr = buffer_stderr.split('\n', 1)
                        if line.strip():  # Only yield non-empty stderr lines
                            yield f"event: error\ndata: {json.dumps({'message': line})}\n\n"
            
            # Yield any remaining buffer content (incomplete lines at the end)
            if buffer_stdout.strip():
                yield f"data: {buffer_stdout}\n\n"
            if buffer_stderr.strip():
                yield f"event: error\ndata: {json.dumps({'message': buffer_stderr})}\n\n"
            
            # Get exit code (we need to check the exec instance)
            # Note: exec_run with stream=True doesn't return exit code directly
            # We'll check if docker-compose is still running or check the last output
            yield from log("")
            yield from log("✅ Command execution completed")
            yield f"event: success\ndata: {json.dumps({'message': 'Command completed'})}\n\n"
            
        except GeneratorExit:
            logger.info(f"Client disconnected during docker-compose stream for container {container_id}")
            raise
        except Exception as e:
            error_msg = str(e)
            yield from log(f"❌ Error: {error_msg}", "error")
            logger.error(f"Failed to run docker-compose in container {container_id}: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'error': error_msg})}\n\n"
        finally:
            yield "event: close\ndata: stream_ended\n\n"

    async def get_container_id(self, subscription_id: str) -> Optional[str]:
        """
        Get container ID for a subscription.
        
        Helper method to retrieve container_id from subscription.
        """
        from app.modules.hosting.repository import VPSSubscriptionRepository
        repo = VPSSubscriptionRepository(self.db)
        subscription = await repo.get_by_id(subscription_id)
        if subscription and subscription.container:
            return subscription.container.container_id
        return None

    async def list_containers_in_vps(self, subscription_id: str) -> List[Dict[str, Any]]:
        """
        List all containers running inside a VPS subscription container.
        
        Executes 'docker ps' inside the VPS container to get all running containers
        and their port mappings.
        
        Args:
            subscription_id: VPS subscription ID
            
        Returns:
            List of dictionaries with container information:
            - id: Container ID (short)
            - name: Container name
            - image: Image name/ID
            - status: Container status
            - ports: Port mappings string (docker ps format)
            - ports_parsed: Parsed port mappings list
        """
        container_id = await self.get_container_id(subscription_id)
        if not container_id:
            return []
            
        if not self.docker_available:
            return []

        try:
            container = self.client.containers.get(container_id)
            
            # Check if docker is available inside the VPS container
            # Try with docker command first, then docker compose/docker-compose
            ps_prefix = ""
            for cmd in ["docker", "docker compose", "docker-compose"]:
                check_result = container.exec_run(f"which {cmd.split()[0]}", user="root")
                if check_result.exit_code == 0:
                    ps_prefix = cmd.split()[0] + " "
                    break
            
            if not ps_prefix:
                logger.warning(f"Docker not found inside VPS container {container_id}")
                return []
            
            # Execute docker ps with formatted output
            # Format: ID, Image, Status, Ports, Names
            ps_result = container.exec_run(
                f"sh -c '{ps_prefix}docker ps --format \"{{{{.ID}}}}\\t{{{{.Image}}}}\\t{{{{.Status}}}}\\t{{{{.Ports}}}}\\t{{{{.Names}}}}\" 2>/dev/null'",
                user="root"
            )
            
            if ps_result.exit_code != 0 or not ps_result.output:
                return []
            
            output = ps_result.output.decode('utf-8', errors='replace').strip()
            if not output:
                return []
            
            containers = []
            for line in output.split('\n'):
                if not line.strip() or line.startswith('CONTAINER'):
                    continue
                    
                parts = line.split('\t')
                if len(parts) >= 5:
                    container_id_short = parts[0][:12]  # Short ID
                    image = parts[1]
                    status = parts[2]
                    ports = parts[3]
                    name = parts[4]
                    
                    # Parse port mappings
                    ports_parsed = []
                    if ports and ports != '<none>':
                        # Parse format: "0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp"
                        port_pattern = r'(\d+\.\d+\.\d+\.\d+):(\d+)->(\d+)/(tcp|udp)'
                        matches = re.findall(port_pattern, ports)
                        for match in matches:
                            ports_parsed.append({
                                'host_ip': match[0],
                                'host_port': int(match[1]),
                                'container_port': int(match[2]),
                                'protocol': match[3],
                                'display': f"{match[0]}:{match[1]}->{match[2]}/{match[3]}"
                            })
                    
                    containers.append({
                        'id': container_id_short,
                        'name': name,
                        'image': image,
                        'status': status,
                        'ports': ports,
                        'ports_parsed': ports_parsed
                    })
            
            return containers
            
        except Exception as e:
            logger.error(f"Failed to list containers in VPS {subscription_id}: {e}", exc_info=True)
            return []

    async def get_container_logs(self, container_id: str, tail: int = 100) -> Optional[str]:
        """Get container logs."""
        if not self.docker_available:
            return None

        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail, timestamps=True)
            return logs.decode('utf-8') if logs else ''
        except Exception as e:
            logger.error(f"Failed to get logs for container {container_id}: {e}")
            return None

    def iter_container_logs(self, container_id: str, tail: int = 100) -> Iterator[str]:
        """
        Stream container logs (follow).

        Returns a generator of log chunks (decoded to UTF-8). Intended for SSE/log streaming.
        """
        if not self.docker_available:
            return iter(())

        container = self.client.containers.get(container_id)
        for chunk in container.logs(stream=True, follow=True, tail=tail, timestamps=True):
            if not chunk:
                continue
            yield chunk.decode("utf-8", errors="replace")

    async def inspect_container(self, container_id: str) -> Optional[Dict]:
        """Full container inspection."""
        if not self.docker_available:
            return None

        try:
            container = self.client.containers.get(container_id)
            return container.attrs
        except Exception as e:
            logger.error(f"Failed to inspect container {container_id}: {e}")
            return None

    async def get_container_health(self, container_id: str) -> Optional[Dict]:
        """
        Get container health check status.

        Returns:
            Dict with health information including:
            - status: 'healthy', 'unhealthy', 'starting', 'none'
            - failing_streak: Number of consecutive failures
            - last_check: Timestamp of last health check
            - last_output: Output from last health check
        """
        if not self.docker_available:
            return None

        try:
            inspect = await self.inspect_container(container_id)
            if not inspect:
                return None

            state = inspect.get('State', {})
            health = state.get('Health', {})

            # If no health check configured
            if not health:
                return {
                    'status': 'none',
                    'message': 'No health check configured'
                }

            # Get health status
            status = health.get('Status', 'unknown').lower()
            failing_streak = health.get('FailingStreak', 0)

            # Get last health check log
            health_log = health.get('Log', [])
            last_check = None
            last_output = None

            if health_log:
                last_entry = health_log[-1]
                last_check = last_entry.get('End')
                last_output = last_entry.get('Output', '').strip()
                exit_code = last_entry.get('ExitCode', 0)

            return {
                'status': status,
                'failing_streak': failing_streak,
                'last_check': last_check,
                'last_output': last_output,
                'is_healthy': status == 'healthy',
                'needs_attention': status in ['unhealthy', 'starting'] and failing_streak >= 3
            }

        except Exception as e:
            logger.error(f"Failed to get health for container {container_id}: {e}")
            return None

    async def check_all_container_health(self) -> Dict[str, any]:
        """
        Check health of all running VPS containers.

        Returns:
            Dict with summary of health checks
        """
        from app.modules.hosting.repository import ContainerInstanceRepository

        if not self.docker_available:
            return {"error": "Docker not available"}

        repo = ContainerInstanceRepository(self.db)
        running_containers = await repo.get_running_containers()

        health_summary = {
            'total': len(running_containers),
            'healthy': 0,
            'unhealthy': 0,
            'starting': 0,
            'no_healthcheck': 0,
            'unhealthy_containers': []
        }

        for container in running_containers:
            health = await self.get_container_health(container.container_id)

            if not health:
                continue

            status = health.get('status')

            if status == 'healthy':
                health_summary['healthy'] += 1
            elif status == 'unhealthy':
                health_summary['unhealthy'] += 1
                health_summary['unhealthy_containers'].append({
                    'container_id': container.container_id,
                    'container_name': container.container_name,
                    'subscription_id': str(container.subscription_id),
                    'failing_streak': health.get('failing_streak', 0),
                    'last_output': health.get('last_output')
                })
            elif status == 'starting':
                health_summary['starting'] += 1
            elif status == 'none':
                health_summary['no_healthcheck'] += 1

        return health_summary

    # Helper methods

    def _patch_compose_remove_app_binds(self, compose_text: str) -> Optional[str]:
        """
        Patch docker-compose YAML to remove /app bind mounts using proper YAML parsing.
        
        Removes volume entries that bind-mount into /app to avoid permission issues
        with entrypoint scripts. Uses YAML parsing to preserve structure.
        
        Args:
            compose_text: Original docker-compose YAML content
            
        Returns:
            Patched YAML string if successful, None if patching failed or YAML unavailable
        """
        if not yaml:
            logger.warning("PyYAML not available, cannot patch compose file with YAML parsing")
            return None
            
        try:
            # Parse YAML into dict structure
            compose_data = yaml.safe_load(compose_text)
            if not isinstance(compose_data, dict):
                logger.warning("Compose file is not a valid YAML dictionary")
                return None
            
            # Track if any changes were made
            changes_made = False
            
            # Get services section
            services = compose_data.get('services', {})
            if not isinstance(services, dict):
                logger.warning("Services section is not a dictionary")
                return None
            
            # Process each service
            for service_name, service_config in services.items():
                if not isinstance(service_config, dict):
                    continue
                
                # Get volumes for this service
                volumes = service_config.get('volumes', [])
                if not isinstance(volumes, list):
                    continue
                
                # Filter out /app bind mounts and /app/node_modules
                original_count = len(volumes)
                filtered_volumes = []
                
                for vol in volumes:
                    if isinstance(vol, str):
                        # Handle string format: "./path:/app" or "./path:/app/..."
                        if re.match(r'^\./[^:]*:/app(?:/|\s|$)', vol, re.IGNORECASE):
                            changes_made = True
                            continue
                        if re.match(r'^/app/node_modules\s*$', vol, re.IGNORECASE):
                            changes_made = True
                            continue
                    elif isinstance(vol, dict):
                        # Handle dict format: {"type": "bind", "source": "./path", "target": "/app"}
                        target = vol.get('target', '')
                        if isinstance(target, str) and target.startswith('/app'):
                            changes_made = True
                            continue
                        # Check for /app/node_modules
                        source = vol.get('source', '')
                        if isinstance(source, str) and '/app/node_modules' in source:
                            changes_made = True
                            continue
                    
                    filtered_volumes.append(vol)
                
                # Update volumes if changed
                if len(filtered_volumes) != original_count:
                    if filtered_volumes:
                        service_config['volumes'] = filtered_volumes
                    else:
                        # Remove volumes key if empty
                        service_config.pop('volumes', None)
            
            # Only proceed if changes were made
            if not changes_made:
                return None
            
            # Validate patched YAML structure
            if not self._validate_compose_structure(compose_data):
                logger.warning("Patched compose file failed validation")
                return None
            
            # Convert back to YAML string
            # Use default_flow_style=False to preserve block style formatting
            patched_text = yaml.dump(compose_data, default_flow_style=False, sort_keys=False)
            return patched_text
            
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse compose file YAML: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error patching compose file: {e}", exc_info=True)
            return None
    
    def _validate_compose_structure(self, compose_data: dict) -> bool:
        """
        Validate docker-compose YAML structure after patching.
        
        Ensures that:
        - services section contains only service mappings
        - volumes section (if present) contains only volume definitions
        - No structural corruption occurred
        
        Args:
            compose_data: Parsed compose YAML as dict
            
        Returns:
            True if structure is valid, False otherwise
        """
        try:
            # Validate services section
            services = compose_data.get('services')
            if services is not None:
                if not isinstance(services, dict):
                    logger.warning("Services section is not a dictionary")
                    return False
                
                # Each service should be a mapping
                for service_name, service_config in services.items():
                    if not isinstance(service_config, dict):
                        logger.warning(f"Service '{service_name}' is not a mapping")
                        return False
            
            # Validate volumes section (top-level named volumes)
            volumes = compose_data.get('volumes')
            if volumes is not None:
                if not isinstance(volumes, dict):
                    logger.warning("Volumes section is not a dictionary")
                    return False
                
                # Each volume should be a mapping or None (for default settings)
                for vol_name, vol_config in volumes.items():
                    if vol_config is not None and not isinstance(vol_config, dict):
                        logger.warning(f"Volume '{vol_name}' is not a mapping")
                        return False
            
            # Validate networks section (top-level named networks)
            networks = compose_data.get('networks')
            if networks is not None:
                if not isinstance(networks, dict):
                    logger.warning("Networks section is not a dictionary")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating compose structure: {e}", exc_info=True)
            return False

    def _generate_password(self, length: int = 16) -> str:
        """Generate a secure random password."""
        return secrets.token_urlsafe(length)

    def _encrypt_password(self, password: str) -> str:
        """Encrypt password using Fernet."""
        return self.cipher.encrypt(password.encode()).decode()

    def decrypt_password(self, encrypted_password: str) -> str:
        """Decrypt password using Fernet."""
        try:
            return self.cipher.decrypt(encrypted_password.encode()).decode()
        except Exception as e:
            # Check if this is an InvalidToken error (key mismatch)
            if isinstance(e, InvalidToken):
                logger.error(
                    f"Failed to decrypt password: InvalidToken. "
                    f"This usually means the VPS_PASSWORD_ENCRYPTION_KEY has changed. "
                    f"Passwords encrypted with a different key cannot be decrypted."
                )
                raise ValueError(
                    "Unable to decrypt password. The encryption key may have changed. "
                    "Please contact support to reset the password."
                ) from e
            # Re-raise other exceptions
            logger.error(f"Failed to decrypt password: {e}")
            raise

    async def _cleanup_failed_container(self, container_name: str, network_name: str):
        """Cleanup resources after failed container creation."""
        if not self.docker_available:
            return

        # Remove container if exists
        try:
            container = self.client.containers.get(container_name)
            container.remove(force=True)
            logger.info(f"Cleaned up failed container: {container_name}")
        except NotFound:
            pass
        except Exception as e:
            logger.warning(f"Could not cleanup container {container_name}: {e}")

        # Remove network if exists and no other containers using it
        try:
            network = self.client.networks.get(network_name)
            containers = network.attrs.get('Containers', {})
            if not containers:
                network.remove()
                logger.info(f"Cleaned up network: {network_name}")
        except NotFound:
            pass
        except Exception as e:
            logger.warning(f"Could not cleanup network {network_name}: {e}")

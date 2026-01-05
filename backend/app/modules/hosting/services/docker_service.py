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
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Iterator, BinaryIO
from cryptography.fernet import Fernet

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

            # Generate root password
            root_password = self._generate_password()
            encrypted_password = self._encrypt_password(root_password)

            # Create isolated bridge network with unique subnet per subscription
            # Use subscription ID hash to ensure unique subnet (avoids overlaps)
            subnet_octet = self._get_unique_subnet_octet(str(subscription.id))
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
            container_command = [
                "/bin/bash", "-c",
                (
                    "set -e && "
                    f"echo 'root:{root_password}' | chpasswd && "
                    "if ! command -v sshd &> /dev/null; then "
                    "apt-get update -qq && apt-get install -y -qq openssh-server && rm -rf /var/lib/apt/lists/*; "
                    "fi && "
                    "mkdir -p /var/run/sshd && "
                    "echo 'PermitRootLogin yes' >> /etc/ssh/sshd_config && "
                    "echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config && "
                    "/usr/sbin/sshd -D & "
                    "exec tail -f /dev/null"
                )
            ]
            
            # Create container with HARDENED security configuration
            container = self.client.containers.create(
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
                # Map container port 22 to unique host port
                ports={'22/tcp': ssh_port},

                # === VOLUMES ===
                mounts=[
                    Mount(target="/data", source=volume_path, type="bind", read_only=False)
                ] if Mount else None,

                # === SECURITY HARDENING ===
                # CRITICAL: Never run as root
                # user="1000:1000",  # Uncomment if image supports non-root user

                # Drop ALL Linux capabilities (defense in depth)
                cap_drop=["ALL"],

                # Add NET_BIND_SERVICE so SSH can bind to port 22
                cap_add=["CHOWN", "DAC_OVERRIDE", "SETGID", "SETUID", "NET_BIND_SERVICE"],

                # Don't allow new privileges
                security_opt=[
                    "no-new-privileges:true",
                    # Add AppArmor profile if available
                    # "apparmor=docker-vps-restricted"
                ],

                # CRITICAL: Never run in privileged mode
                privileged=False,

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
                    "VPS_SUBSCRIPTION_ID": str(subscription.id)
                },

                # === LABELS ===
                labels={
                    "vps.subscription_id": str(subscription.id),
                    "vps.customer_id": str(subscription.customer_id),
                    "vps.plan": subscription.plan.slug,
                    "vps.managed": "true"
                }
            )

            # Start the container
            container.start()
            logger.info(f"Container {container_name} started with ID: {container.id}")

            # Create ContainerInstance model
            instance = ContainerInstance(
                subscription_id=subscription.id,
                container_id=container.id,
                container_name=container_name,
                ip_address=ip_address,
                network_name=network_name,
                hostname=hostname,
                ssh_port=ssh_port,
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
            Dict with deployment status and details
        """
        if not self.docker_available:
            return {
                "success": False,
                "error": "Docker not available"
            }
        
        temp_dir = None
        try:
            container = self.client.containers.get(container_id)
            
            # Create temporary directory for extraction
            temp_dir = tempfile.mkdtemp(prefix="vps_deploy_")
            extracted_path = os.path.join(temp_dir, "extracted")
            os.makedirs(extracted_path, exist_ok=True)
            
            # Extract archive
            archive_file = Path(archive_path)
            if not archive_file.exists():
                return {
                    "success": False,
                    "error": f"Archive not found: {archive_path}"
                }
            
            logger.info(f"Extracting archive {archive_path} to {extracted_path}")
            
            if archive_file.suffix == '.zip':
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    zip_ref.extractall(extracted_path)
            elif archive_file.suffix in ['.tar', '.gz'] or archive_file.name.endswith('.tar.gz'):
                with tarfile.open(archive_path, 'r:*') as tar_ref:
                    tar_ref.extractall(extracted_path)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported archive format: {archive_file.suffix}"
                }
            
            # Create tar archive of extracted files for docker cp
            tar_path = os.path.join(temp_dir, "deploy.tar")
            with tarfile.open(tar_path, 'w') as tar:
                tar.add(extracted_path, arcname=os.path.basename(target_path))
            
            # Copy to container using docker cp (via put_archive)
            logger.info(f"Copying files to container {container_id} at {target_path}")
            
            # Ensure target directory exists in container
            container.exec_run(f"mkdir -p {target_path}")
            
            # Use put_archive to copy files
            with open(tar_path, 'rb') as tar_file:
                container.put_archive(path=target_path, data=tar_file.read())
            
            # Get file count for reporting
            result = container.exec_run(f"find {target_path} -type f | wc -l")
            file_count = int(result.output.decode('utf-8').strip()) if result.output else 0
            
            logger.info(f"Successfully deployed {file_count} files to {target_path}")
            
            return {
                "success": True,
                "target_path": target_path,
                "files_deployed": file_count,
                "archive_size": os.path.getsize(archive_path)
            }
            
        except Exception as e:
            logger.error(f"Failed to deploy files to container {container_id}: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

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

    def _generate_password(self, length: int = 16) -> str:
        """Generate a secure random password."""
        return secrets.token_urlsafe(length)

    def _encrypt_password(self, password: str) -> str:
        """Encrypt password using Fernet."""
        return self.cipher.encrypt(password.encode()).decode()

    def decrypt_password(self, encrypted_password: str) -> str:
        """Decrypt password using Fernet."""
        return self.cipher.decrypt(encrypted_password.encode()).decode()

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

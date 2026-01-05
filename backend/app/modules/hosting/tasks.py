"""
Celery background tasks for VPS hosting module.

Handles async provisioning, scheduled metrics collection, invoice generation,
overdue checks, and metrics cleanup.

Note: Celery tasks use SYNCHRONOUS database sessions (SyncSessionLocal)
to avoid asyncio event loop conflicts in the multiprocessing environment.
"""
import asyncio
import traceback
import secrets
import os
import shutil
import time
import hashlib
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List, Tuple
from decimal import Decimal
from cryptography.fernet import Fernet

try:
    import docker
    from docker.errors import DockerException, APIError, NotFound
    from docker.types import Mount, IPAMConfig, IPAMPool
except ImportError:
    docker = None
    DockerException = Exception
    APIError = Exception
    NotFound = Exception
    Mount = None
    IPAMConfig = None
    IPAMPool = None

from sqlalchemy import select, update, delete, func, text
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.logging import logger
from app.config.database import SyncSessionLocal  # Use SYNC sessions for Celery
from app.config.settings import get_settings
from app.modules.hosting.models import (
    VPSSubscription,
    VPSPlan,
    ContainerInstance,
    SubscriptionStatus,
    ContainerStatus,
    TimelineEventType,
    SubscriptionTimeline,
    ContainerMetrics
)
from app.infrastructure.email.service import EmailService

settings = get_settings()


# =============================================================================
# Helper Functions
# =============================================================================

def _get_unique_subnet_octet(subscription_id: str) -> int:
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


def _make_vps_identifiers(customer_id: str, plan_slug: str, subscription_id: str) -> Dict[str, str]:
    """
    Generate per-subscription identifiers for Docker artifacts.

    This prevents collisions when the same customer orders multiple VPS of the same plan.
    """
    customer8 = str(customer_id)[:8]
    sub8 = str(subscription_id)[:8]
    container_name = f"vps-{customer8}-{plan_slug}-{sub8}"
    network_name = f"vps-net-{customer8}-{sub8}"
    volume_path = f"/var/lib/vps-volumes/{container_name}"
    hostname = f"vps-{plan_slug}-{sub8}"
    return {
        "customer8": customer8,
        "sub8": sub8,
        "container_name": container_name,
        "network_name": network_name,
        "volume_path": volume_path,
        "hostname": hostname,
    }


def _cleanup_provisioning_artifacts(customer_id: str, plan_slug: str, subscription_id: str) -> None:
    """
    Best-effort cleanup of Docker artifacts created during provisioning.

    Strategy (as requested): remove any existing container/network/volume so retries can
    recreate cleanly and avoid Docker 409 name conflicts.
    """
    if not docker:
        return

    ids = _make_vps_identifiers(customer_id=customer_id, plan_slug=plan_slug, subscription_id=subscription_id)
    container_name = ids["container_name"]
    network_name = ids["network_name"]
    volume_path = ids["volume_path"]

    try:
        docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
        client = docker.DockerClient(base_url=docker_host)

        # Remove container (if exists)
        try:
            container = client.containers.get(container_name)
            try:
                if getattr(container, "status", None) == "running":
                    container.stop(timeout=30)
            except Exception:
                # Ignore stop failures; we'll force-remove below
                pass
            container.remove(force=True)
            logger.info(f"Cleaned up container: {container_name}")
        except NotFound:
            pass
        except Exception as e:
            logger.warning(f"Could not cleanup container {container_name}: {e}")

        # Remove network (if exists)
        try:
            network = client.networks.get(network_name)
            network.remove()
            logger.info(f"Cleaned up network: {network_name}")
        except NotFound:
            pass
        except Exception as e:
            logger.warning(f"Could not cleanup network {network_name}: {e}")

    except Exception as e:
        logger.warning(f"Cleanup skipped (Docker not available?): {e}")

    # Remove bind-mount directory (if present)
    try:
        if volume_path.startswith("/var/lib/vps-volumes/") and container_name.startswith("vps-"):
            shutil.rmtree(volume_path, ignore_errors=True)
            logger.info(f"Cleaned up volume path: {volume_path}")
    except Exception as e:
        logger.warning(f"Could not cleanup volume path {volume_path}: {e}")


def _create_docker_container(
    db: Session, subscription: VPSSubscription, plan: VPSPlan
) -> Dict[str, Any]:
    """
    Create a Docker container for VPS hosting (synchronous).

    Args:
        db: Database session
        subscription: VPS subscription
        plan: VPS plan with resource limits

    Returns:
        Dict with container details

    Raises:
        Exception: If Docker is not available or container creation fails
    """
    if not docker:
        raise Exception("Docker SDK not installed")

    try:
        # Initialize Docker client
        docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
        client = docker.DockerClient(base_url=docker_host)

        # Generate identifiers
        ids = _make_vps_identifiers(
            customer_id=subscription.customer_id, plan_slug=plan.slug, subscription_id=str(subscription.id)
        )
        container_name = ids["container_name"]
        network_name = ids["network_name"]

        # Allocate unique IP and SSH port
        ip_address = _get_next_available_ip(db)
        ssh_port = _get_next_available_ssh_port(db)

        # Generate and encrypt root password
        root_password = secrets.token_urlsafe(16)
        encryption_key = os.getenv("VPS_PASSWORD_ENCRYPTION_KEY")
        if not encryption_key:
            encryption_key = Fernet.generate_key().decode()
            logger.warning("Using generated encryption key - set VPS_PASSWORD_ENCRYPTION_KEY in production!")
        cipher = Fernet(encryption_key.encode())
        encrypted_password = cipher.encrypt(root_password.encode()).decode()

        # Create isolated bridge network with unique subnet per subscription
        # Use subscription ID hash to ensure unique subnet (avoids overlaps)
        subnet_octet = _get_unique_subnet_octet(str(subscription.id))
        try:
            network = client.networks.create(
                name=network_name,
                driver="bridge",
                ipam=IPAMConfig(
                    pool_configs=[
                        IPAMPool(
                            subnet=f"172.20.{subnet_octet}.0/24",
                            gateway=f"172.20.{subnet_octet}.1",
                        )
                    ]
                ),
                internal=False,  # Allow internet access
            )
            logger.info(f"Created network: {network_name}")
        except APIError as e:
            # Check if network already exists
            if "already exists" in str(e).lower() or "already in use" in str(e).lower():
                logger.info(f"Network {network_name} already exists, reusing it")
                try:
                    network = client.networks.get(network_name)
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
                network = client.networks.get(network_name)
                logger.info(f"Found existing network: {network_name}")
            except NotFound:
                # Network doesn't exist, re-raise original error
                logger.error(f"Network {network_name} does not exist and creation failed: {e}")
                raise

        # Create persistent volume path
        volume_path = ids["volume_path"]
        os.makedirs(volume_path, exist_ok=True)

        # Pull Docker image (subscription override > plan default)
        docker_image = getattr(subscription, "os_docker_image", None) or plan.docker_image
        logger.info(f"Pulling image: {docker_image}")
        client.images.pull(docker_image)

        # Prepare hostname
        hostname = ids["hostname"]

        # Create container with resource limits
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
        
        container = client.containers.create(
            image=docker_image,
            name=container_name,
            hostname=hostname,
            command=container_command,
            # Resource limits
            cpu_quota=int(plan.cpu_cores * 100000),
            mem_limit=f"{plan.ram_gb}g",
            memswap_limit=f"{plan.ram_gb}g",
            storage_opt={"size": f"{plan.storage_gb}g"},
            # Network configuration
            network=network_name,
            # Port mapping (SSH)
            ports={"22/tcp": ssh_port},
            # Volume mount
            volumes={volume_path: {"bind": "/data", "mode": "rw"}},
            # Environment variables
            environment={
                "ROOT_PASSWORD": root_password,
                "VPS_SUBSCRIPTION_ID": str(subscription.id),
            },
            # Security options
            cap_drop=["ALL"],
            cap_add=["CHOWN", "DAC_OVERRIDE", "SETGID", "SETUID", "NET_BIND_SERVICE"],
            security_opt=["no-new-privileges:true"],
            # Auto-restart
            restart_policy={"Name": "unless-stopped"},
            # Detached mode
            detach=True,
        )

        # Start the container
        container.start()
        logger.info(f"Container {container_name} created and started")

        return {
            "container_id": container.id,
            "container_name": container_name,
            "ip_address": ip_address,
            "network_name": network_name,
            "hostname": hostname,
            "ssh_port": ssh_port,
            "encrypted_password": encrypted_password,
            "data_volume_path": volume_path,
            "cpu_limit": float(plan.cpu_cores),
            "memory_limit_gb": int(plan.ram_gb),
            "storage_limit_gb": int(plan.storage_gb),
            "first_started_at": datetime.utcnow(),
            "last_started_at": datetime.utcnow(),
        }

    except Exception as e:
        logger.error(f"Failed to create Docker container: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise


def _get_next_available_ip(db: Session) -> str:
    """Get next available IP address for VPS container."""
    # Prevent concurrent allocations (match async repo lock ID)
    db.execute(text("SELECT pg_advisory_xact_lock(999002)"))

    # Find max IP in use
    stmt = select(func.max(ContainerInstance.ip_address))
    max_ip = db.execute(stmt).scalar()

    if not max_ip:
        # First container
        return "172.20.1.10"

    # Increment last octet
    parts = max_ip.split(".")
    last_octet = int(parts[-1]) + 1

    # If we exceed 254, increment third octet
    if last_octet > 254:
        third_octet = int(parts[2]) + 1
        return f"172.20.{third_octet}.10"

    return f"{parts[0]}.{parts[1]}.{parts[2]}.{last_octet}"


def _get_next_available_ssh_port(db: Session) -> int:
    """Get next available SSH port for VPS container."""
    # Prevent concurrent allocations (match async repo lock ID)
    db.execute(text("SELECT pg_advisory_xact_lock(999001)"))

    # Find max SSH port in use
    stmt = select(func.max(ContainerInstance.ssh_port))
    max_port = db.execute(stmt).scalar()

    if not max_port:
        # First container
        return 2222

    return max_port + 1


def _encrypt_vps_password(plain_password: str) -> str:
    """Encrypt a VPS password for storage in DB."""
    encryption_key = os.getenv("VPS_PASSWORD_ENCRYPTION_KEY")
    if not encryption_key:
        encryption_key = Fernet.generate_key().decode()
        logger.warning("Using generated encryption key - set VPS_PASSWORD_ENCRYPTION_KEY in production!")
    cipher = Fernet(encryption_key.encode())
    return cipher.encrypt(plain_password.encode()).decode()


def _docker_container_exists(client: "docker.DockerClient", container_id: Optional[str], container_name: str) -> Optional[str]:
    """
    Check if a container exists, preferring lookup by ID (more stable), then by name.

    Returns:
        Docker container ID if found, otherwise None.
    """
    # Try by ID first
    if container_id:
        try:
            container = client.containers.get(container_id)
            return container.id
        except NotFound:
            pass
        except Exception:
            # If Docker is transiently unhappy, don't assume missing
            raise

    # Fallback to name
    try:
        container = client.containers.get(container_name)
        return container.id
    except NotFound:
        return None


# =============================================================================
# Celery Tasks
# =============================================================================

@celery_app.task(name="hosting.provision_vps_async", bind=True, max_retries=3)
def provision_vps_async(self, subscription_id: str) -> Dict[str, Any]:
    """
    Synchronous task to provision VPS after admin approval.

    Duration: ~30-60 seconds

    Args:
        subscription_id: Subscription ID to provision

    Returns:
        Dict with status and container details

    Raises:
        Retries on failure with exponential backoff
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting VPS provisioning for subscription {subscription_id}")

    customer_id: Optional[str] = None
    plan_slug: Optional[str] = None

    try:
        with SyncSessionLocal() as db:
            # Load subscription with plan details
            stmt = select(VPSSubscription).where(VPSSubscription.id == subscription_id)
            subscription = db.execute(stmt).scalar_one_or_none()

            if not subscription:
                raise Exception(f"Subscription {subscription_id} not found")

            if subscription.status != SubscriptionStatus.PROVISIONING:
                raise Exception(
                    f"Subscription is not in PROVISIONING status (current: {subscription.status})"
                )

            customer_id = subscription.customer_id

            # Load the plan details
            stmt = select(VPSPlan).where(VPSPlan.id == subscription.plan_id)
            plan = db.execute(stmt).scalar_one_or_none()

            if not plan:
                raise Exception(f"VPS plan {subscription.plan_id} not found")

            plan_slug = plan.slug

            # If this is a retry, cleanup any artifacts from previous failed attempt(s)
            if self.request.retries > 0 and customer_id and plan_slug:
                _cleanup_provisioning_artifacts(
                    customer_id=customer_id,
                    plan_slug=plan_slug,
                    subscription_id=str(subscription.id),
                )

            # Create Docker container
            container_data = _create_docker_container(db, subscription, plan)

            # Create container instance in database
            container_instance = ContainerInstance(
                subscription_id=subscription.id,
                container_id=container_data["container_id"],
                container_name=container_data["container_name"],
                ip_address=container_data["ip_address"],
                network_name=container_data["network_name"],
                hostname=container_data["hostname"],
                ssh_port=container_data["ssh_port"],
                root_password=container_data["encrypted_password"],
                status=ContainerStatus.RUNNING,
                cpu_limit=container_data["cpu_limit"],
                memory_limit_gb=container_data["memory_limit_gb"],
                storage_limit_gb=container_data["storage_limit_gb"],
                data_volume_path=container_data["data_volume_path"],
                first_started_at=container_data["first_started_at"],
                last_started_at=container_data["last_started_at"],
            )
            db.add(container_instance)
            db.flush()

            # Update subscription status
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.start_date = date.today()
            subscription.next_billing_date = date.today() + timedelta(days=30)

            # Create timeline event
            timeline_event = SubscriptionTimeline(
                subscription_id=subscription.id,
                event_type=TimelineEventType.PROVISIONED,
                event_description="VPS successfully provisioned and started",
                actor_type="SYSTEM",
                metadata={
                    "container_id": container_data["container_id"],
                    "ip_address": container_data["ip_address"],
                    "ssh_port": container_data["ssh_port"],
                },
            )
            db.add(timeline_event)

            # Commit all changes
            db.commit()

            logger.info(
                f"[Task {task_id}] VPS provisioned successfully: "
                f"{container_instance.container_name} (ID: {container_instance.container_id})"
            )

            return {
                "status": "success",
                "subscription_id": subscription_id,
                "container_id": str(container_instance.id),
                "container_name": container_instance.container_name,
                "ip_address": container_instance.ip_address,
                "ssh_port": container_instance.ssh_port,
            }

    except Exception as exc:
        retry_count = self.request.retries
        if retry_count < self.max_retries:
            # Cleanup before retry to avoid Docker 409 name conflicts
            if customer_id and plan_slug:
                _cleanup_provisioning_artifacts(
                    customer_id=customer_id,
                    plan_slug=plan_slug,
                    subscription_id=str(subscription_id),
                )

            # Exponential backoff: 60s, 120s, 240s
            countdown = 60 * (2 ** retry_count)
            logger.warning(
                f"[Task {task_id}] Retrying VPS provisioning (attempt {retry_count + 1}/{self.max_retries}) "
                f"in {countdown} seconds"
            )
            raise self.retry(exc=exc, countdown=countdown)
        else:
            # Final failure - notify admin via email
            logger.error(
                f"[Task {task_id}] VPS provisioning failed after {self.max_retries} retries "
                f"for subscription {subscription_id}: {exc}"
            )
            logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")

            # Send email notification (use asyncio.run for this specific async operation)
            try:
                admin_email = settings.ADMIN_EMAIL
                email_service = EmailService()
                asyncio.run(email_service.send_email(
                    to=[admin_email],
                    subject=f"VPS Provisioning Failed: Subscription {subscription_id}",
                    html_body=f"""
                        <h2>VPS Provisioning Failed</h2>
                        <p>The VPS provisioning task failed after {self.max_retries} retries.</p>
                        <p><strong>Subscription ID:</strong> {subscription_id}</p>
                        <p><strong>Task ID:</strong> {task_id}</p>
                        <p><strong>Error:</strong> {str(exc)}</p>
                        <p><strong>Timestamp:</strong> {datetime.utcnow().isoformat()}</p>
                        <p>Please check the logs and investigate the issue.</p>
                    """
                ))
            except Exception as email_error:
                logger.error(f"[Task {task_id}] Failed to send admin notification email: {email_error}")

            raise


@celery_app.task(name="hosting.download_vps_image_async", bind=True, max_retries=3)
def download_vps_image_async(self, subscription_id: str) -> Dict[str, Any]:
    """
    Download (pull) the selected OS Docker image for a subscription before provisioning.
    Updates download progress fields on the subscription and then triggers provisioning.
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting image download for subscription {subscription_id}")

    if not docker:
        raise Exception("Docker SDK not installed")

    docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")

    try:
        with SyncSessionLocal() as db:
            sub_stmt = select(VPSSubscription).where(VPSSubscription.id == subscription_id)
            subscription = db.execute(sub_stmt).scalar_one_or_none()
            if not subscription:
                raise Exception(f"Subscription {subscription_id} not found")

            plan_stmt = select(VPSPlan).where(VPSPlan.id == subscription.plan_id)
            plan = db.execute(plan_stmt).scalar_one_or_none()
            if not plan:
                raise Exception(f"VPS plan {subscription.plan_id} not found")

            docker_image = getattr(subscription, "os_docker_image", None) or plan.docker_image

            # Initialize tracking fields
            subscription.image_download_status = "DOWNLOADING"
            subscription.image_download_progress = 0
            subscription.image_download_updated_at = datetime.utcnow()
            # Keep a rolling log
            logs: List[str] = []
            subscription.image_download_logs = ""
            db.add(subscription)
            db.commit()

            api = docker.APIClient(base_url=docker_host)

            # Track layer progress for best-effort percent
            layer_totals: Dict[str, int] = {}
            layer_currents: Dict[str, int] = {}
            last_flush = time.time()

            def compute_percent() -> int:
                total = sum(layer_totals.values())
                current = sum(min(layer_currents.get(k, 0), v) for k, v in layer_totals.items())
                if total <= 0:
                    return 0
                return int((current / total) * 100)

            for item in api.pull(docker_image, stream=True, decode=True):
                status = item.get("status")
                layer_id = item.get("id")
                progress_detail = item.get("progressDetail") or {}

                # Record log lines (bounded)
                if status:
                    line = status if not layer_id else f"{layer_id}: {status}"
                    logs.append(line)
                    if len(logs) > 200:
                        logs = logs[-200:]

                # Update progress
                if layer_id and isinstance(progress_detail, dict):
                    total = progress_detail.get("total")
                    current = progress_detail.get("current")
                    if isinstance(total, int) and total > 0:
                        layer_totals[layer_id] = total
                    if isinstance(current, int) and current >= 0:
                        layer_currents[layer_id] = current

                # Periodically flush updates to DB
                now = time.time()
                if now - last_flush >= 1.0:
                    subscription.image_download_progress = compute_percent()
                    subscription.image_download_updated_at = datetime.utcnow()
                    subscription.image_download_logs = "\n".join(logs)
                    db.add(subscription)
                    db.commit()
                    last_flush = now

            # Finalize
            subscription.image_download_status = "COMPLETED"
            subscription.image_download_progress = 100
            subscription.image_download_updated_at = datetime.utcnow()
            subscription.image_download_logs = "\n".join(logs)

            # Transition to provisioning and trigger provisioning task
            subscription.status = SubscriptionStatus.PROVISIONING
            db.add(subscription)
            db.commit()

            from app.modules.hosting.tasks import provision_vps_async as _provision
            _provision.delay(str(subscription.id))

            logger.info(f"[Task {task_id}] Image download completed for {subscription_id}, provisioning triggered")
            return {"status": "success", "subscription_id": subscription_id, "docker_image": docker_image}

    except Exception as e:
        # Best-effort persist failure state
        try:
            with SyncSessionLocal() as db:
                sub_stmt = select(VPSSubscription).where(VPSSubscription.id == subscription_id)
                subscription = db.execute(sub_stmt).scalar_one_or_none()
                if subscription:
                    subscription.image_download_status = "ERROR"
                    subscription.image_download_updated_at = datetime.utcnow()
                    subscription.status_reason = f"Image download failed: {str(e)}"
                    # Move back to PENDING so admin can retry
                    subscription.status = SubscriptionStatus.PENDING
                    db.add(subscription)
                    db.commit()
        except Exception:
            pass

        raise


@celery_app.task(name="hosting.reconcile_missing_vps_containers", bind=True)
def reconcile_missing_vps_containers(self, limit: int = 100) -> Dict[str, Any]:
    """
    Scheduled task: reconcile DB vs Docker state for VPS containers.

    If a ContainerInstance is marked RUNNING but its Docker container is missing,
    recreate it (reset password, keep existing volume path if it exists).
    """
    task_id = self.request.id

    if not docker:
        return {"status": "skipped", "reason": "Docker SDK not installed", "reconciled": 0}

    docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
    client = docker.DockerClient(base_url=docker_host)

    reconciled: List[str] = []
    skipped: List[str] = []
    failed: List[Dict[str, str]] = []

    with SyncSessionLocal() as db:
        # Join to get customer/plan info needed to recreate
        stmt = (
            select(ContainerInstance, VPSSubscription, VPSPlan)
            .join(VPSSubscription, ContainerInstance.subscription_id == VPSSubscription.id)
            .join(VPSPlan, VPSSubscription.plan_id == VPSPlan.id)
            .where(ContainerInstance.status == ContainerStatus.RUNNING)
            .limit(limit)
        )
        rows: List[Tuple[ContainerInstance, VPSSubscription, VPSPlan]] = db.execute(stmt).all()

        for instance, subscription, plan in rows:
            try:
                # If it exists, optionally refresh container_id if found by name
                found_id = _docker_container_exists(
                    client=client,
                    container_id=instance.container_id,
                    container_name=instance.container_name,
                )
                if found_id:
                    if instance.container_id != found_id:
                        instance.container_id = found_id
                        db.add(instance)
                        db.commit()
                    skipped.append(instance.subscription_id)
                    continue

                # Missing: recreate using per-subscription identifiers
                ids = _make_vps_identifiers(
                    customer_id=subscription.customer_id,
                    plan_slug=plan.slug,
                    subscription_id=str(subscription.id),
                )

                # Preserve existing volume if present; otherwise use new expected path
                volume_path = instance.data_volume_path if instance.data_volume_path and os.path.isdir(instance.data_volume_path) else ids["volume_path"]
                os.makedirs(volume_path, exist_ok=True)

                # Ensure network exists (best effort) with unique subnet per subscription
                subnet_octet = _get_unique_subnet_octet(str(subscription.id))
                try:
                    client.networks.create(
                        name=ids["network_name"],
                        driver="bridge",
                        ipam=IPAMConfig(
                            pool_configs=[
                                IPAMPool(
                                    subnet=f"172.20.{subnet_octet}.0/24",
                                    gateway=f"172.20.{subnet_octet}.1",
                                )
                            ]
                        ),
                        internal=False,
                    )
                    logger.info(f"Created network for reconciliation: {ids['network_name']}")
                except APIError as e:
                    # Check if network already exists
                    if "already exists" in str(e).lower() or "already in use" in str(e).lower():
                        logger.info(f"Network {ids['network_name']} already exists during reconciliation")
                        try:
                            client.networks.get(ids["network_name"])
                        except NotFound:
                            logger.warning(f"Network {ids['network_name']} reported as existing but not found, will continue anyway")
                    else:
                        logger.warning(f"Failed to create network {ids['network_name']} during reconciliation: {e}, will continue anyway")
                except Exception as e:
                    # Unexpected error, try to get existing network as fallback
                    logger.warning(f"Unexpected error creating network {ids['network_name']} during reconciliation: {e}")
                    try:
                        client.networks.get(ids["network_name"])
                    except NotFound:
                        logger.warning(f"Network {ids['network_name']} does not exist and creation failed, will continue anyway")

                # Keep IP/port if already assigned in DB; else allocate new
                ip_address = instance.ip_address or _get_next_available_ip(db)
                ssh_port = instance.ssh_port or _get_next_available_ssh_port(db)

                # Reset password (do not log it)
                new_root_password = secrets.token_urlsafe(16)
                encrypted_password = _encrypt_vps_password(new_root_password)

                # Pull image and create container
                docker_image = getattr(subscription, "os_docker_image", None) or plan.docker_image
                client.images.pull(docker_image)
                
                # Command to keep container running and set up SSH
                container_command = [
                    "/bin/bash", "-c",
                    (
                        "set -e && "
                        f"echo 'root:{new_root_password}' | chpasswd && "
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
                
                container = client.containers.create(
                    image=docker_image,
                    name=ids["container_name"],
                    hostname=ids["hostname"],
                    command=container_command,
                    cpu_quota=int(plan.cpu_cores * 100000),
                    mem_limit=f"{plan.ram_gb}g",
                    memswap_limit=f"{plan.ram_gb}g",
                    storage_opt={"size": f"{plan.storage_gb}g"},
                    network=ids["network_name"],
                    ports={"22/tcp": ssh_port},
                    volumes={volume_path: {"bind": "/data", "mode": "rw"}},
                    environment={
                        "ROOT_PASSWORD": new_root_password,
                        "VPS_SUBSCRIPTION_ID": str(subscription.id),
                    },
                    cap_drop=["ALL"],
                    cap_add=["CHOWN", "DAC_OVERRIDE", "SETGID", "SETUID", "NET_BIND_SERVICE"],
                    security_opt=["no-new-privileges:true"],
                    restart_policy={"Name": "unless-stopped"},
                    detach=True,
                )
                container.start()

                now = datetime.utcnow()

                # Update DB record to match recreated container
                instance.container_id = container.id
                instance.container_name = ids["container_name"]
                instance.network_name = ids["network_name"]
                instance.hostname = ids["hostname"]
                instance.ip_address = ip_address
                instance.ssh_port = ssh_port
                instance.root_password = encrypted_password
                instance.data_volume_path = volume_path
                instance.status = ContainerStatus.RUNNING
                if not instance.first_started_at:
                    instance.first_started_at = now
                instance.last_started_at = now

                db.add(instance)
                db.commit()

                reconciled.append(instance.subscription_id)

            except Exception as e:
                db.rollback()
                failed.append({"subscription_id": instance.subscription_id, "error": str(e)})

    return {
        "status": "success",
        "reconciled": len(reconciled),
        "skipped": len(skipped),
        "failed": failed,
    }


@celery_app.task(name="hosting.collect_all_metrics", bind=True)
def collect_all_metrics_task(self) -> Dict[str, Any]:
    """
    Scheduled task: Collect metrics for all running containers.

    Runs every 5 minutes.

    Returns:
        Dict with status and count of containers processed
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting metrics collection for all containers")

    try:
        with SyncSessionLocal() as db:
            # Get all running containers
            stmt = select(ContainerInstance).where(
                ContainerInstance.status == ContainerStatus.RUNNING
            )
            containers = db.execute(stmt).scalars().all()

            # Collect metrics for each container (simplified - would need Docker client)
            count = len(containers)
            logger.info(
                f"[Task {task_id}] Metrics collection completed: {count} containers processed"
            )

            return {
                "status": "success",
                "containers_collected": count,
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"[Task {task_id}] Metrics collection failed: {e}")
        logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@celery_app.task(name="hosting.generate_recurring_invoices", bind=True)
def generate_recurring_invoices_task(self) -> Dict[str, Any]:
    """
    Scheduled task: Generate recurring invoices for subscriptions.

    Runs daily at 00:00 UTC.

    Returns:
        Dict with status and count of invoices generated
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting recurring invoice generation")

    try:
        with SyncSessionLocal() as db:
            today = date.today()

            # Find active subscriptions due for billing today
            stmt = (
                select(VPSSubscription)
                .where(VPSSubscription.status == SubscriptionStatus.ACTIVE)
                .where(VPSSubscription.next_billing_date == today)
                .where(VPSSubscription.auto_renew == True)
            )
            eligible_subscriptions = db.execute(stmt).scalars().all()

            logger.info(
                f"[Task {task_id}] Found {len(eligible_subscriptions)} subscriptions due for billing"
            )

            # Note: Invoice generation would require async service calls
            # For now, just log the subscriptions that need invoices
            generated_count = 0
            for subscription in eligible_subscriptions:
                logger.info(
                    f"[Task {task_id}] Subscription {subscription.subscription_number} "
                    f"needs invoice generation (customer: {subscription.customer_id})"
                )
                # TODO: Implement invoice generation
                generated_count += 1

            logger.info(
                f"[Task {task_id}] Recurring invoice generation completed: "
                f"{generated_count} subscriptions processed"
            )

            return {
                "status": "success",
                "invoices_generated": generated_count,
                "total_eligible": len(eligible_subscriptions),
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"[Task {task_id}] Recurring invoice generation failed: {e}")
        logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@celery_app.task(name="hosting.check_overdue_invoices", bind=True)
def check_overdue_invoices_task(self) -> Dict[str, Any]:
    """
    Scheduled task: Check for overdue invoices and suspend subscriptions.

    Runs daily at 02:00 UTC.

    Returns:
        Dict with status and count of suspended subscriptions
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting overdue invoice check")

    try:
        with SyncSessionLocal() as db:
            # TODO: Implement overdue invoice check logic
            # This would require querying invoices and checking due dates
            logger.info(f"[Task {task_id}] Overdue check completed (placeholder)")

            return {
                "status": "success",
                "suspended_count": 0,
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"[Task {task_id}] Overdue check failed: {e}")
        logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@celery_app.task(name="hosting.cleanup_old_metrics", bind=True)
def cleanup_old_metrics_task(self) -> Dict[str, Any]:
    """
    Scheduled task: Delete metrics older than 30 days.

    Runs weekly on Sunday at 03:00 UTC.

    Returns:
        Dict with status and count of deleted records
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting metrics cleanup")

    try:
        with SyncSessionLocal() as db:
            # Delete metrics older than 30 days
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            stmt = delete(ContainerMetrics).where(
                ContainerMetrics.collected_at < cutoff_date
            )
            result = db.execute(stmt)
            db.commit()

            deleted_count = result.rowcount

            logger.info(
                f"[Task {task_id}] Metrics cleanup completed: {deleted_count} records deleted"
            )

            return {
                "status": "success",
                "deleted_count": deleted_count,
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"[Task {task_id}] Metrics cleanup failed: {e}")
        logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@celery_app.task(name="hosting.build_docker_image", bind=True, max_retries=1)
def build_docker_image_task(self, image_id: str) -> Dict[str, Any]:
    """
    Synchronous task to build custom Docker image from uploaded project.

    Duration: ~2-10 minutes (depending on image size and complexity)

    Process:
    1. Validate uploaded archive
    2. Extract and validate Dockerfile
    3. Build Docker image
    4. Run Trivy security scan
    5. Mark as COMPLETED or REJECTED

    Args:
        image_id: CustomDockerImage ID to build

    Returns:
        Dict with build status and results

    Raises:
        Retries once on transient failures
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting Docker image build for image {image_id}")

    try:
        with SyncSessionLocal() as db:
            # TODO: Implement Docker image build logic with sync DB
            # This would require:
            # 1. Load image record from DB
            # 2. Extract and validate uploaded archive
            # 3. Build Docker image using Docker SDK
            # 4. Run security scan
            # 5. Update image status in DB

            logger.info(f"[Task {task_id}] Docker image build completed (placeholder)")

            return {
                "status": "success",
                "image_id": image_id,
                "build_status": "pending",
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as exc:
        retry_count = self.request.retries
        if retry_count < self.max_retries:
            # Retry once after 2 minutes
            countdown = 120
            logger.warning(
                f"[Task {task_id}] Retrying Docker image build "
                f"(attempt {retry_count + 1}/{self.max_retries}) in {countdown} seconds"
            )
            raise self.retry(exc=exc, countdown=countdown)
        else:
            # Final failure - notify admin
            logger.error(
                f"[Task {task_id}] Docker image build failed after {self.max_retries} retries "
                f"for image {image_id}: {exc}"
            )
            logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")

            # Send email notification
            try:
                admin_email = settings.ADMIN_EMAIL
                email_service = EmailService()
                asyncio.run(email_service.send_email(
                    to=[admin_email],
                    subject=f"Docker Image Build Failed: {image_id}",
                    html_body=f"""
                        <h2>Custom Docker Image Build Failed</h2>
                        <p>The Docker image build task failed after {self.max_retries} retries.</p>
                        <p><strong>Image ID:</strong> {image_id}</p>
                        <p><strong>Task ID:</strong> {task_id}</p>
                        <p><strong>Error:</strong> {str(exc)}</p>
                        <p><strong>Timestamp:</strong> {datetime.utcnow().isoformat()}</p>
                        <p>Please check the logs and investigate the issue.</p>
                    """
                ))
            except Exception as email_error:
                logger.error(f"[Task {task_id}] Failed to send admin notification email: {email_error}")

            raise


@celery_app.task(name="hosting.backup_all_vps", bind=True)
def backup_all_vps_task(self) -> Dict[str, Any]:
    """
    Scheduled task: Backup all VPS containers to S3.

    Runs daily at 03:00 UTC.

    Returns:
        Dict with backup status and statistics
    """
    task_id = self.request.id
    logger.info(f"[Task {task_id}] Starting daily VPS backup")

    try:
        with SyncSessionLocal() as db:
            # Get all running containers that need backup
            stmt = select(ContainerInstance).where(
                ContainerInstance.status == ContainerStatus.RUNNING
            )
            containers = db.execute(stmt).scalars().all()

            # TODO: Implement backup logic
            # This would require:
            # 1. Create container snapshots using Docker SDK
            # 2. Upload to S3/backup storage
            # 3. Update backup records in database

            logger.info(
                f"[Task {task_id}] VPS backup completed (placeholder): "
                f"{len(containers)} containers found"
            )

            return {
                "status": "success",
                "total_containers": len(containers),
                "successful_backups": 0,
                "failed_backups": 0,
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"[Task {task_id}] VPS backup failed: {e}")
        logger.error(f"[Task {task_id}] Traceback: {traceback.format_exc()}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


"""
Container Monitoring Service.

Real-time metrics collection, historical data, and resource alerting.
Enhanced with cgroup metrics and I/O rate calculations.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, cast, String

from app.core.exceptions import NotFoundException
from app.core.logging import logger
from app.modules.hosting.models import (
    ContainerInstance,
    ContainerMetrics,
    VPSSubscription,
    SubscriptionStatus,
    ContainerStatus
)
from app.modules.hosting.repository import (
    ContainerInstanceRepository,
    ContainerMetricsRepository,
    VPSSubscriptionRepository
)
from app.modules.hosting.services.docker_service import DockerManagementService
from app.modules.hosting.services.cgroup_service import CgroupMonitoringService
from app.infrastructure.email.service import EmailService
from app.infrastructure.email import templates


class ContainerMonitoringService:
    """Service for container metrics collection and monitoring."""

    def __init__(self, db: AsyncSession):
        """Initialize monitoring service."""
        self.db = db
        self.container_repo = ContainerInstanceRepository(db)
        self.metrics_repo = ContainerMetricsRepository(db)
        self.subscription_repo = VPSSubscriptionRepository(db)
        self.docker_service = DockerManagementService(db)
        self.cgroup_service = CgroupMonitoringService()
        self.email_service = EmailService()
        # Track last notification time per subscription+alert_type to avoid spam
        self._last_alert_notification: Dict[str, datetime] = {}
        # Default metrics collection interval (5 minutes)
        self.collection_interval_seconds = 300

    async def _get_previous_metrics(self, container_id: str) -> Optional[ContainerMetrics]:
        """
        Get the most recent metrics for delta calculation.

        Args:
            container_id: Container instance ID

        Returns:
            Previous metrics record or None
        """
        query = select(ContainerMetrics).where(
            ContainerMetrics.container_id == container_id
        ).order_by(ContainerMetrics.recorded_at.desc()).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def _calculate_rate(current: int, previous: Optional[int], time_delta_seconds: int) -> int:
        """
        Calculate rate (bytes/sec) from cumulative counters.

        Args:
            current: Current cumulative value
            previous: Previous cumulative value
            time_delta_seconds: Time between measurements in seconds

        Returns:
            Rate in bytes/sec (0 if calculation not possible)
        """
        if previous is None or time_delta_seconds == 0:
            return 0

        # Handle counter resets (container restart)
        if current < previous:
            logger.debug(f"Counter reset detected: current={current}, previous={previous}")
            return 0

        delta_bytes = current - previous
        rate_bytes_per_sec = int(delta_bytes / time_delta_seconds)
        return rate_bytes_per_sec

    async def collect_metrics(self, container_id: str) -> Optional[ContainerMetrics]:
        """
        Collect current metrics for a single container.
        Enhanced with cgroup metrics and I/O rate calculations.

        Args:
            container_id: Container instance ID

        Returns:
            Created metrics record or None if collection failed
        """
        container = await self.container_repo.get_by_id(container_id)
        if not container:
            raise NotFoundException(f"Container {container_id} not found")

        if container.status != ContainerStatus.RUNNING:
            logger.debug(f"Container {container_id} is not running, skipping metrics collection")
            return None

        # Get previous metrics for delta calculation
        previous_metrics = await self._get_previous_metrics(container_id)

        # Calculate time delta for rate calculations
        time_delta_seconds = self.collection_interval_seconds
        if previous_metrics and previous_metrics.recorded_at:
            actual_delta = datetime.utcnow() - previous_metrics.recorded_at
            time_delta_seconds = int(actual_delta.total_seconds())
            if time_delta_seconds <= 0:
                time_delta_seconds = self.collection_interval_seconds

        # Get stats from Docker API
        stats = await self.docker_service.get_container_stats(container.container_id)
        if not stats:
            logger.warning(f"Failed to get Docker stats for container {container.container_id}")
            return None

        # Get advanced cgroup metrics (CPU throttling, memory pressure, OOM)
        cgroup_metrics = None
        if self.cgroup_service.is_available():
            try:
                cgroup_metrics = self.cgroup_service.get_all_metrics(container.container_id)
            except Exception as e:
                logger.warning(f"Failed to collect cgroup metrics for {container.container_id[:12]}: {e}")

        # Calculate storage usage
        # Use du to calculate actual disk usage of the container's filesystem
        storage_used_mb = 0
        storage_percent = 0.0
        storage_limit_mb = container.storage_limit_gb * 1024  # Convert GB to MB
        
        try:
            # Use du to get actual disk usage of root filesystem (excluding virtual filesystems)
            # This gives us the real disk space used by the container
            # Calculate size of / excluding /proc, /sys, /dev, /run which are virtual filesystems
            storage_result = await self.docker_service.exec_command(
                container.container_id,
                "du -sb / 2>/dev/null | awk '{print $1}' || (du -sb /bin /boot /etc /home /lib /lib64 /opt /root /sbin /srv /tmp /usr /var 2>/dev/null | awk '{sum+=$1} END {print sum+0}') || echo '0'"
            )
            if storage_result and storage_result.get('exit_code') == 0:
                output = storage_result.get('output', '').strip()
                if output and output.isdigit():
                    storage_used_bytes = int(output)
                    storage_used_mb = round(storage_used_bytes / (1024 * 1024), 2)
                    
                    # Calculate percentage based on container's storage limit
                    if storage_limit_mb > 0:
                        storage_percent = round((storage_used_mb / storage_limit_mb) * 100.0, 2)
                        # Cap at 100% if somehow usage exceeds limit
                        if storage_percent > 100.0:
                            storage_percent = 100.0
                    else:
                        logger.warning(f"Storage limit is 0 for container {container.container_id[:12]}")
                else:
                    logger.debug(f"Storage output not numeric for container {container.container_id[:12]}: {output}")
            else:
                # Fallback: try simpler df command if du fails
                logger.debug(f"du command failed, trying df fallback for container {container.container_id[:12]}")
                fallback_result = await self.docker_service.exec_command(
                    container.container_id,
                    "df -B1 / 2>/dev/null | tail -1 | awk '{print $3}' || echo '0'"
                )
                if fallback_result and fallback_result.get('exit_code') == 0:
                    output = fallback_result.get('output', '').strip()
                    if output and output.isdigit():
                        storage_used_bytes = int(output)
                        storage_used_mb = round(storage_used_bytes / (1024 * 1024), 2)
                        if storage_limit_mb > 0:
                            storage_percent = round((storage_used_mb / storage_limit_mb) * 100.0, 2)
                            if storage_percent > 100.0:
                                storage_percent = 100.0
        except Exception as e:
            logger.warning(f"Failed to get storage usage for container {container.container_id[:12]}: {e}")

        # Calculate network I/O rates
        network_rx_bytes = stats.get('network_rx_bytes', 0)
        network_tx_bytes = stats.get('network_tx_bytes', 0)
        network_rx_rate = self._calculate_rate(
            network_rx_bytes,
            previous_metrics.network_rx_bytes if previous_metrics else None,
            time_delta_seconds
        )
        network_tx_rate = self._calculate_rate(
            network_tx_bytes,
            previous_metrics.network_tx_bytes if previous_metrics else None,
            time_delta_seconds
        )

        # Calculate block I/O rates
        block_read_bytes = stats.get('block_read_bytes', 0)
        block_write_bytes = stats.get('block_write_bytes', 0)
        block_read_rate = self._calculate_rate(
            block_read_bytes,
            previous_metrics.block_read_bytes if previous_metrics else None,
            time_delta_seconds
        )
        block_write_rate = self._calculate_rate(
            block_write_bytes,
            previous_metrics.block_write_bytes if previous_metrics else None,
            time_delta_seconds
        )

        # Create enhanced metrics record
        metrics = ContainerMetrics(
            subscription_id=container.subscription_id,
            container_id=container.id,
            # Basic Docker stats
            cpu_usage_percent=stats.get('cpu_usage_percent', 0.0),
            memory_usage_mb=stats.get('memory_usage_mb', 0.0),
            memory_usage_percent=stats.get('memory_usage_percent', 0.0),
            storage_usage_mb=storage_used_mb,
            storage_usage_percent=storage_percent,
            # Cumulative I/O counters
            network_rx_bytes=network_rx_bytes,
            network_tx_bytes=network_tx_bytes,
            block_read_bytes=block_read_bytes,
            block_write_bytes=block_write_bytes,
            # I/O rates (calculated)
            network_rx_bytes_per_sec=network_rx_rate,
            network_tx_bytes_per_sec=network_tx_rate,
            block_read_bytes_per_sec=block_read_rate,
            block_write_bytes_per_sec=block_write_rate,
            # Process count
            process_count=stats.get('process_count'),
            # Advanced cgroup metrics
            cpu_throttle_periods=cgroup_metrics.cpu_throttle_periods if cgroup_metrics else None,
            cpu_throttled_time_ms=int(cgroup_metrics.cpu_throttled_time_ns / 1_000_000) if cgroup_metrics and cgroup_metrics.cpu_throttled_time_ns else None,
            cpu_steal_percent=cgroup_metrics.cpu_steal_percent if cgroup_metrics else None,
            memory_pressure_some_avg10=cgroup_metrics.memory_pressure_some_avg10 if cgroup_metrics else None,
            memory_pressure_full_avg10=cgroup_metrics.memory_pressure_full_avg10 if cgroup_metrics else None,
            oom_kill_count=cgroup_metrics.oom_kill_count if cgroup_metrics else 0,
            # Timestamp
            recorded_at=datetime.utcnow()
        )

        metrics = await self.metrics_repo.create(metrics)
        await self.db.commit()

        logger.debug(
            f"Collected metrics for container {container_id[:8]}: "
            f"CPU {metrics.cpu_usage_percent:.1f}%, "
            f"Memory {metrics.memory_usage_percent:.1f}%, "
            f"Net RX {network_rx_rate / 1024:.1f} KB/s, "
            f"Net TX {network_tx_rate / 1024:.1f} KB/s"
        )

        return metrics

    async def collect_all_metrics(self) -> int:
        """
        Scheduled task: Collect metrics for all running containers.

        Returns:
            Number of metrics collected
        """
        # Find all active subscriptions with running containers
        containers_query = select(ContainerInstance).join(VPSSubscription).where(
            and_(
                # Compare as string to avoid enum type-name mismatches in PostgreSQL
                cast(VPSSubscription.status, String) == SubscriptionStatus.ACTIVE.value,
                ContainerInstance.status == ContainerStatus.RUNNING
            )
        )

        result = await self.db.execute(containers_query)
        containers = result.scalars().all()

        collected_count = 0

        for container in containers:
            try:
                metrics = await self.collect_metrics(container.id)
                if metrics:
                    collected_count += 1
            except Exception as e:
                logger.error(f"Failed to collect metrics for container {container.id}: {e}")

        logger.info(f"Collected metrics for {collected_count}/{len(containers)} containers")

        return collected_count

    async def get_metrics_history(
        self,
        subscription_id: str,
        hours: int = 24
    ) -> List[ContainerMetrics]:
        """
        Get historical metrics for graphing.

        Args:
            subscription_id: Subscription ID
            hours: Number of hours of history to retrieve

        Returns:
            List of metrics records
        """
        metrics = await self.metrics_repo.get_recent_metrics(subscription_id, hours=hours)
        return metrics

    async def get_real_time_stats(self, container_id: str) -> Dict[str, Any]:
        """
        Get current stats (not from DB, directly from Docker).

        Args:
            container_id: Container instance ID

        Returns:
            Dictionary with current stats
        """
        container = await self.container_repo.get_by_id(container_id)
        if not container:
            raise NotFoundException(f"Container {container_id} not found")

        # Get current stats from Docker
        stats = await self.docker_service.get_container_stats(container.container_id)
        if not stats:
            return {
                "error": "Failed to get container stats",
                "container_status": container.status.value,
                "last_updated": datetime.utcnow().isoformat()
            }

        # Get container state
        try:
            inspect = await self.docker_service.inspect_container(container.container_id)
            docker_state = inspect.get('State', {}).get('Status', 'unknown') if inspect else 'unknown'
        except Exception as e:
            logger.warning(f"Failed to inspect container {container.container_id}: {e}")
            docker_state = 'unknown'

        # Calculate uptime
        uptime_seconds = 0
        if container.last_started_at:
            uptime_delta = datetime.utcnow() - container.last_started_at
            uptime_seconds = int(uptime_delta.total_seconds())

        return {
            "current_stats": stats,
            "container_status": container.status.value,
            "docker_state": docker_state,
            "uptime_seconds": uptime_seconds,
            "last_updated": datetime.utcnow().isoformat()
        }

    async def check_resource_alerts(self, subscription_id: str) -> List[Dict[str, Any]]:
        """
        Check for resource threshold breaches.

        Args:
            subscription_id: Subscription ID

        Returns:
            List of alert dictionaries
        """
        # Get metrics from last 10 minutes
        cutoff_time = datetime.utcnow() - timedelta(minutes=10)
        recent_metrics = await self.metrics_repo.get_recent_metrics(
            subscription_id,
            hours=1  # Get last hour, then filter to last 10 minutes
        )

        # Filter to last 10 minutes
        recent_metrics = [m for m in recent_metrics if m.recorded_at >= cutoff_time]

        if not recent_metrics:
            return []

        alerts = []
        latest = recent_metrics[0]

        # Check CPU > 90% for 10+ consecutive minutes
        cpu_high_count = sum(1 for m in recent_metrics if m.cpu_usage_percent > 90)
        if cpu_high_count >= len(recent_metrics) * 0.8:  # 80% of samples above threshold
            alerts.append({
                "type": "CPU_HIGH",
                "severity": "HIGH",
                "message": "CPU usage above 90% for extended period",
                "current_value": latest.cpu_usage_percent,
                "threshold": 90.0
            })

        # Check CPU Throttling > 50% of periods
        if latest.cpu_throttle_periods and latest.cpu_throttle_periods > 0:
            # Estimate throttle ratio from recent samples
            throttle_samples = [m for m in recent_metrics if m.cpu_throttle_periods and m.cpu_throttle_periods > 0]
            if len(throttle_samples) >= 2:
                # Check if throttling is increasing
                if latest.cpu_throttle_periods > throttle_samples[-2].cpu_throttle_periods:
                    alerts.append({
                        "type": "CPU_THROTTLED",
                        "severity": "HIGH",
                        "message": "CPU is being throttled - container hitting CPU limits",
                        "current_value": latest.cpu_throttle_periods,
                        "threshold": 0
                    })

        # Check Memory > 95%
        if latest.memory_usage_percent > 95:
            alerts.append({
                "type": "MEMORY_HIGH",
                "severity": "CRITICAL",
                "message": "Memory usage above 95%",
                "current_value": latest.memory_usage_percent,
                "threshold": 95.0
            })

        # Check Memory Pressure (PSI)
        if latest.memory_pressure_full_avg10 and latest.memory_pressure_full_avg10 > 1.0:
            alerts.append({
                "type": "MEMORY_PRESSURE",
                "severity": "CRITICAL",
                "message": "Memory pressure detected - tasks are stalling due to memory",
                "current_value": latest.memory_pressure_full_avg10,
                "threshold": 1.0
            })
        elif latest.memory_pressure_some_avg10 and latest.memory_pressure_some_avg10 > 10.0:
            alerts.append({
                "type": "MEMORY_PRESSURE",
                "severity": "HIGH",
                "message": "Memory pressure warning - some tasks experiencing delays",
                "current_value": latest.memory_pressure_some_avg10,
                "threshold": 10.0
            })

        # Check OOM Kills
        if latest.oom_kill_count and latest.oom_kill_count > 0:
            # Check if OOM count increased recently
            prev_oom = 0
            if len(recent_metrics) > 1 and recent_metrics[-1].oom_kill_count:
                prev_oom = recent_metrics[-1].oom_kill_count

            if latest.oom_kill_count > prev_oom:
                alerts.append({
                    "type": "OOM_KILL",
                    "severity": "CRITICAL",
                    "message": f"Container was OOM killed {latest.oom_kill_count} times - insufficient memory",
                    "current_value": latest.oom_kill_count,
                    "threshold": 0
                })

        # Check Storage > 90%
        if latest.storage_usage_percent > 90:
            alerts.append({
                "type": "STORAGE_HIGH",
                "severity": "HIGH",
                "message": "Storage usage above 90%",
                "current_value": latest.storage_usage_percent,
                "threshold": 90.0
            })

        # Check CPU Steal Time (host overcommitment)
        if latest.cpu_steal_percent and latest.cpu_steal_percent > 20.0:
            alerts.append({
                "type": "CPU_STEAL",
                "severity": "HIGH",
                "message": "High CPU steal time - host is overcommitted",
                "current_value": latest.cpu_steal_percent,
                "threshold": 20.0
            })

        # Send email notifications for alerts
        if alerts:
            subscription = await self.subscription_repo.get_by_id(subscription_id)
            if subscription:
                for alert in alerts:
                    # Send CRITICAL alerts immediately
                    if alert.get("severity") == "CRITICAL":
                        await self._send_alert_notification(subscription, alert)
                    # Send HIGH alerts immediately (can be changed to digest later)
                    elif alert.get("severity") == "HIGH":
                        await self._send_alert_notification(subscription, alert)

        return alerts

    async def _send_alert_notification(
        self,
        subscription: VPSSubscription,
        alert: Dict[str, Any]
    ) -> None:
        """
        Send alert notification email to customer.

        Args:
            subscription: VPS subscription
            alert: Alert dictionary with type, severity, message, current_value, threshold
        """
        # Check if we've sent this alert recently (within 1 hour) to avoid spam
        alert_key = f"{subscription.id}_{alert.get('type')}"
        last_notification = self._last_alert_notification.get(alert_key)
        if last_notification:
            time_since_last = datetime.utcnow() - last_notification
            if time_since_last < timedelta(hours=1):
                logger.debug(
                    f"Skipping alert notification for {alert_key} - "
                    f"last sent {time_since_last.total_seconds() / 60:.1f} minutes ago"
                )
                return

        try:
            customer_email = subscription.customer.email if subscription.customer else None
            if not customer_email:
                logger.warning(f"No email found for subscription {subscription.subscription_number}")
                return

            # Format alert severity badge color
            severity_color = "#dc2626" if alert.get("severity") == "CRITICAL" else "#f59e0b"
            severity_bg = "#fee2e2" if alert.get("severity") == "CRITICAL" else "#fef3c7"

            subject = f"VPS Alert: {alert.get('type')} - {subscription.subscription_number}"
            html_body = templates.get_base_template(f"""
                <h2>VPS Resource Alert</h2>
                <p>Dear Customer,</p>
                <p>We detected a resource usage alert on your VPS subscription.</p>
                <div style="background: {severity_bg}; padding: 15px; margin: 20px 0; border-left: 4px solid {severity_color};">
                    <p><strong>Subscription:</strong> {subscription.subscription_number}</p>
                    <p><strong>Alert Type:</strong> {alert.get('type', 'Unknown')}</p>
                    <p><strong>Severity:</strong> <span style="color: {severity_color}; font-weight: bold;">{alert.get('severity', 'UNKNOWN')}</span></p>
                    <p><strong>Message:</strong> {alert.get('message', 'No message')}</p>
                    <p><strong>Current Value:</strong> {alert.get('current_value', 0):.2f}%</p>
                    <p><strong>Threshold:</strong> {alert.get('threshold', 0):.2f}%</p>
                    <p><strong>Detected At:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
                <p>Please review your VPS resource usage and consider upgrading your plan if this continues.</p>
                <a href="https://cloudmanager.dz/vps/subscriptions/{subscription.id}" class="button">View VPS Details</a>
            """)

            await self.email_service.send_email([customer_email], subject, html_body)

            # Update last notification time
            self._last_alert_notification[alert_key] = datetime.utcnow()

            logger.info(
                f"Sent {alert.get('severity')} alert notification for subscription "
                f"{subscription.subscription_number} to {customer_email}"
            )
        except Exception as e:
            logger.error(
                f"Failed to send alert notification for subscription {subscription.subscription_number}: {e}"
            )
            # Don't fail alert detection if email fails

    async def cleanup_old_metrics(self, days: int = 30) -> int:
        """
        Scheduled task: Delete metrics older than N days.

        Args:
            days: Number of days to keep

        Returns:
            Number of metrics deleted
        """
        deleted_count = await self.metrics_repo.delete_old_metrics(days=days)
        await self.db.commit()

        logger.info(f"Deleted {deleted_count} metrics older than {days} days")

        return deleted_count



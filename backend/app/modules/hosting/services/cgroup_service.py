"""
cgroup Monitoring Service

Service for reading cgroup metrics directly from filesystem for advanced container metrics.
Provides metrics that Docker API doesn't expose, such as:
- CPU throttling statistics
- Memory pressure (PSI - Pressure Stall Information)
- OOM kill events
- CPU steal time

Supports both cgroup v1 and v2 formats with automatic detection.
"""
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CgroupMetrics:
    """Container for cgroup metrics"""
    # CPU Throttling
    cpu_throttle_periods: int = 0
    cpu_throttled_time_ns: int = 0

    # Memory Pressure
    memory_pressure_some_avg10: Optional[float] = None
    memory_pressure_full_avg10: Optional[float] = None

    # OOM Events
    oom_kill_count: int = 0

    # CPU Steal
    cpu_steal_percent: Optional[float] = None


class CgroupMonitoringService:
    """Service for reading cgroup metrics directly from filesystem"""

    CGROUP_V1_BASE = Path("/sys/fs/cgroup")
    CGROUP_V2_BASE = Path("/sys/fs/cgroup")

    def __init__(self):
        """Initialize cgroup monitoring service"""
        self.cgroup_version = self._detect_cgroup_version()
        logger.info(f"Detected cgroup version: {self.cgroup_version}")

    @staticmethod
    def _detect_cgroup_version() -> int:
        """Detect whether system is using cgroup v1 or v2"""
        # Check if cgroup v2 unified hierarchy exists
        cgroup2_marker = Path("/sys/fs/cgroup/cgroup.controllers")
        if cgroup2_marker.exists():
            return 2
        return 1

    def get_all_metrics(self, container_id: str) -> CgroupMetrics:
        """
        Get all cgroup metrics for a container

        Args:
            container_id: Full Docker container ID (64 chars)

        Returns:
            CgroupMetrics object with all available metrics
        """
        metrics = CgroupMetrics()

        try:
            # CPU throttling metrics
            throttle_data = self.get_cpu_throttling(container_id)
            metrics.cpu_throttle_periods = throttle_data.get("nr_throttled", 0)
            metrics.cpu_throttled_time_ns = throttle_data.get("throttled_time", 0)

            # Memory pressure metrics
            pressure_data = self.get_memory_pressure(container_id)
            metrics.memory_pressure_some_avg10 = pressure_data.get("some_avg10")
            metrics.memory_pressure_full_avg10 = pressure_data.get("full_avg10")

            # OOM kill count
            metrics.oom_kill_count = self.get_oom_events(container_id)

            # CPU steal time
            metrics.cpu_steal_percent = self.get_cpu_steal_time(container_id)

        except Exception as e:
            logger.warning(f"Failed to collect some cgroup metrics for {container_id[:12]}: {e}")

        return metrics

    def get_cpu_throttling(self, container_id: str) -> Dict[str, int]:
        """
        Read CPU throttling statistics from cgroup

        Returns dict with:
        - nr_periods: Number of enforcement intervals
        - nr_throttled: Number of times container was throttled
        - throttled_time: Total time throttled (nanoseconds)
        """
        result = {
            "nr_periods": 0,
            "nr_throttled": 0,
            "throttled_time": 0
        }

        try:
            if self.cgroup_version == 1:
                # cgroup v1: /sys/fs/cgroup/cpu/docker/<container_id>/cpu.stat
                stat_file = self.CGROUP_V1_BASE / "cpu" / "docker" / container_id / "cpu.stat"
            else:
                # cgroup v2: /sys/fs/cgroup/docker/<container_id>/cpu.stat
                stat_file = self.CGROUP_V2_BASE / "docker" / container_id / "cpu.stat"

            if not stat_file.exists():
                # Try alternative path (some systems use different hierarchy)
                if self.cgroup_version == 1:
                    stat_file = self.CGROUP_V1_BASE / "cpu,cpuacct" / "docker" / container_id / "cpu.stat"

                if not stat_file.exists():
                    logger.debug(f"CPU stat file not found for container {container_id[:12]}")
                    return result

            with open(stat_file, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 2:
                        key, value = parts
                        if key == "nr_periods":
                            result["nr_periods"] = int(value)
                        elif key == "nr_throttled":
                            result["nr_throttled"] = int(value)
                        elif key == "throttled_time":
                            result["throttled_time"] = int(value)

        except FileNotFoundError:
            logger.debug(f"CPU throttling stats not available for {container_id[:12]}")
        except Exception as e:
            logger.warning(f"Error reading CPU throttling stats: {e}")

        return result

    def get_memory_pressure(self, container_id: str) -> Dict[str, Optional[float]]:
        """
        Read memory pressure stall information (PSI)

        Returns dict with:
        - some_avg10: % of time some tasks stalled (10s avg)
        - some_avg60: % of time some tasks stalled (60s avg)
        - full_avg10: % of time all tasks stalled (10s avg)
        - full_avg60: % of time all tasks stalled (60s avg)
        """
        result = {
            "some_avg10": None,
            "some_avg60": None,
            "full_avg10": None,
            "full_avg60": None
        }

        try:
            if self.cgroup_version == 1:
                # cgroup v1 doesn't have PSI by default
                # Would need kernel with CONFIG_PSI enabled
                pressure_file = self.CGROUP_V1_BASE / "memory" / "docker" / container_id / "memory.pressure"
            else:
                # cgroup v2: /sys/fs/cgroup/docker/<container_id>/memory.pressure
                pressure_file = self.CGROUP_V2_BASE / "docker" / container_id / "memory.pressure"

            if not pressure_file.exists():
                logger.debug(f"Memory pressure file not found for {container_id[:12]}")
                return result

            with open(pressure_file, 'r') as f:
                for line in f:
                    # Format: some avg10=0.00 avg60=0.00 avg300=0.00 total=0
                    # Format: full avg10=0.00 avg60=0.00 avg300=0.00 total=0
                    parts = line.strip().split()
                    if len(parts) >= 4:
                        pressure_type = parts[0]  # "some" or "full"

                        for part in parts[1:]:
                            if '=' in part:
                                key, value = part.split('=')
                                if key == "avg10":
                                    if pressure_type == "some":
                                        result["some_avg10"] = float(value)
                                    elif pressure_type == "full":
                                        result["full_avg10"] = float(value)
                                elif key == "avg60":
                                    if pressure_type == "some":
                                        result["some_avg60"] = float(value)
                                    elif pressure_type == "full":
                                        result["full_avg60"] = float(value)

        except FileNotFoundError:
            logger.debug(f"Memory pressure not available for {container_id[:12]}")
        except Exception as e:
            logger.warning(f"Error reading memory pressure: {e}")

        return result

    def get_oom_events(self, container_id: str) -> int:
        """
        Get OOM (Out of Memory) kill count

        Returns:
            Number of times container was OOM killed
        """
        try:
            if self.cgroup_version == 1:
                # cgroup v1: /sys/fs/cgroup/memory/docker/<container_id>/memory.oom_control
                oom_file = self.CGROUP_V1_BASE / "memory" / "docker" / container_id / "memory.oom_control"
            else:
                # cgroup v2: /sys/fs/cgroup/docker/<container_id>/memory.events
                # Look for "oom_kill" counter
                events_file = self.CGROUP_V2_BASE / "docker" / container_id / "memory.events"

                if events_file.exists():
                    with open(events_file, 'r') as f:
                        for line in f:
                            parts = line.strip().split()
                            if len(parts) == 2 and parts[0] == "oom_kill":
                                return int(parts[1])
                return 0

            # cgroup v1 path
            if not oom_file.exists():
                logger.debug(f"OOM control file not found for {container_id[:12]}")
                return 0

            with open(oom_file, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) == 2 and parts[0] == "oom_kill":
                        return int(parts[1])

        except FileNotFoundError:
            logger.debug(f"OOM stats not available for {container_id[:12]}")
        except Exception as e:
            logger.warning(f"Error reading OOM events: {e}")

        return 0

    def get_cpu_steal_time(self, container_id: str) -> Optional[float]:
        """
        Calculate CPU steal time percentage

        CPU steal time indicates host overcommitment - time when container
        wanted CPU but hypervisor allocated it to another VM/container.

        Returns:
            Steal percentage (0-100) or None if not available
        """
        try:
            if self.cgroup_version == 1:
                # Read from cpuacct.stat
                stat_file = self.CGROUP_V1_BASE / "cpuacct" / "docker" / container_id / "cpuacct.stat"

                if not stat_file.exists():
                    # Try combined cpu,cpuacct
                    stat_file = self.CGROUP_V1_BASE / "cpu,cpuacct" / "docker" / container_id / "cpuacct.stat"

                if not stat_file.exists():
                    return None

                user_time = 0
                system_time = 0

                with open(stat_file, 'r') as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) == 2:
                            if parts[0] == "user":
                                user_time = int(parts[1])
                            elif parts[0] == "system":
                                system_time = int(parts[1])

                # Note: Actual steal time calculation would require comparing
                # with previous sample and host CPU stats. This is a simplified version.
                # For accurate steal time, we'd need to track deltas over time.
                # Returning None for now as it requires state tracking
                return None

            else:
                # cgroup v2 - CPU stat format different
                # Would need to implement similar logic
                return None

        except Exception as e:
            logger.warning(f"Error calculating CPU steal time: {e}")
            return None

    def is_available(self) -> bool:
        """
        Check if cgroup filesystem is accessible

        Returns:
            True if cgroups can be read, False otherwise
        """
        try:
            base_path = self.CGROUP_V1_BASE if self.cgroup_version == 1 else self.CGROUP_V2_BASE
            return base_path.exists() and os.access(base_path, os.R_OK)
        except Exception:
            return False

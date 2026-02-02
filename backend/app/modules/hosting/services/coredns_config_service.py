"""
CoreDNS Configuration Service.

Handles CoreDNS integration including zone file generation,
Corefile management, and DNS server reload operations.
"""
import os
import asyncio
import aiofiles
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status

from app.modules.hosting.dns_repository import DNSZoneRepository, DNSSyncLogRepository
from app.modules.hosting.models import (
    DNSZone,
    DNSRecord,
    DNSRecordType,
    DNSZoneStatus,
    DNSSyncType,
    DNSSyncStatus,
    DNSSyncLog
)
from app.core.exceptions import CloudManagerException, NotFoundException
from app.core.logging import logger


class CoreDNSConfigService:
    """Service for CoreDNS configuration and integration."""

    # CoreDNS paths (configurable via environment)
    COREDNS_ZONES_DIR = os.getenv("COREDNS_ZONES_DIR", "/etc/coredns/zones")
    COREDNS_CONFIG_DIR = os.getenv("COREDNS_CONFIG_DIR", "/etc/coredns")
    COREDNS_RELOAD_URL = os.getenv("COREDNS_RELOAD_URL", "http://coredns:8080/reload")
    COREDNS_HEALTH_URL = os.getenv("COREDNS_HEALTH_URL", "http://coredns:8080/health")

    def __init__(self, db: AsyncSession):
        self.db = db
        self.zone_repo = DNSZoneRepository(db)
        self.sync_log_repo = DNSSyncLogRepository(db)

    # ============================================================================
    # Zone File Generation (RFC 1035 Format)
    # ============================================================================

    def generate_zone_file_content(self, zone: DNSZone) -> str:
        """
        Generate RFC 1035 compliant zone file content.

        Args:
            zone: DNSZone with loaded records

        Returns:
            Zone file content as string

        Format:
            $ORIGIN example.com.
            $TTL 3600

            @  IN  SOA  ns1.example.com. admin.example.com. (
                        2025122601 ; Serial
                        7200       ; Refresh
                        3600       ; Retry
                        1209600    ; Expire
                        3600 )     ; Minimum TTL

            @       IN  NS   ns1.example.com.
            @       IN  A    172.20.1.2
            www     IN  A    172.20.1.2
        """
        lines = []

        # Zone header
        lines.append(f"$ORIGIN {zone.zone_name}.")
        lines.append(f"$TTL {zone.ttl_default}")
        lines.append("")

        # SOA record
        soa = zone.soa_record or {}
        lines.append(f"@\tIN\tSOA\t{soa.get('mname', f'ns1.{zone.zone_name}')} {soa.get('rname', f'admin.{zone.zone_name}')} (")
        lines.append(f"\t\t\t{zone.last_updated_serial or soa.get('serial', 1)} ; Serial")
        lines.append(f"\t\t\t{soa.get('refresh', 7200)} ; Refresh")
        lines.append(f"\t\t\t{soa.get('retry', 3600)} ; Retry")
        lines.append(f"\t\t\t{soa.get('expire', 1209600)} ; Expire")
        lines.append(f"\t\t\t{soa.get('minimum', 3600)} ) ; Minimum TTL")
        lines.append("")

        # Nameserver records
        for ns in zone.nameservers or ["ns1.cloudmanager.local", "ns2.cloudmanager.local"]:
            lines.append(f"@\tIN\tNS\t{ns}.")
        lines.append("")

        # DNS records grouped by type
        if hasattr(zone, 'records') and zone.records:
            records_by_type = {}
            for record in zone.records:
                if record.record_type not in records_by_type:
                    records_by_type[record.record_type] = []
                records_by_type[record.record_type].append(record)

            # Output records in standard order: A, AAAA, CNAME, MX, TXT, SRV, PTR
            type_order = [
                DNSRecordType.A,
                DNSRecordType.AAAA,
                DNSRecordType.CNAME,
                DNSRecordType.MX,
                DNSRecordType.TXT,
                DNSRecordType.NS,
                DNSRecordType.SRV,
                DNSRecordType.PTR
            ]

            for record_type in type_order:
                if record_type not in records_by_type:
                    continue

                lines.append(f"; {record_type.value} Records")
                for record in records_by_type[record_type]:
                    line = self._format_record_line(record, zone.ttl_default)
                    lines.append(line)
                lines.append("")

        return "\n".join(lines)

    def _format_record_line(self, record: DNSRecord, default_ttl: int) -> str:
        """
        Format a single DNS record as zone file line.

        Args:
            record: DNSRecord to format
            default_ttl: Default TTL from zone

        Returns:
            Formatted record line
        """
        # Use record-specific TTL or zone default
        ttl = record.ttl if record.ttl else default_ttl

        # Record name (use @ for zone root)
        name = record.record_name if record.record_name != "@" else "@"

        # Base format: NAME TTL CLASS TYPE VALUE
        parts = [name, str(ttl), "IN", record.record_type.value]

        # Add priority for MX and SRV records
        if record.record_type in [DNSRecordType.MX, DNSRecordType.SRV]:
            parts.append(str(record.priority or 10))

        # Add weight and port for SRV records
        if record.record_type == DNSRecordType.SRV:
            parts.append(str(record.weight or 0))
            parts.append(str(record.port or 0))

        # Add record value
        value = record.record_value

        # Quote TXT records
        if record.record_type == DNSRecordType.TXT:
            if not value.startswith('"'):
                value = f'"{value}"'

        # Ensure trailing dot for FQDN records
        if record.record_type in [DNSRecordType.CNAME, DNSRecordType.MX, DNSRecordType.NS]:
            if not value.endswith('.'):
                value = f"{value}."

        parts.append(value)

        # Format with tabs for alignment
        return "\t".join(parts)

    # ============================================================================
    # File I/O Operations
    # ============================================================================

    async def write_zone_file(self, zone: DNSZone) -> str:
        """
        Write zone file to disk.

        Args:
            zone: DNSZone with loaded records

        Returns:
            File path of written zone file

        Raises:
            CloudManagerException: If file write fails
        """
        # Ensure zones directory exists
        zones_dir = Path(self.COREDNS_ZONES_DIR)
        zones_dir.mkdir(parents=True, exist_ok=True)

        # Generate zone file path
        zone_file_path = zones_dir / f"{zone.zone_name}.zone"

        # Generate zone file content
        content = self.generate_zone_file_content(zone)

        try:
            # Write zone file
            async with aiofiles.open(zone_file_path, 'w') as f:
                await f.write(content)

            # Set file permissions (644 - read for all, write for owner)
            os.chmod(zone_file_path, 0o644)

            return str(zone_file_path)

        except Exception as e:
            raise CloudManagerException(f"Failed to write zone file for {zone.zone_name}: {str(e)}")

    async def write_zone_config(self, zone: DNSZone) -> str:
        """
        Write zone-specific CoreDNS config snippet.

        Args:
            zone: DNSZone

        Returns:
            Config file path

        Raises:
            CloudManagerException: If file write fails
        """
        # Ensure zones directory exists
        zones_dir = Path(self.COREDNS_ZONES_DIR)
        zones_dir.mkdir(parents=True, exist_ok=True)

        # Generate config file path
        config_file_path = zones_dir / f"{zone.zone_name}.conf"

        # Generate CoreDNS config snippet
        content = f"""# Zone configuration for {zone.zone_name}
{zone.zone_name} {{
    file /etc/coredns/zones/{zone.zone_name}.zone
    errors
    log
}}
"""

        try:
            # Write config file
            async with aiofiles.open(config_file_path, 'w') as f:
                await f.write(content)

            # Set file permissions
            os.chmod(config_file_path, 0o644)

            return str(config_file_path)

        except Exception as e:
            raise CloudManagerException(f"Failed to write zone config for {zone.zone_name}: {str(e)}")

    async def delete_zone_files(self, zone_name: str) -> None:
        """
        Delete zone file and config from disk.

        Args:
            zone_name: Zone name
        """
        zones_dir = Path(self.COREDNS_ZONES_DIR)

        zone_file = zones_dir / f"{zone_name}.zone"
        config_file = zones_dir / f"{zone_name}.conf"

        # Delete files if they exist
        if zone_file.exists():
            zone_file.unlink()

        if config_file.exists():
            config_file.unlink()

    # ============================================================================
    # CoreDNS Reload & Health Check
    # ============================================================================

    async def reload_coredns(self, timeout: int = 10) -> Dict[str, Any]:
        """
        Trigger CoreDNS configuration reload via file modification.

        CoreDNS reload plugin (configured with 'reload 10s') automatically
        detects file changes and reloads. This method triggers reload by
        modifying the Corefile to ensure the change is detected.

        Args:
            timeout: Not used (kept for API compatibility)

        Returns:
            Reload response dictionary with success status and message

        Note:
            This method does not raise exceptions. If CoreDNS is unavailable,
            it returns a warning but changes will be picked up by auto-reload
            when CoreDNS comes back online.
        """
        try:
            corefile_path = Path(self.COREDNS_CONFIG_DIR) / "Corefile"
            
            # Touch the Corefile to trigger auto-reload
            # Append a unique timestamp comment to ensure file change is detected
            if corefile_path.exists():
                # Append reload trigger comment with unique timestamp (CoreDNS will detect the change)
                trigger_comment = f"\n# Reload triggered at {datetime.utcnow().isoformat()}\n"
                async with aiofiles.open(corefile_path, 'a') as f:
                    await f.write(trigger_comment)
                
                logger.info(f"CoreDNS reload triggered via file modification. Auto-reload will pick up changes within 10s")
                return {
                    "success": True,
                    "message": "CoreDNS reload triggered (auto-reload will pick up changes within 10s)",
                    "method": "file-based"
                }
            else:
                # Corefile doesn't exist - write it
                await self.write_corefile()
                logger.info("Corefile created, CoreDNS will auto-reload within 10s")
                return {
                    "success": True,
                    "message": "Corefile created, CoreDNS will auto-reload within 10s",
                    "method": "file-based"
                }
                
        except Exception as e:
            # Graceful degradation: log warning but don't fail
            # Auto-reload will pick up changes when CoreDNS is available
            logger.warning(f"Could not trigger CoreDNS reload: {e}. Auto-reload will pick up changes when available.")
            return {
                "success": False,
                "message": f"Could not trigger reload: {str(e)}. Changes will be picked up by auto-reload when CoreDNS is available.",
                "method": "file-based",
                "error": str(e)
            }

    async def _check_http_health(self, timeout: int = 5) -> Dict[str, Any]:
        """
        Check CoreDNS health via HTTP endpoint.

        Args:
            timeout: Request timeout in seconds

        Returns:
            Health status dictionary with is_healthy, status_code, response, and error fields
        """
        logger.debug(f"Checking CoreDNS HTTP health at {self.COREDNS_HEALTH_URL} with timeout {timeout}s")
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(self.COREDNS_HEALTH_URL)

                is_healthy = response.status_code == 200
                if is_healthy:
                    logger.debug(f"CoreDNS HTTP health check successful: {response.status_code}")
                else:
                    logger.warning(f"CoreDNS HTTP health check returned non-200 status: {response.status_code}, response: {response.text[:200]}")

                return {
                    "is_healthy": is_healthy,
                    "status_code": response.status_code,
                    "response": response.text if response.status_code != 200 else "OK"
                }

        except httpx.ConnectError as e:
            logger.warning(f"CoreDNS HTTP health check connection error: {e}. URL: {self.COREDNS_HEALTH_URL}")
            return {
                "is_healthy": False,
                "error": f"Connection error: {str(e)}",
                "error_type": "connection_error"
            }
        except httpx.TimeoutException as e:
            logger.warning(f"CoreDNS HTTP health check timeout after {timeout}s: {e}")
            return {
                "is_healthy": False,
                "error": f"Timeout after {timeout} seconds",
                "error_type": "timeout"
            }
        except Exception as e:
            logger.error(f"CoreDNS HTTP health check unexpected error: {e}", exc_info=True)
            return {
                "is_healthy": False,
                "error": str(e),
                "error_type": "unknown"
            }

    async def check_coredns_health(self, timeout: int = 5) -> Dict[str, Any]:
        """
        Check CoreDNS health status with Docker container status fallback.

        This method first attempts an HTTP health check. If that fails, it falls back
        to checking the Docker container status. This provides more reliable health
        detection when there are network connectivity issues between containers.

        Args:
            timeout: Request timeout in seconds for HTTP check

        Returns:
            Health status dictionary with the following fields:
            - is_healthy: bool - Overall health status
            - status_code: Optional[int] - HTTP status code (if HTTP check succeeded)
            - response: str - Health check response message
            - health_source: str - Source of health check ("http" or "docker")
            - container_status: Optional[str] - Docker container status (if Docker check used)
            - http_check_error: Optional[str] - Error from HTTP check (if it failed)
            - error_type: Optional[str] - Type of HTTP check error (if applicable)
        """
        # Try HTTP health check first
        http_health = await self._check_http_health(timeout)
        
        if http_health.get("is_healthy", False):
            # HTTP check succeeded - return with health_source indicator
            return {
                **http_health,
                "health_source": "http",
                "container_status": None,
                "http_check_error": None
            }
        
        # HTTP check failed - fallback to Docker container status
        logger.info("CoreDNS HTTP health check failed, falling back to Docker container status check")
        container_info = await self.get_coredns_container_info()
        container_status = container_info.get("status")
        
        if container_status == "running":
            # Container is running but HTTP check failed - consider it healthy but degraded
            logger.info(f"CoreDNS container is running (status: {container_status}), considering healthy despite HTTP check failure")
            return {
                "is_healthy": True,  # Consider running container as healthy
                "status_code": None,
                "response": "Container running (HTTP check unavailable)",
                "health_source": "docker",
                "container_status": container_status,
                "http_check_error": http_health.get("error"),
                "error_type": http_health.get("error_type")
            }
        else:
            # Container not running - unhealthy
            logger.warning(f"CoreDNS container status: {container_status}, marking as unhealthy")
            return {
                "is_healthy": False,
                "status_code": None,
                "response": f"Container status: {container_status or 'unknown'}",
                "health_source": "docker",
                "container_status": container_status,
                "http_check_error": http_health.get("error"),
                "error_type": http_health.get("error_type")
            }

    # ============================================================================
    # Full Configuration Generation
    # ============================================================================

    async def regenerate_all_zones(
        self,
        triggered_by_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Regenerate all active zone files and reload CoreDNS.

        Args:
            triggered_by_id: User ID triggering the regeneration

        Returns:
            Regeneration result dictionary
        """
        start_time = datetime.utcnow()

        # Log sync event
        sync_log = DNSSyncLog(
            zone_id=None,
            sync_type=DNSSyncType.FULL_RELOAD,
            status=DNSSyncStatus.PENDING,
            triggered_by_id=triggered_by_id
        )
        sync_log = await self.sync_log_repo.create(sync_log)
        await self.db.commit()

        try:
            # Get all active zones with records
            zones = await self.zone_repo.get_active_zones_for_coredns()

            zones_generated = 0
            errors = []

            # Generate zone files
            for zone in zones:
                try:
                    await self.write_zone_file(zone)
                    await self.write_zone_config(zone)
                    zones_generated += 1
                except Exception as e:
                    errors.append({
                        "zone": zone.zone_name,
                        "error": str(e)
                    })

            # Reload CoreDNS
            reload_result = await self.reload_coredns()

            # Consider operation successful if zones were generated, even if reload trigger failed
            # Files are written, so auto-reload will pick them up when CoreDNS is available
            operation_success = zones_generated > 0 and len(errors) == 0
            
            # Update sync log - mark as success if zones were generated (reload will happen via auto-reload)
            sync_log.status = DNSSyncStatus.SUCCESS if operation_success else DNSSyncStatus.FAILED
            sync_log.completed_at = datetime.utcnow()
            # Only log reload error if it failed AND we had zone generation errors
            if not reload_result["success"] and not operation_success:
                sync_log.error_message = f"Zone generation errors and reload trigger failed: {reload_result.get('error', 'Unknown')}"
            elif not operation_success:
                sync_log.error_message = "Zone generation failed"
            elif not reload_result["success"]:
                # Reload trigger failed but zones were generated - log as warning, not error
                logger.warning(f"Zone files generated successfully but reload trigger failed: {reload_result.get('error', 'Unknown')}. Auto-reload will pick up changes.")
            await self.sync_log_repo.update(sync_log)
            await self.db.commit()

            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return {
                "success": operation_success,  # Success based on zone generation, not reload trigger
                "zones_generated": zones_generated,
                "zones_failed": len(errors),
                "errors": errors,
                "reload_result": reload_result,
                "duration_ms": duration_ms
            }

        except Exception as e:
            # Update sync log as failed
            sync_log.status = DNSSyncStatus.FAILED
            sync_log.completed_at = datetime.utcnow()
            sync_log.error_message = str(e)
            await self.sync_log_repo.update(sync_log)
            await self.db.commit()

            raise CloudManagerException(
                f"Full zone regeneration failed: {str(e)}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    async def sync_zone_to_coredns(
        self,
        zone_id: str,
        triggered_by_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sync a single zone to CoreDNS (write files and reload).

        Args:
            zone_id: Zone ID
            triggered_by_id: User ID triggering the sync

        Returns:
            Sync result dictionary
        """
        # Get zone with records
        zone = await self.zone_repo.get_by_id(zone_id, load_records=True)

        if not zone:
            raise NotFoundException(f"Zone {zone_id} not found")

        # Log sync event
        sync_log = DNSSyncLog(
            zone_id=zone_id,
            sync_type=DNSSyncType.ZONE_UPDATE,
            status=DNSSyncStatus.PENDING,
            triggered_by_id=triggered_by_id
        )
        sync_log = await self.sync_log_repo.create(sync_log)
        await self.db.commit()

        try:
            # Write zone files
            if zone.status == DNSZoneStatus.ACTIVE:
                await self.write_zone_file(zone)
                await self.write_zone_config(zone)
            else:
                # Delete files for non-active zones
                await self.delete_zone_files(zone.zone_name)

            # Reload CoreDNS
            reload_result = await self.reload_coredns()

            # Zone files were written successfully, so operation is successful
            # Reload trigger failure is not critical - auto-reload will pick up changes
            operation_success = True
            
            # Update sync log - mark as success since files were written
            sync_log.status = DNSSyncStatus.SUCCESS
            sync_log.completed_at = datetime.utcnow()
            if not reload_result["success"]:
                # Log reload trigger failure as warning, but don't mark sync as failed
                logger.warning(f"Zone {zone.zone_name} files written successfully but reload trigger failed: {reload_result.get('error', 'Unknown')}. Auto-reload will pick up changes.")
            await self.sync_log_repo.update(sync_log)
            await self.db.commit()

            return {
                "success": operation_success,  # Success based on file write, not reload trigger
                "zone_name": zone.zone_name,
                "reload_result": reload_result
            }

        except Exception as e:
            # Update sync log as failed
            sync_log.status = DNSSyncStatus.FAILED
            sync_log.completed_at = datetime.utcnow()
            sync_log.error_message = str(e)
            await self.sync_log_repo.update(sync_log)
            await self.db.commit()

            raise CloudManagerException(f"Zone sync failed for {zone.zone_name}: {str(e)}")

    # ============================================================================
    # Corefile Management
    # ============================================================================

    async def generate_corefile(self) -> str:
        """
        Generate main Corefile configuration.

        Returns:
            Corefile content
        """
        content = """# CoreDNS Main Configuration
# Auto-generated by CloudManager DNS Management System

# Default forward zone (external DNS)
.:53 {
    forward . 8.8.8.8 8.8.4.4
    cache 30
    errors
    log
}

# Auto-reload configuration on changes
reload 10s

# Health check endpoint
health :8080

# Metrics endpoint (optional)
# prometheus :9153

# Include zone-specific configs
import /etc/coredns/zones/*.conf
"""
        return content

    async def write_corefile(self) -> str:
        """
        Write main Corefile to disk.

        Returns:
            Corefile path

        Raises:
            CloudManagerException: If write fails
        """
        config_dir = Path(self.COREDNS_CONFIG_DIR)
        config_dir.mkdir(parents=True, exist_ok=True)

        corefile_path = config_dir / "Corefile"

        content = await self.generate_corefile()

        try:
            async with aiofiles.open(corefile_path, 'w') as f:
                await f.write(content)

            os.chmod(corefile_path, 0o644)
            return str(corefile_path)

        except Exception as e:
            raise CloudManagerException(f"Failed to write Corefile: {str(e)}")

    # ============================================================================
    # Statistics & Monitoring
    # ============================================================================

    def _format_uptime(self, seconds: int) -> str:
        """
        Format uptime in seconds to human-readable string.

        Args:
            seconds: Uptime in seconds

        Returns:
            Formatted string like "2d 3h 15m" or "45s"
        """
        if seconds < 60:
            return f"{seconds}s"
        
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes}m"
        
        hours = minutes // 60
        minutes = minutes % 60
        if hours < 24:
            return f"{hours}h {minutes}m"
        
        days = hours // 24
        hours = hours % 24
        return f"{days}d {hours}h {minutes}m"

    async def get_coredns_container_info(self) -> Dict[str, Any]:
        """
        Get CoreDNS container information from Docker.

        Returns:
            Dictionary with version, uptime, and container status
        """
        try:
            import docker
            from docker.errors import DockerException, NotFound
            
            docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
            docker_client = docker.DockerClient(base_url=docker_host)
            
            # Get container by name
            container = docker_client.containers.get("cloudmanager-coredns")
            
            # Extract version from image tag (e.g., "coredns/coredns:1.11.1" -> "1.11.1")
            image_tag = container.image.tags[0] if container.image.tags else ""
            version = None
            if ":" in image_tag:
                version = image_tag.split(":")[-1]
            elif image_tag:
                # If no tag, try to get from image ID or use image name
                version = image_tag.split("/")[-1] if "/" in image_tag else image_tag
            
            # Calculate uptime from StartedAt
            uptime_str = None
            uptime_seconds = None
            started_at = None
            
            if container.attrs.get("State") and container.attrs["State"].get("StartedAt"):
                started_at_str = container.attrs["State"]["StartedAt"]
                # Parse ISO format timestamp (Docker returns with 'Z' suffix)
                if started_at_str.endswith("Z"):
                    started_at = datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                else:
                    started_at = datetime.fromisoformat(started_at_str)
                
                # Calculate uptime
                now = datetime.now(started_at.tzinfo) if started_at.tzinfo else datetime.utcnow()
                uptime_seconds = int((now - started_at).total_seconds())
                uptime_str = self._format_uptime(uptime_seconds)
            
            return {
                "version": version,
                "uptime": uptime_str,
                "uptime_seconds": uptime_seconds,
                "status": container.status,
                "started_at": started_at.isoformat() if started_at else None
            }
        except NotFound:
            logger.warning("CoreDNS container 'cloudmanager-coredns' not found")
            return {"version": None, "uptime": None, "error": "Container not found"}
        except DockerException as e:
            logger.warning(f"Docker error getting CoreDNS container info: {e}")
            return {"version": None, "uptime": None, "error": f"Docker error: {str(e)}"}
        except ImportError:
            logger.warning("Docker SDK not available - cannot get container info")
            return {"version": None, "uptime": None, "error": "Docker SDK not installed"}
        except Exception as e:
            logger.warning(f"Could not get CoreDNS container info: {e}", exc_info=True)
            return {"version": None, "uptime": None, "error": str(e)}

    async def get_coredns_status(self) -> Dict[str, Any]:
        """
        Get comprehensive CoreDNS status.

        Returns:
            Status dictionary with health, version, uptime, zones, records, and last reload
        """
        # Check health
        health = await self.check_coredns_health()

        # Get container info (version and uptime)
        container_info = await self.get_coredns_container_info()

        # Get active zones count
        zones = await self.zone_repo.get_active_zones_for_coredns()

        # Count total records
        total_records = 0
        for zone in zones:
            if hasattr(zone, 'records'):
                total_records += len(zone.records)

        # Get recent sync logs
        recent_syncs, _ = await self.sync_log_repo.get_all(skip=0, limit=10)

        # Extract last reload timestamp from sync logs
        # Find most recent successful FULL_RELOAD or ZONE_UPDATE
        last_reload = None
        for log in recent_syncs:
            if log.status == DNSSyncStatus.SUCCESS and log.sync_type in [DNSSyncType.FULL_RELOAD, DNSSyncType.ZONE_UPDATE]:
                last_reload = log.completed_at or log.triggered_at
                break

        return {
            "is_healthy": health.get("is_healthy", False),
            "health_check": health,
            "version": container_info.get("version"),
            "uptime": container_info.get("uptime"),
            "zones_loaded": len(zones),
            "records_total": total_records,
            "last_reload": last_reload.isoformat() if last_reload else None,
            "recent_syncs": [
                {
                    "zone_id": log.zone_id,
                    "sync_type": log.sync_type.value,
                    "status": log.status.value,
                    "triggered_at": log.triggered_at.isoformat()
                }
                for log in recent_syncs
            ]
        }

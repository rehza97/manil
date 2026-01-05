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

from app.modules.hosting.dns_repository import DNSZoneRepository, DNSSyncLogRepository
from app.modules.hosting.models import (
    DNSZone,
    DNSRecord,
    DNSRecordType,
    DNSZoneStatus,
    DNSSyncType,
    DNSSyncStatus
)
from app.core.exceptions import CloudManagerException, NotFoundException


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
        Trigger CoreDNS configuration reload via HTTP API.

        Args:
            timeout: Request timeout in seconds

        Returns:
            Reload response dictionary

        Raises:
            CloudManagerException: If reload fails
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(self.COREDNS_RELOAD_URL)

                if response.status_code == 200:
                    return {
                        "success": True,
                        "message": "CoreDNS reloaded successfully",
                        "status_code": response.status_code
                    }
                else:
                    return {
                        "success": False,
                        "message": f"CoreDNS reload failed with status {response.status_code}",
                        "status_code": response.status_code,
                        "error": response.text
                    }

        except httpx.TimeoutException:
            raise CloudManagerException(f"CoreDNS reload timeout after {timeout} seconds")
        except Exception as e:
            raise CloudManagerException(f"Failed to reload CoreDNS: {str(e)}")

    async def check_coredns_health(self, timeout: int = 5) -> Dict[str, Any]:
        """
        Check CoreDNS health status.

        Args:
            timeout: Request timeout in seconds

        Returns:
            Health status dictionary
        """
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(self.COREDNS_HEALTH_URL)

                return {
                    "is_healthy": response.status_code == 200,
                    "status_code": response.status_code,
                    "response": response.text if response.status_code != 200 else "OK"
                }

        except Exception as e:
            return {
                "is_healthy": False,
                "error": str(e)
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
        sync_log = await self.sync_log_repo.create({
            "zone_id": None,
            "sync_type": DNSSyncType.FULL_RELOAD,
            "status": DNSSyncStatus.PENDING,
            "triggered_by_id": triggered_by_id
        })
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

            # Update sync log
            sync_log.status = DNSSyncStatus.SUCCESS if reload_result["success"] else DNSSyncStatus.FAILED
            sync_log.completed_at = datetime.utcnow()
            sync_log.error_message = reload_result.get("error") if not reload_result["success"] else None
            await self.sync_log_repo.update(sync_log)
            await self.db.commit()

            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return {
                "success": reload_result["success"],
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

            raise CloudManagerException(f"Full zone regeneration failed: {str(e)}")

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
        sync_log = await self.sync_log_repo.create({
            "zone_id": zone_id,
            "sync_type": DNSSyncType.ZONE_UPDATE,
            "status": DNSSyncStatus.PENDING,
            "triggered_by_id": triggered_by_id
        })
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

            # Update sync log
            sync_log.status = DNSSyncStatus.SUCCESS if reload_result["success"] else DNSSyncStatus.FAILED
            sync_log.completed_at = datetime.utcnow()
            sync_log.error_message = reload_result.get("error") if not reload_result["success"] else None
            await self.sync_log_repo.update(sync_log)
            await self.db.commit()

            return {
                "success": reload_result["success"],
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

    async def get_coredns_status(self) -> Dict[str, Any]:
        """
        Get comprehensive CoreDNS status.

        Returns:
            Status dictionary
        """
        # Check health
        health = await self.check_coredns_health()

        # Get active zones count
        zones = await self.zone_repo.get_active_zones_for_coredns()

        # Count total records
        total_records = 0
        for zone in zones:
            if hasattr(zone, 'records'):
                total_records += len(zone.records)

        # Get recent sync logs
        recent_syncs, _ = await self.sync_log_repo.get_all(skip=0, limit=10)

        return {
            "is_healthy": health.get("is_healthy", False),
            "health_check": health,
            "zones_loaded": len(zones),
            "records_total": total_records,
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

"""
DNS Repository Layer.

Handles database operations for DNS zones, records, templates, and sync logs.
"""
from typing import List, Tuple, Optional
from datetime import datetime
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.hosting.models import (
    DNSZone,
    DNSRecord,
    DNSZoneTemplate,
    DNSSyncLog,
    DNSZoneStatus,
    DNSRecordType,
    DNSSyncStatus
)


class DNSZoneRepository:
    """Repository for DNS Zone database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        subscription_id: Optional[str] = None,
        status: Optional[DNSZoneStatus] = None,
        is_system_managed: Optional[bool] = None,
        zone_name: Optional[str] = None
    ) -> Tuple[List[DNSZone], int]:
        """
        Get all DNS zones with filters and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            subscription_id: Filter by VPS subscription ID
            status: Filter by zone status
            is_system_managed: Filter by system-managed flag
            zone_name: Search by zone name (partial match)

        Returns:
            Tuple of (zones list, total count)
        """
        query = select(DNSZone)

        # Apply filters
        filters = []
        if subscription_id:
            filters.append(DNSZone.subscription_id == subscription_id)
        if status:
            filters.append(DNSZone.status == status)
        if is_system_managed is not None:
            filters.append(DNSZone.is_system_managed == is_system_managed)
        if zone_name:
            filters.append(DNSZone.zone_name.ilike(f"%{zone_name}%"))

        if filters:
            query = query.where(and_(*filters))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Apply pagination and ordering
        query = query.offset(skip).limit(limit).order_by(desc(DNSZone.created_at))
        result = await self.db.execute(query)
        zones = result.scalars().all()

        return list(zones), total

    async def get_by_id(
        self,
        zone_id: str,
        load_records: bool = False,
        load_subscription: bool = False
    ) -> Optional[DNSZone]:
        """
        Get zone by ID with optional record loading.

        Args:
            zone_id: Zone ID
            load_records: Whether to eagerly load related records
            load_subscription: Whether to eagerly load subscription

        Returns:
            DNSZone or None if not found
        """
        query = select(DNSZone).where(DNSZone.id == zone_id)

        if load_records:
            query = query.options(selectinload(DNSZone.records))
        if load_subscription:
            query = query.options(selectinload(DNSZone.subscription))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_name(self, zone_name: str) -> Optional[DNSZone]:
        """Get zone by name (exact match)."""
        query = select(DNSZone).where(DNSZone.zone_name == zone_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, zone: DNSZone) -> DNSZone:
        """Create new DNS zone."""
        self.db.add(zone)
        await self.db.flush()
        await self.db.refresh(zone)
        return zone

    async def update(self, zone: DNSZone) -> DNSZone:
        """Update DNS zone."""
        zone.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(zone)
        return zone

    async def delete(self, zone: DNSZone) -> None:
        """Soft delete DNS zone (set status to DELETED)."""
        zone.status = DNSZoneStatus.DELETED
        zone.updated_at = datetime.utcnow()
        await self.db.flush()

    async def hard_delete(self, zone: DNSZone) -> None:
        """Permanently delete DNS zone from database."""
        await self.db.delete(zone)
        await self.db.flush()

    async def get_active_zones_for_coredns(self) -> List[DNSZone]:
        """
        Get all active zones for CoreDNS config generation.
        Eagerly loads records for efficiency.
        """
        query = select(DNSZone).where(
            DNSZone.status == DNSZoneStatus.ACTIVE
        ).options(
            selectinload(DNSZone.records)
        ).order_by(DNSZone.zone_name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def increment_soa_serial(self, zone_id: str) -> int:
        """
        Increment SOA serial number using YYYYMMDDNN format.

        Args:
            zone_id: Zone ID

        Returns:
            New serial number
        """
        zone = await self.get_by_id(zone_id)
        if not zone:
            raise ValueError(f"Zone {zone_id} not found")

        today = datetime.utcnow().strftime("%Y%m%d")
        current_serial = zone.last_updated_serial or 0

        # Check if serial is from today
        if str(current_serial).startswith(today):
            # Same day - increment sequence number
            new_serial = current_serial + 1
        else:
            # New day - reset to 01
            new_serial = int(today + "01")

        zone.last_updated_serial = new_serial
        zone.updated_at = datetime.utcnow()
        await self.update(zone)

        return new_serial

    async def get_by_subscription(
        self,
        subscription_id: str,
        include_deleted: bool = False
    ) -> List[DNSZone]:
        """Get all zones for a subscription."""
        query = select(DNSZone).where(DNSZone.subscription_id == subscription_id)

        if not include_deleted:
            query = query.where(DNSZone.status != DNSZoneStatus.DELETED)

        query = query.order_by(DNSZone.created_at)
        result = await self.db.execute(query)
        return list(result.scalars().all())


class DNSRecordRepository:
    """Repository for DNS Record database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_zone(
        self,
        zone_id: str,
        record_type: Optional[DNSRecordType] = None,
        include_system_managed: bool = True
    ) -> List[DNSRecord]:
        """
        Get all records for a zone.

        Args:
            zone_id: Zone ID
            record_type: Optional filter by record type
            include_system_managed: Whether to include system-managed records

        Returns:
            List of DNS records
        """
        query = select(DNSRecord).where(DNSRecord.zone_id == zone_id)

        if record_type:
            query = query.where(DNSRecord.record_type == record_type)

        if not include_system_managed:
            query = query.where(DNSRecord.is_system_managed == False)

        query = query.order_by(DNSRecord.record_type, DNSRecord.record_name)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, record_id: str) -> Optional[DNSRecord]:
        """Get record by ID."""
        query = select(DNSRecord).where(DNSRecord.id == record_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, record: DNSRecord) -> DNSRecord:
        """Create new DNS record."""
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def create_many(self, records: List[DNSRecord]) -> List[DNSRecord]:
        """Bulk create DNS records."""
        self.db.add_all(records)
        await self.db.flush()

        for record in records:
            await self.db.refresh(record)

        return records

    async def update(self, record: DNSRecord) -> DNSRecord:
        """Update DNS record."""
        record.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def delete(self, record: DNSRecord) -> None:
        """Hard delete DNS record."""
        await self.db.delete(record)
        await self.db.flush()

    async def exists(
        self,
        zone_id: str,
        record_name: str,
        record_type: DNSRecordType,
        exclude_id: Optional[str] = None
    ) -> bool:
        """
        Check if a record with the same name and type exists in the zone.

        Args:
            zone_id: Zone ID
            record_name: Record name
            record_type: Record type
            exclude_id: Optional record ID to exclude from check (for updates)

        Returns:
            True if exists, False otherwise
        """
        query = select(func.count()).select_from(DNSRecord).where(
            and_(
                DNSRecord.zone_id == zone_id,
                DNSRecord.record_name == record_name,
                DNSRecord.record_type == record_type
            )
        )

        if exclude_id:
            query = query.where(DNSRecord.id != exclude_id)

        result = await self.db.execute(query)
        count = result.scalar_one()
        return count > 0

    async def delete_by_zone(self, zone_id: str, exclude_system_managed: bool = True) -> int:
        """
        Delete all records for a zone.

        Args:
            zone_id: Zone ID
            exclude_system_managed: If True, don't delete system-managed records

        Returns:
            Number of records deleted
        """
        query = select(DNSRecord).where(DNSRecord.zone_id == zone_id)

        if exclude_system_managed:
            query = query.where(DNSRecord.is_system_managed == False)

        result = await self.db.execute(query)
        records = result.scalars().all()

        count = 0
        for record in records:
            await self.db.delete(record)
            count += 1

        await self.db.flush()
        return count


class DNSZoneTemplateRepository:
    """Repository for DNS Zone Template database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[DNSZoneTemplate], int]:
        """Get all templates with pagination."""
        query = select(DNSZoneTemplate)

        if is_active is not None:
            query = query.where(DNSZoneTemplate.is_active == is_active)

        # Get count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(DNSZoneTemplate.name)
        result = await self.db.execute(query)
        templates = result.scalars().all()

        return list(templates), total

    async def get_by_id(self, template_id: str) -> Optional[DNSZoneTemplate]:
        """Get template by ID."""
        query = select(DNSZoneTemplate).where(DNSZoneTemplate.id == template_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[DNSZoneTemplate]:
        """Get template by name."""
        query = select(DNSZoneTemplate).where(DNSZoneTemplate.name == name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, template: DNSZoneTemplate) -> DNSZoneTemplate:
        """Create new template."""
        self.db.add(template)
        await self.db.flush()
        await self.db.refresh(template)
        return template

    async def update(self, template: DNSZoneTemplate) -> DNSZoneTemplate:
        """Update template."""
        template.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(template)
        return template

    async def delete(self, template: DNSZoneTemplate) -> None:
        """Delete template."""
        await self.db.delete(template)
        await self.db.flush()


class DNSSyncLogRepository:
    """Repository for DNS Sync Log database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        zone_id: Optional[str] = None,
        status: Optional[DNSSyncStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[DNSSyncLog], int]:
        """Get sync logs with filters and pagination."""
        query = select(DNSSyncLog)

        filters = []
        if zone_id:
            filters.append(DNSSyncLog.zone_id == zone_id)
        if status:
            filters.append(DNSSyncLog.status == status)

        if filters:
            query = query.where(and_(*filters))

        # Get count
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Get paginated results
        query = query.offset(skip).limit(limit).order_by(desc(DNSSyncLog.triggered_at))
        result = await self.db.execute(query)
        logs = result.scalars().all()

        return list(logs), total

    async def create(self, log: DNSSyncLog) -> DNSSyncLog:
        """Create new sync log entry."""
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def update(self, log: DNSSyncLog) -> DNSSyncLog:
        """Update sync log entry."""
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def get_latest_for_zone(self, zone_id: str) -> Optional[DNSSyncLog]:
        """Get the most recent sync log for a zone."""
        query = select(DNSSyncLog).where(
            DNSSyncLog.zone_id == zone_id
        ).order_by(desc(DNSSyncLog.triggered_at)).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_failed_syncs(self, limit: int = 50) -> List[DNSSyncLog]:
        """Get recent failed sync operations."""
        query = select(DNSSyncLog).where(
            DNSSyncLog.status == DNSSyncStatus.FAILED
        ).order_by(desc(DNSSyncLog.triggered_at)).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

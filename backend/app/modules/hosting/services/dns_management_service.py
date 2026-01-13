"""
DNS Management Service.

Core business logic for DNS zone and record management.
Handles validation, CRUD operations, and SOA serial management.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import ipaddress
import re

from app.modules.hosting.dns_repository import (
    DNSZoneRepository,
    DNSRecordRepository,
    DNSZoneTemplateRepository,
    DNSSyncLogRepository
)
from app.modules.hosting.dns_schemas import (
    DNSZoneCreate,
    DNSZoneUpdate,
    DNSRecordCreate,
    DNSRecordUpdate,
    ApplyTemplateRequest
)
from app.modules.hosting.models import (
    DNSZone,
    DNSRecord,
    DNSZoneTemplate,
    DNSSyncLog,
    DNSZoneStatus,
    DNSRecordType,
    DNSZoneType,
    DNSSyncType,
    DNSSyncStatus
)
from app.core.exceptions import BadRequestException, NotFoundException, ConflictException


class DNSManagementService:
    """Service for DNS zone and record management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.zone_repo = DNSZoneRepository(db)
        self.record_repo = DNSRecordRepository(db)
        self.template_repo = DNSZoneTemplateRepository(db)
        self.sync_log_repo = DNSSyncLogRepository(db)

    # ============================================================================
    # DNS Zone Operations
    # ============================================================================

    async def create_zone(
        self,
        zone_data: DNSZoneCreate,
        customer_id: str,
        created_by_id: Optional[str] = None
    ) -> DNSZone:
        """
        Create a new DNS zone.

        Args:
            zone_data: Zone creation data
            customer_id: Customer ID (for ownership validation)
            created_by_id: User ID creating the zone

        Returns:
            Created DNSZone

        Raises:
            ConflictException: If zone name already exists
            NotFoundException: If subscription not found or not owned by customer
            BadRequestException: If validation fails
        """
        # Check if zone name already exists
        existing_zone = await self.zone_repo.get_by_name(zone_data.zone_name)
        if existing_zone:
            raise ConflictException(f"DNS zone '{zone_data.zone_name}' already exists")

        # Verify subscription exists and belongs to customer
        from app.modules.hosting.repository import VPSSubscriptionRepository
        sub_repo = VPSSubscriptionRepository(self.db)
        subscription = await sub_repo.get_by_id(zone_data.subscription_id)

        if not subscription:
            raise NotFoundException(f"VPS subscription {zone_data.subscription_id} not found")

        if subscription.customer_id != customer_id:
            raise NotFoundException(f"VPS subscription {zone_data.subscription_id} not found")

        # Create zone
        zone = DNSZone(
            subscription_id=zone_data.subscription_id,
            zone_name=zone_data.zone_name.lower(),
            zone_type=zone_data.zone_type,
            ttl_default=zone_data.ttl_default,
            notes=zone_data.notes,
            status=DNSZoneStatus.PENDING,
            is_system_managed=False,
            nameservers=["ns1.cloudmanager.local", "ns2.cloudmanager.local"],
            soa_record=self._generate_soa_record(zone_data.zone_name)
        )

        zone = await self.zone_repo.create(zone)
        await self.db.commit()

        # Create default SOA and NS records automatically
        await self._create_default_zone_records(zone, created_by_id)

        # Log sync event
        await self._log_sync_event(
            zone_id=zone.id,
            sync_type=DNSSyncType.ZONE_CREATE,
            triggered_by_id=created_by_id
        )

        return zone

    async def create_system_zone(
        self,
        zone_name: str,
        zone_type: DNSZoneType = DNSZoneType.FORWARD,
        ttl_default: int = 3600,
        notes: Optional[str] = None,
        created_by_id: Optional[str] = None
    ) -> DNSZone:
        """
        Create a system DNS zone (admin-only, no subscription link).

        Args:
            zone_name: Zone name
            zone_type: Zone type
            ttl_default: Default TTL
            notes: Admin notes
            created_by_id: User ID creating the zone

        Returns:
            Created DNSZone

        Raises:
            ConflictException: If zone name already exists
        """
        # Check if zone exists
        existing_zone = await self.zone_repo.get_by_name(zone_name)
        if existing_zone:
            raise ConflictException(f"DNS zone '{zone_name}' already exists")

        # Create system zone
        zone = DNSZone(
            subscription_id=None,
            zone_name=zone_name.lower(),
            zone_type=zone_type,
            ttl_default=ttl_default,
            notes=notes,
            status=DNSZoneStatus.ACTIVE,  # System zones are immediately active
            is_system_managed=True,
            nameservers=["ns1.cloudmanager.local", "ns2.cloudmanager.local"],
            soa_record=self._generate_soa_record(zone_name)
        )

        zone = await self.zone_repo.create(zone)
        await self.db.commit()

        # Create default SOA and NS records automatically
        await self._create_default_zone_records(zone, created_by_id)

        # Log sync event
        await self._log_sync_event(
            zone_id=zone.id,
            sync_type=DNSSyncType.ZONE_CREATE,
            triggered_by_id=created_by_id
        )

        return zone

    async def get_zone(
        self,
        zone_id: str,
        customer_id: Optional[str] = None,
        load_records: bool = False
    ) -> DNSZone:
        """
        Get DNS zone by ID.

        Args:
            zone_id: Zone ID
            customer_id: Customer ID (for ownership validation, None for admin)
            load_records: Whether to load records

        Returns:
            DNSZone

        Raises:
            NotFoundException: If zone not found or not owned by customer
        """
        zone = await self.zone_repo.get_by_id(zone_id, load_records=load_records, load_subscription=True)

        if not zone:
            raise NotFoundException(f"DNS zone {zone_id} not found")

        # Ownership validation (skip for admin)
        if customer_id and zone.subscription:
            if zone.subscription.customer_id != customer_id:
                raise NotFoundException(f"DNS zone {zone_id} not found")

        return zone

    async def list_zones(
        self,
        customer_id: Optional[str] = None,
        subscription_id: Optional[str] = None,
        status: Optional[DNSZoneStatus] = None,
        is_system_managed: Optional[bool] = None,
        zone_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[DNSZone], int]:
        """
        List DNS zones with filters.

        Args:
            customer_id: Filter by customer (via subscription)
            subscription_id: Filter by subscription ID
            status: Filter by status
            is_system_managed: Filter by system-managed flag
            zone_name: Search by zone name
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple of (zones list, total count)
        """
        # If customer_id provided, get their subscriptions first
        if customer_id and not subscription_id:
            from app.modules.hosting.repository import VPSSubscriptionRepository
            sub_repo = VPSSubscriptionRepository(self.db)
            subscriptions, _ = await sub_repo.get_all(customer_id=customer_id, limit=1000)

            # Get zones for all customer subscriptions
            all_zones = []
            total = 0
            for sub in subscriptions:
                zones, count = await self.zone_repo.get_all(
                    skip=skip,
                    limit=limit,
                    subscription_id=sub.id,
                    status=status,
                    is_system_managed=is_system_managed,
                    zone_name=zone_name
                )
                all_zones.extend(zones)
                total += count

            return all_zones[:limit], total

        return await self.zone_repo.get_all(
            skip=skip,
            limit=limit,
            subscription_id=subscription_id,
            status=status,
            is_system_managed=is_system_managed,
            zone_name=zone_name
        )

    async def update_zone(
        self,
        zone_id: str,
        zone_data: DNSZoneUpdate,
        customer_id: Optional[str] = None,
        updated_by_id: Optional[str] = None
    ) -> DNSZone:
        """
        Update DNS zone.

        Args:
            zone_id: Zone ID
            zone_data: Update data
            customer_id: Customer ID (for ownership validation, None for admin)
            updated_by_id: User ID updating the zone

        Returns:
            Updated DNSZone

        Raises:
            NotFoundException: If zone not found or not owned
            BadRequestException: If trying to update system-managed zone without admin
        """
        zone = await self.get_zone(zone_id, customer_id=customer_id)

        # Prevent customers from updating system-managed zones
        if zone.is_system_managed and customer_id:
            raise BadRequestException("Cannot modify system-managed DNS zone")

        # Apply updates
        if zone_data.ttl_default is not None:
            zone.ttl_default = zone_data.ttl_default
        if zone_data.notes is not None:
            zone.notes = zone_data.notes
        if zone_data.status is not None:
            zone.status = zone_data.status

        zone = await self.zone_repo.update(zone)
        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=zone.id,
            sync_type=DNSSyncType.ZONE_UPDATE,
            triggered_by_id=updated_by_id
        )

        return zone

    async def delete_zone(
        self,
        zone_id: str,
        customer_id: Optional[str] = None,
        deleted_by_id: Optional[str] = None,
        hard_delete: bool = False
    ) -> None:
        """
        Delete DNS zone (soft delete by default).

        Args:
            zone_id: Zone ID
            customer_id: Customer ID (for ownership validation, None for admin)
            deleted_by_id: User ID deleting the zone
            hard_delete: If True, permanently delete from database

        Raises:
            NotFoundException: If zone not found or not owned
            BadRequestException: If trying to delete system-managed zone without admin
        """
        zone = await self.get_zone(zone_id, customer_id=customer_id)

        # Prevent customers from deleting system-managed zones
        if zone.is_system_managed and customer_id:
            raise BadRequestException("Cannot delete system-managed DNS zone")

        if hard_delete:
            await self.zone_repo.hard_delete(zone)
        else:
            await self.zone_repo.delete(zone)

        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=zone.id,
            sync_type=DNSSyncType.ZONE_DELETE,
            triggered_by_id=deleted_by_id
        )

    async def activate_zone(
        self,
        zone_id: str,
        activated_by_id: Optional[str] = None
    ) -> DNSZone:
        """
        Activate a pending DNS zone (admin-only).

        Args:
            zone_id: Zone ID
            activated_by_id: User ID activating the zone

        Returns:
            Updated DNSZone

        Raises:
            NotFoundException: If zone not found
            BadRequestException: If zone is not in PENDING status
        """
        zone = await self.get_zone(zone_id)

        if zone.status != DNSZoneStatus.PENDING:
            raise BadRequestException(f"Zone is not pending (current status: {zone.status})")

        zone.status = DNSZoneStatus.ACTIVE
        zone = await self.zone_repo.update(zone)
        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=zone.id,
            sync_type=DNSSyncType.ZONE_UPDATE,
            triggered_by_id=activated_by_id
        )

        return zone

    async def suspend_zone(
        self,
        zone_id: str,
        reason: str,
        suspended_by_id: Optional[str] = None
    ) -> DNSZone:
        """
        Suspend an active DNS zone (admin-only).

        Args:
            zone_id: Zone ID
            reason: Reason for suspension
            suspended_by_id: User ID suspending the zone

        Returns:
            Updated DNSZone

        Raises:
            NotFoundException: If zone not found
            BadRequestException: If zone is not in ACTIVE status
        """
        zone = await self.get_zone(zone_id)

        if zone.status != DNSZoneStatus.ACTIVE:
            raise BadRequestException(f"Zone is not active (current status: {zone.status})")

        zone.status = DNSZoneStatus.SUSPENDED
        zone.notes = f"{zone.notes or ''}\nSuspended: {reason}" if zone.notes else f"Suspended: {reason}"
        zone = await self.zone_repo.update(zone)
        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=zone.id,
            sync_type=DNSSyncType.ZONE_UPDATE,
            triggered_by_id=suspended_by_id
        )

        return zone

    # ============================================================================
    # DNS Record Operations
    # ============================================================================

    async def create_record(
        self,
        zone_id: str,
        record_data: DNSRecordCreate,
        customer_id: Optional[str] = None,
        created_by_id: Optional[str] = None
    ) -> DNSRecord:
        """
        Create a DNS record.

        Args:
            zone_id: Zone ID
            record_data: Record creation data
            customer_id: Customer ID (for ownership validation, None for admin)
            created_by_id: User ID creating the record

        Returns:
            Created DNSRecord

        Raises:
            NotFoundException: If zone not found or not owned
            ConflictException: If record with same name/type exists
            BadRequestException: If validation fails
        """
        # Verify zone exists and ownership
        zone = await self.get_zone(zone_id, customer_id=customer_id)

        # Check for duplicate record
        exists = await self.record_repo.exists(
            zone_id=zone_id,
            record_name=record_data.record_name.lower(),
            record_type=record_data.record_type
        )
        if exists:
            raise ConflictException(
                f"DNS record '{record_data.record_name}' with type '{record_data.record_type}' already exists in zone"
            )

        # CNAME validation: No other records with same name
        if record_data.record_type == DNSRecordType.CNAME:
            existing_records = await self.record_repo.get_by_zone(zone_id)
            for rec in existing_records:
                if rec.record_name == record_data.record_name.lower():
                    raise BadRequestException(
                        f"CNAME record cannot coexist with other records of the same name"
                    )

        # Create record
        record = DNSRecord(
            zone_id=zone_id,
            record_name=record_data.record_name.lower(),
            record_type=record_data.record_type,
            record_value=record_data.record_value,
            ttl=record_data.ttl,
            priority=record_data.priority,
            weight=record_data.weight,
            port=record_data.port,
            is_system_managed=False,
            created_by_id=created_by_id,
            last_modified_by_id=created_by_id
        )

        record = await self.record_repo.create(record)
        await self.db.commit()

        # Increment SOA serial
        await self.zone_repo.increment_soa_serial(zone_id)
        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=zone_id,
            sync_type=DNSSyncType.RECORD_UPDATE,
            triggered_by_id=created_by_id
        )

        return record

    async def create_records_bulk(
        self,
        zone_id: str,
        records_data: List[DNSRecordCreate],
        customer_id: Optional[str] = None,
        created_by_id: Optional[str] = None
    ) -> Tuple[List[DNSRecord], List[Dict[str, Any]]]:
        """
        Bulk create DNS records.

        Args:
            zone_id: Zone ID
            records_data: List of record creation data
            customer_id: Customer ID (for ownership validation)
            created_by_id: User ID creating the records

        Returns:
            Tuple of (created records list, failed records list)
        """
        # Verify zone ownership
        zone = await self.get_zone(zone_id, customer_id=customer_id)

        created = []
        failed = []

        for idx, record_data in enumerate(records_data):
            try:
                record = await self.create_record(
                    zone_id=zone_id,
                    record_data=record_data,
                    customer_id=customer_id,
                    created_by_id=created_by_id
                )
                created.append(record)
            except Exception as e:
                failed.append({
                    "index": idx,
                    "record": record_data.model_dump(),
                    "error": str(e)
                })

        return created, failed

    async def get_record(
        self,
        record_id: str,
        customer_id: Optional[str] = None
    ) -> DNSRecord:
        """
        Get DNS record by ID.

        Args:
            record_id: Record ID
            customer_id: Customer ID (for ownership validation)

        Returns:
            DNSRecord

        Raises:
            NotFoundException: If record not found or not owned
        """
        record = await self.record_repo.get_by_id(record_id)

        if not record:
            raise NotFoundException(f"DNS record {record_id} not found")

        # Verify zone ownership
        if customer_id:
            await self.get_zone(record.zone_id, customer_id=customer_id)

        return record

    async def list_records(
        self,
        zone_id: str,
        record_type: Optional[DNSRecordType] = None,
        include_system_managed: bool = True,
        customer_id: Optional[str] = None
    ) -> List[DNSRecord]:
        """
        List DNS records for a zone.

        Args:
            zone_id: Zone ID
            record_type: Filter by record type
            include_system_managed: Include system-managed records
            customer_id: Customer ID (for ownership validation)

        Returns:
            List of DNSRecord
        """
        # Verify zone ownership
        await self.get_zone(zone_id, customer_id=customer_id)

        return await self.record_repo.get_by_zone(
            zone_id=zone_id,
            record_type=record_type,
            include_system_managed=include_system_managed
        )

    async def update_record(
        self,
        record_id: str,
        record_data: DNSRecordUpdate,
        customer_id: Optional[str] = None,
        updated_by_id: Optional[str] = None
    ) -> DNSRecord:
        """
        Update DNS record.

        Args:
            record_id: Record ID
            record_data: Update data
            customer_id: Customer ID (for ownership validation)
            updated_by_id: User ID updating the record

        Returns:
            Updated DNSRecord

        Raises:
            NotFoundException: If record not found or not owned
            BadRequestException: If trying to update system-managed record
        """
        record = await self.get_record(record_id, customer_id=customer_id)

        # Prevent customers from updating system-managed records
        if record.is_system_managed and customer_id:
            raise BadRequestException("Cannot modify system-managed DNS record")

        # Apply updates
        if record_data.record_value is not None:
            record.record_value = record_data.record_value
        if record_data.ttl is not None:
            record.ttl = record_data.ttl
        if record_data.priority is not None:
            record.priority = record_data.priority
        if record_data.weight is not None:
            record.weight = record_data.weight
        if record_data.port is not None:
            record.port = record_data.port

        record.last_modified_by_id = updated_by_id
        record = await self.record_repo.update(record)
        await self.db.commit()

        # Increment SOA serial
        await self.zone_repo.increment_soa_serial(record.zone_id)
        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=record.zone_id,
            sync_type=DNSSyncType.RECORD_UPDATE,
            triggered_by_id=updated_by_id
        )

        return record

    async def delete_record(
        self,
        record_id: str,
        customer_id: Optional[str] = None,
        deleted_by_id: Optional[str] = None
    ) -> None:
        """
        Delete DNS record.

        Args:
            record_id: Record ID
            customer_id: Customer ID (for ownership validation)
            deleted_by_id: User ID deleting the record

        Raises:
            NotFoundException: If record not found or not owned
            BadRequestException: If trying to delete system-managed record
        """
        record = await self.get_record(record_id, customer_id=customer_id)

        # Prevent customers from deleting system-managed records
        if record.is_system_managed and customer_id:
            raise BadRequestException("Cannot delete system-managed DNS record")

        zone_id = record.zone_id

        await self.record_repo.delete(record)
        await self.db.commit()

        # Increment SOA serial
        await self.zone_repo.increment_soa_serial(zone_id)
        await self.db.commit()

        # Log sync event
        await self._log_sync_event(
            zone_id=zone_id,
            sync_type=DNSSyncType.RECORD_UPDATE,
            triggered_by_id=deleted_by_id
        )

    # ============================================================================
    # Template Operations
    # ============================================================================

    async def apply_template(
        self,
        zone_id: str,
        template_request: ApplyTemplateRequest,
        customer_id: Optional[str] = None,
        applied_by_id: Optional[str] = None
    ) -> Tuple[List[DNSRecord], List[Dict[str, Any]]]:
        """
        Apply a DNS zone template to a zone.

        Args:
            zone_id: Zone ID
            template_request: Template application request
            customer_id: Customer ID (for ownership validation)
            applied_by_id: User ID applying the template

        Returns:
            Tuple of (created records list, failed records list)

        Raises:
            NotFoundException: If zone or template not found
        """
        # Verify zone ownership
        zone = await self.get_zone(zone_id, customer_id=customer_id, load_records=False)

        # Get template
        template = await self.template_repo.get_by_id(template_request.template_id)
        if not template or not template.is_active:
            raise NotFoundException(f"Template {template_request.template_id} not found")

        # Replace existing records if requested
        if template_request.replace_existing:
            deleted_count = await self.record_repo.delete_by_zone(
                zone_id=zone_id,
                exclude_system_managed=True
            )
            await self.db.commit()

        # Get VPS IP from subscription for variable substitution
        vps_ip = None
        if zone.subscription and zone.subscription.container:
            vps_ip = zone.subscription.container.ip_address

        # Process template records
        records_to_create = []
        for template_record in template.record_definitions:
            # Substitute variables
            record_name = template_record.get("record_name", "")
            record_value = template_record.get("record_value", "")

            # Apply custom variables from request
            for var_name, var_value in template_request.variables.items():
                record_name = record_name.replace(f"{{{var_name}}}", var_value)
                record_value = record_value.replace(f"{{{var_name}}}", var_value)

            # Apply system variables
            if vps_ip:
                record_value = record_value.replace("{VPS_IP}", vps_ip)
            record_value = record_value.replace("{ZONE_NAME}", zone.zone_name)

            # Create record data
            record_create = DNSRecordCreate(
                record_name=record_name,
                record_type=DNSRecordType(template_record["record_type"]),
                record_value=record_value,
                ttl=template_record.get("ttl"),
                priority=template_record.get("priority")
            )
            records_to_create.append(record_create)

        # Bulk create records
        created, failed = await self.create_records_bulk(
            zone_id=zone_id,
            records_data=records_to_create,
            customer_id=customer_id,
            created_by_id=applied_by_id
        )

        return created, failed

    # ============================================================================
    # Utility Methods
    # ============================================================================

    def _generate_soa_record(self, zone_name: str) -> Dict[str, Any]:
        """
        Generate default SOA record for a zone.

        Args:
            zone_name: Zone name

        Returns:
            SOA record dictionary
        """
        today = datetime.utcnow().strftime("%Y%m%d")
        serial = int(today + "01")

        return {
            "mname": f"ns1.{zone_name}",
            "rname": f"admin.{zone_name}",
            "serial": serial,
            "refresh": 7200,
            "retry": 3600,
            "expire": 1209600,
            "minimum": 3600
        }

    async def _create_default_zone_records(
        self,
        zone: DNSZone,
        created_by_id: Optional[str] = None
    ) -> None:
        """
        Create default SOA and NS records for a zone.

        Args:
            zone: DNSZone instance
            created_by_id: User ID creating the records
        """
        soa = zone.soa_record or {}
        soa_mname = soa.get("mname", f"ns1.{zone.zone_name}")
        soa_rname = soa.get("rname", f"admin.{zone.zone_name}")
        soa_serial = soa.get("serial", 1)
        soa_refresh = soa.get("refresh", 7200)
        soa_retry = soa.get("retry", 3600)
        soa_expire = soa.get("expire", 1209600)
        soa_minimum = soa.get("minimum", 3600)

        # Format SOA record value: "mname rname serial refresh retry expire minimum"
        soa_value = f"{soa_mname} {soa_rname} {soa_serial} {soa_refresh} {soa_retry} {soa_expire} {soa_minimum}"

        # Create SOA record
        soa_record = DNSRecord(
            zone_id=zone.id,
            record_name="@",
            record_type=DNSRecordType.SOA,
            record_value=soa_value,
            ttl=zone.ttl_default,
            is_system_managed=True,
            created_by_id=created_by_id,
            last_modified_by_id=created_by_id
        )
        await self.record_repo.create(soa_record)

        # Create NS records for each nameserver
        nameservers = zone.nameservers or ["ns1.cloudmanager.local", "ns2.cloudmanager.local"]
        for ns in nameservers:
            ns_record = DNSRecord(
                zone_id=zone.id,
                record_name="@",
                record_type=DNSRecordType.NS,
                record_value=ns,
                ttl=zone.ttl_default,
                is_system_managed=True,
                created_by_id=created_by_id,
                last_modified_by_id=created_by_id
            )
            await self.record_repo.create(ns_record)

        await self.db.commit()

    async def _log_sync_event(
        self,
        zone_id: Optional[str],
        sync_type: DNSSyncType,
        triggered_by_id: Optional[str] = None,
        status: DNSSyncStatus = DNSSyncStatus.PENDING,
        error_message: Optional[str] = None
    ) -> DNSSyncLog:
        """
        Log a DNS sync event.

        Args:
            zone_id: Zone ID (optional for full reloads)
            sync_type: Type of sync operation
            triggered_by_id: User ID triggering the sync
            status: Sync status
            error_message: Error message if failed

        Returns:
            Created DNSSyncLog
        """
        sync_log = DNSSyncLog(
            zone_id=zone_id,
            sync_type=sync_type,
            status=status,
            error_message=error_message,
            triggered_by_id=triggered_by_id
        )

        sync_log = await self.sync_log_repo.create(sync_log)
        await self.db.commit()
        return sync_log

    async def get_zone_statistics(
        self,
        customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get DNS zone statistics.

        Args:
            customer_id: Customer ID (for customer-specific stats)

        Returns:
            Statistics dictionary
        """
        # Get all zones
        zones, total = await self.list_zones(
            customer_id=customer_id,
            skip=0,
            limit=10000
        )

        stats = {
            "total_zones": total,
            "active_zones": sum(1 for z in zones if z.status == DNSZoneStatus.ACTIVE),
            "pending_zones": sum(1 for z in zones if z.status == DNSZoneStatus.PENDING),
            "suspended_zones": sum(1 for z in zones if z.status == DNSZoneStatus.SUSPENDED),
            "deleted_zones": sum(1 for z in zones if z.status == DNSZoneStatus.DELETED),
            "total_records": 0,
            "zones_by_subscription": {}
        }

        # Count records
        for zone in zones:
            records = await self.record_repo.get_by_zone(zone.id)
            stats["total_records"] += len(records)

            if zone.subscription_id:
                if zone.subscription_id not in stats["zones_by_subscription"]:
                    stats["zones_by_subscription"][zone.subscription_id] = 0
                stats["zones_by_subscription"][zone.subscription_id] += 1

        return stats

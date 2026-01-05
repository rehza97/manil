"""
DNS Management Client API Router.

Customer-facing endpoints for DNS zone and record management.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.hosting.dns_schemas import (
    DNSZoneCreate,
    DNSZoneUpdate,
    DNSZoneResponse,
    DNSZoneDetailResponse,
    DNSZoneListResponse,
    DNSRecordCreate,
    DNSRecordUpdate,
    DNSRecordResponse,
    DNSRecordListResponse,
    BulkRecordCreate,
    BulkRecordResponse,
    ApplyTemplateRequest,
    DNSZoneTemplateResponse,
    DNSZoneStatistics,
    DNSRecordStatistics
)
from app.modules.hosting.models import DNSZoneStatus, DNSRecordType
from app.modules.hosting.services.dns_management_service import DNSManagementService
from app.modules.hosting.services.coredns_config_service import CoreDNSConfigService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hosting/dns", tags=["DNS Management (Customer)"])


# ============================================================================
# DNS Zone Endpoints (Customer)
# ============================================================================

@router.get("/zones", response_model=DNSZoneListResponse)
async def list_zones(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    subscription_id: Optional[str] = Query(None, description="Filter by VPS subscription ID"),
    status: Optional[DNSZoneStatus] = Query(None, description="Filter by zone status"),
    zone_name: Optional[str] = Query(None, description="Search by zone name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_VIEW)),
):
    """
    List all DNS zones owned by the current customer.

    Returns paginated list of DNS zones with filters.
    """
    service = DNSManagementService(db)

    zones, total = await service.list_zones(
        customer_id=current_user.id,
        subscription_id=subscription_id,
        status=status,
        zone_name=zone_name,
        skip=skip,
        limit=limit
    )

    # Calculate pagination
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    page = (skip // limit) + 1 if limit > 0 else 1

    return DNSZoneListResponse(
        items=[DNSZoneResponse.model_validate(z) for z in zones],
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/zones/{zone_id}", response_model=DNSZoneDetailResponse)
async def get_zone(
    zone_id: str = Path(..., description="DNS Zone ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_VIEW)),
):
    """
    Get detailed information about a specific DNS zone.

    Includes all DNS records for the zone.
    """
    service = DNSManagementService(db)

    zone = await service.get_zone(
        zone_id=zone_id,
        customer_id=current_user.id,
        load_records=True
    )

    response = DNSZoneDetailResponse.model_validate(zone)
    response.record_count = len(zone.records) if hasattr(zone, 'records') else 0

    return response


@router.post("/zones", response_model=DNSZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: DNSZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Create a new DNS zone.

    The zone will be created with PENDING status and requires admin activation.
    """
    service = DNSManagementService(db)

    zone = await service.create_zone(
        zone_data=zone_data,
        customer_id=current_user.id,
        created_by_id=current_user.id
    )

    logger.info(f"DNS zone created: {zone.zone_name} (ID: {zone.id}) by user {current_user.id}")

    return DNSZoneResponse.model_validate(zone)


@router.put("/zones/{zone_id}", response_model=DNSZoneResponse)
async def update_zone(
    zone_id: str = Path(..., description="DNS Zone ID"),
    zone_data: DNSZoneUpdate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Update DNS zone settings.

    Customers can update TTL and notes. Status changes are admin-only.
    """
    service = DNSManagementService(db)

    zone = await service.update_zone(
        zone_id=zone_id,
        zone_data=zone_data,
        customer_id=current_user.id,
        updated_by_id=current_user.id
    )

    logger.info(f"DNS zone updated: {zone.zone_name} (ID: {zone.id}) by user {current_user.id}")

    return DNSZoneResponse.model_validate(zone)


@router.delete("/zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: str = Path(..., description="DNS Zone ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Delete DNS zone (soft delete - sets status to DELETED).

    All associated DNS records will be removed from CoreDNS.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    # Get zone name before deletion
    zone = await service.get_zone(zone_id=zone_id, customer_id=current_user.id)
    zone_name = zone.zone_name

    # Soft delete zone
    await service.delete_zone(
        zone_id=zone_id,
        customer_id=current_user.id,
        deleted_by_id=current_user.id,
        hard_delete=False
    )

    # Remove from CoreDNS
    try:
        await coredns_service.delete_zone_files(zone_name)
        await coredns_service.reload_coredns()
    except Exception as e:
        logger.error(f"Failed to sync zone deletion to CoreDNS: {str(e)}")

    logger.info(f"DNS zone deleted: {zone_name} (ID: {zone_id}) by user {current_user.id}")


# ============================================================================
# DNS Record Endpoints (Customer)
# ============================================================================

@router.get("/zones/{zone_id}/records", response_model=DNSRecordListResponse)
async def list_records(
    zone_id: str = Path(..., description="DNS Zone ID"),
    record_type: Optional[DNSRecordType] = Query(None, description="Filter by record type"),
    include_system: bool = Query(True, description="Include system-managed records"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_VIEW)),
):
    """
    List all DNS records for a zone.

    Optionally filter by record type.
    """
    service = DNSManagementService(db)

    records = await service.list_records(
        zone_id=zone_id,
        record_type=record_type,
        include_system_managed=include_system,
        customer_id=current_user.id
    )

    return DNSRecordListResponse(
        items=[DNSRecordResponse.model_validate(r) for r in records],
        total=len(records)
    )


@router.get("/records/{record_id}", response_model=DNSRecordResponse)
async def get_record(
    record_id: str = Path(..., description="DNS Record ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_VIEW)),
):
    """Get detailed information about a specific DNS record."""
    service = DNSManagementService(db)

    record = await service.get_record(
        record_id=record_id,
        customer_id=current_user.id
    )

    return DNSRecordResponse.model_validate(record)


@router.post("/zones/{zone_id}/records", response_model=DNSRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    zone_id: str = Path(..., description="DNS Zone ID"),
    record_data: DNSRecordCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Create a new DNS record in the zone.

    The record will be validated and added to CoreDNS configuration.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    record = await service.create_record(
        zone_id=zone_id,
        record_data=record_data,
        customer_id=current_user.id,
        created_by_id=current_user.id
    )

    # Sync to CoreDNS
    try:
        await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync record to CoreDNS: {str(e)}")

    logger.info(
        f"DNS record created: {record.record_name} {record.record_type.value} "
        f"in zone {zone_id} by user {current_user.id}"
    )

    return DNSRecordResponse.model_validate(record)


@router.post("/zones/{zone_id}/records/bulk", response_model=BulkRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_records_bulk(
    zone_id: str = Path(..., description="DNS Zone ID"),
    bulk_data: BulkRecordCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Bulk create multiple DNS records at once.

    Returns list of successfully created records and any failures.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    created, failed = await service.create_records_bulk(
        zone_id=zone_id,
        records_data=bulk_data.records,
        customer_id=current_user.id,
        created_by_id=current_user.id
    )

    # Sync to CoreDNS if any records were created
    if created:
        try:
            await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
        except Exception as e:
            logger.error(f"Failed to sync bulk records to CoreDNS: {str(e)}")

    logger.info(
        f"Bulk DNS record creation: {len(created)} succeeded, {len(failed)} failed "
        f"in zone {zone_id} by user {current_user.id}"
    )

    return BulkRecordResponse(
        created=[DNSRecordResponse.model_validate(r) for r in created],
        failed=failed,
        success_count=len(created),
        failure_count=len(failed)
    )


@router.put("/records/{record_id}", response_model=DNSRecordResponse)
async def update_record(
    record_id: str = Path(..., description="DNS Record ID"),
    record_data: DNSRecordUpdate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Update an existing DNS record.

    System-managed records cannot be modified by customers.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    record = await service.update_record(
        record_id=record_id,
        record_data=record_data,
        customer_id=current_user.id,
        updated_by_id=current_user.id
    )

    # Sync to CoreDNS
    try:
        await coredns_service.sync_zone_to_coredns(record.zone_id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync record update to CoreDNS: {str(e)}")

    logger.info(f"DNS record updated: {record_id} by user {current_user.id}")

    return DNSRecordResponse.model_validate(record)


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: str = Path(..., description="DNS Record ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Delete a DNS record.

    System-managed records cannot be deleted by customers.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    # Get record info before deletion
    record = await service.get_record(record_id=record_id, customer_id=current_user.id)
    zone_id = record.zone_id

    # Delete record
    await service.delete_record(
        record_id=record_id,
        customer_id=current_user.id,
        deleted_by_id=current_user.id
    )

    # Sync to CoreDNS
    try:
        await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync record deletion to CoreDNS: {str(e)}")

    logger.info(f"DNS record deleted: {record_id} by user {current_user.id}")


# ============================================================================
# DNS Template Endpoints (Customer)
# ============================================================================

@router.get("/templates", response_model=List[DNSZoneTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_VIEW)),
):
    """
    List all available DNS zone templates.

    Templates provide pre-configured record sets for common use cases.
    """
    service = DNSManagementService(db)
    templates, _ = await service.template_repo.get_all(is_active=True, skip=0, limit=100)

    return [DNSZoneTemplateResponse.model_validate(t) for t in templates]


@router.post("/zones/{zone_id}/apply-template", response_model=BulkRecordResponse)
async def apply_template(
    zone_id: str = Path(..., description="DNS Zone ID"),
    template_request: ApplyTemplateRequest = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_MANAGE)),
):
    """
    Apply a DNS zone template to a zone.

    Optionally replaces existing records with template records.
    Supports variable substitution (e.g., {VPS_IP}, {ZONE_NAME}).
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    created, failed = await service.apply_template(
        zone_id=zone_id,
        template_request=template_request,
        customer_id=current_user.id,
        applied_by_id=current_user.id
    )

    # Sync to CoreDNS
    if created:
        try:
            await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
        except Exception as e:
            logger.error(f"Failed to sync template application to CoreDNS: {str(e)}")

    logger.info(
        f"Template applied to zone {zone_id}: {len(created)} records created, "
        f"{len(failed)} failed by user {current_user.id}"
    )

    return BulkRecordResponse(
        created=[DNSRecordResponse.model_validate(r) for r in created],
        failed=failed,
        success_count=len(created),
        failure_count=len(failed)
    )


# ============================================================================
# Statistics Endpoints (Customer)
# ============================================================================

@router.get("/statistics/zones", response_model=DNSZoneStatistics)
async def get_zone_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_VIEW)),
):
    """Get DNS zone statistics for the current customer."""
    service = DNSManagementService(db)
    stats = await service.get_zone_statistics(customer_id=current_user.id)

    return DNSZoneStatistics(**stats)

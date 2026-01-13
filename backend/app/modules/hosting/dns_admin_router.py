"""
DNS Management Admin API Router.

Administrative endpoints for DNS zone and record management.
Includes CoreDNS management, system zones, and template administration.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, status, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.hosting.dns_schemas import (
    SystemDNSZoneCreate,
    DNSZoneUpdate,
    DNSZoneResponse,
    DNSZoneDetailResponse,
    DNSZoneListResponse,
    DNSRecordCreate,
    DNSRecordUpdate,
    DNSRecordResponse,
    DNSZoneTemplateCreate,
    DNSZoneTemplateUpdate,
    DNSZoneTemplateResponse,
    CoreDNSStatusResponse,
    CoreDNSReloadRequest,
    CoreDNSReloadResponse,
    DNSSyncLogResponse,
    DNSSyncLogListResponse,
    DNSZoneStatistics,
    DNSRecordStatistics
)
from app.modules.hosting.models import (
    DNSZoneStatus,
    DNSRecordType,
    DNSZoneType,
    DNSSyncStatus,
    DNSZoneTemplate
)
from app.modules.hosting.services.dns_management_service import DNSManagementService
from app.modules.hosting.services.coredns_config_service import CoreDNSConfigService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hosting/admin/dns", tags=["DNS Management (Admin)"])


# ============================================================================
# DNS Zone Admin Endpoints
# ============================================================================

@router.get("/zones", response_model=DNSZoneListResponse)
async def list_all_zones(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    subscription_id: Optional[str] = Query(None, description="Filter by VPS subscription ID"),
    status: Optional[DNSZoneStatus] = Query(None, description="Filter by zone status"),
    is_system_managed: Optional[bool] = Query(None, description="Filter by system-managed flag"),
    zone_name: Optional[str] = Query(None, description="Search by zone name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    List all DNS zones (admin view - all customers).

    Supports filtering by subscription, status, and system-managed flag.
    """
    service = DNSManagementService(db)

    zones, total = await service.list_zones(
        customer_id=None,  # Admin sees all zones
        subscription_id=subscription_id,
        status=status,
        is_system_managed=is_system_managed,
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
async def get_zone_admin(
    zone_id: str = Path(..., description="DNS Zone ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """Get detailed information about any DNS zone (admin view)."""
    service = DNSManagementService(db)

    zone = await service.get_zone(
        zone_id=zone_id,
        customer_id=None,  # Admin can view any zone
        load_records=True
    )

    response = DNSZoneDetailResponse.model_validate(zone)
    response.record_count = len(zone.records) if hasattr(zone, 'records') else 0

    return response


@router.post("/zones/system", response_model=DNSZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_system_zone(
    zone_data: SystemDNSZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Create a system DNS zone (admin-only, no subscription link).

    System zones are immediately activated and used for infrastructure DNS.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    zone = await service.create_system_zone(
        zone_name=zone_data.zone_name,
        zone_type=zone_data.zone_type,
        ttl_default=zone_data.ttl_default,
        notes=zone_data.notes,
        created_by_id=current_user.id
    )

    # Sync to CoreDNS immediately
    try:
        await coredns_service.sync_zone_to_coredns(zone.id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync system zone to CoreDNS: {str(e)}")

    logger.info(f"System DNS zone created: {zone.zone_name} (ID: {zone.id}) by admin {current_user.id}")

    return DNSZoneResponse.model_validate(zone)


@router.put("/zones/{zone_id}", response_model=DNSZoneResponse)
async def update_zone_admin(
    zone_id: str = Path(..., description="DNS Zone ID"),
    zone_data: DNSZoneUpdate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Update any DNS zone (admin view).

    Admins can modify all zone properties including status.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    zone = await service.update_zone(
        zone_id=zone_id,
        zone_data=zone_data,
        customer_id=None,  # Admin can update any zone
        updated_by_id=current_user.id
    )

    # Sync to CoreDNS if status changed
    if zone_data.status is not None:
        try:
            await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
        except Exception as e:
            logger.error(f"Failed to sync zone update to CoreDNS: {str(e)}")

    logger.info(f"DNS zone updated (admin): {zone.zone_name} (ID: {zone.id}) by admin {current_user.id}")

    return DNSZoneResponse.model_validate(zone)


@router.post("/zones/{zone_id}/activate", response_model=DNSZoneResponse)
async def activate_zone(
    zone_id: str = Path(..., description="DNS Zone ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Activate a pending DNS zone (admin-only).

    Changes status from PENDING to ACTIVE and syncs to CoreDNS.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    zone = await service.activate_zone(
        zone_id=zone_id,
        activated_by_id=current_user.id
    )

    # Sync to CoreDNS
    try:
        await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync zone activation to CoreDNS: {str(e)}")

    logger.info(f"DNS zone activated: {zone.zone_name} (ID: {zone.id}) by admin {current_user.id}")

    return DNSZoneResponse.model_validate(zone)


@router.post("/zones/{zone_id}/suspend", response_model=DNSZoneResponse)
async def suspend_zone(
    zone_id: str = Path(..., description="DNS Zone ID"),
    reason: str = Body(..., embed=True, description="Reason for suspension"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Suspend an active DNS zone (admin-only).

    Changes status from ACTIVE to SUSPENDED and removes from CoreDNS.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    zone = await service.suspend_zone(
        zone_id=zone_id,
        reason=reason,
        suspended_by_id=current_user.id
    )

    # Sync to CoreDNS (suspended zones should not be served)
    try:
        await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync zone suspension to CoreDNS: {str(e)}")

    logger.info(f"DNS zone suspended: {zone.zone_name} (ID: {zone.id}) by admin {current_user.id}")

    return DNSZoneResponse.model_validate(zone)


@router.delete("/zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone_admin(
    zone_id: str = Path(..., description="DNS Zone ID"),
    hard_delete: bool = Query(False, description="Permanently delete from database"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Delete any DNS zone (admin view).

    Supports both soft delete (status=DELETED) and hard delete (permanent removal).
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    # Get zone name before deletion
    zone = await service.get_zone(zone_id=zone_id, customer_id=None)
    zone_name = zone.zone_name

    # Delete zone
    await service.delete_zone(
        zone_id=zone_id,
        customer_id=None,  # Admin can delete any zone
        deleted_by_id=current_user.id,
        hard_delete=hard_delete
    )

    # Remove from CoreDNS
    try:
        await coredns_service.delete_zone_files(zone_name)
        await coredns_service.reload_coredns()
    except Exception as e:
        logger.error(f"Failed to sync zone deletion to CoreDNS: {str(e)}")

    delete_type = "hard" if hard_delete else "soft"
    logger.info(f"DNS zone {delete_type} deleted: {zone_name} (ID: {zone_id}) by admin {current_user.id}")


# ============================================================================
# DNS Record Admin Endpoints
# ============================================================================

@router.post("/zones/{zone_id}/records", response_model=DNSRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record_admin(
    zone_id: str = Path(..., description="DNS Zone ID"),
    record_data: DNSRecordCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Create a DNS record in any zone (admin view).

    Can create system-managed records.
    """
    service = DNSManagementService(db)
    coredns_service = CoreDNSConfigService(db)

    record = await service.create_record(
        zone_id=zone_id,
        record_data=record_data,
        customer_id=None,  # Admin can create in any zone
        created_by_id=current_user.id
    )

    # Sync to CoreDNS
    try:
        await coredns_service.sync_zone_to_coredns(zone_id, triggered_by_id=current_user.id)
    except Exception as e:
        logger.error(f"Failed to sync record to CoreDNS: {str(e)}")

    logger.info(
        f"DNS record created (admin): {record.record_name} {record.record_type.value} "
        f"in zone {zone_id} by admin {current_user.id}"
    )

    return DNSRecordResponse.model_validate(record)


# ============================================================================
# CoreDNS Management Endpoints
# ============================================================================

@router.get("/coredns/status", response_model=CoreDNSStatusResponse)
async def get_coredns_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Get CoreDNS server health status and statistics.

    Includes zone count, record count, and recent sync operations.
    """
    coredns_service = CoreDNSConfigService(db)

    status_info = await coredns_service.get_coredns_status()

    return CoreDNSStatusResponse(
        is_healthy=status_info.get("is_healthy", False),
        version=None,  # TODO: Extract from CoreDNS API if available
        zones_loaded=status_info.get("zones_loaded", 0),
        records_total=status_info.get("records_total", 0),
        last_reload=None,  # TODO: Track last reload timestamp
        uptime=None  # TODO: Get from CoreDNS metrics
    )


@router.post("/coredns/reload", response_model=CoreDNSReloadResponse)
async def reload_coredns(
    reload_request: CoreDNSReloadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Manually trigger CoreDNS configuration reload.

    Forces CoreDNS to re-read all zone files and reload configuration.
    """
    logger.info(f"[DNS Admin] reload_coredns endpoint called by user {current_user.id}")
    logger.info(f"[DNS Admin] Request body: force={reload_request.force}")
    
    try:
        coredns_service = CoreDNSConfigService(db)

        import time
        start_time = time.time()

        reload_result = await coredns_service.reload_coredns()

        reload_time_ms = int((time.time() - start_time) * 1000)

        logger.info(f"CoreDNS reload triggered by admin {current_user.id}, success: {reload_result.get('success', False)}")

        response = CoreDNSReloadResponse(
            success=reload_result.get("success", False),
            message=reload_result.get("message", "Unknown"),
            zones_reloaded=0,  # TODO: Track from reload result
            reload_time_ms=reload_time_ms
        )
        logger.info(f"[DNS Admin] reload_coredns endpoint completed successfully")
        return response
    except Exception as e:
        logger.error(f"[DNS Admin] Error in reload_coredns endpoint: {e}", exc_info=True)
        raise


@router.post("/coredns/regenerate-config", response_model=CoreDNSReloadResponse)
async def regenerate_all_zones(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Regenerate all zone files and reload CoreDNS.

    This is a full configuration regeneration from the database.
    Use this to fix configuration drift or after bulk changes.
    """
    logger.info(f"[DNS Admin] regenerate_all_zones endpoint called by user {current_user.id}")
    
    try:
        coredns_service = CoreDNSConfigService(db)

        result = await coredns_service.regenerate_all_zones(triggered_by_id=current_user.id)

        logger.info(
            f"Full DNS config regeneration by admin {current_user.id}: "
            f"{result['zones_generated']} zones, {result['zones_failed']} errors"
        )

        response = CoreDNSReloadResponse(
            success=result.get("success", False),
            message=f"Generated {result['zones_generated']} zones, {result['zones_failed']} failed",
            zones_reloaded=result.get("zones_generated", 0),
            reload_time_ms=result.get("duration_ms", 0)
        )
        logger.info(f"[DNS Admin] regenerate_all_zones endpoint completed successfully")
        return response
    except Exception as e:
        logger.error(f"[DNS Admin] Error in regenerate_all_zones endpoint: {e}", exc_info=True)
        raise


# ============================================================================
# DNS Sync Log Endpoints
# ============================================================================

@router.get("/sync-logs", response_model=DNSSyncLogListResponse)
async def get_sync_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=500, description="Maximum records to return"),
    zone_id: Optional[str] = Query(None, description="Filter by zone ID"),
    status: Optional[DNSSyncStatus] = Query(None, description="Filter by sync status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Get DNS sync operation logs (admin-only).

    Audit trail of all DNS configuration sync operations to CoreDNS.
    """
    service = DNSManagementService(db)

    logs, total = await service.sync_log_repo.get_all(
        zone_id=zone_id,
        status=status,
        skip=skip,
        limit=limit
    )

    # Calculate pagination
    total_pages = (total + limit - 1) // limit if total > 0 else 0
    page = (skip // limit) + 1 if limit > 0 else 1

    return DNSSyncLogListResponse(
        items=[DNSSyncLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


# ============================================================================
# DNS Template Management (Admin)
# ============================================================================

@router.get("/templates", response_model=List[DNSZoneTemplateResponse])
async def list_all_templates(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """List all DNS zone templates (admin view - includes inactive)."""
    service = DNSManagementService(db)

    templates, _ = await service.template_repo.get_all(
        is_active=is_active,
        skip=skip,
        limit=limit
    )

    return [DNSZoneTemplateResponse.model_validate(t) for t in templates]


@router.get("/templates/{template_id}", response_model=DNSZoneTemplateResponse)
async def get_template(
    template_id: str = Path(..., description="Template ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """Get detailed information about a DNS zone template."""
    service = DNSManagementService(db)

    template = await service.template_repo.get_by_id(template_id)

    if not template:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Template {template_id} not found")

    return DNSZoneTemplateResponse.model_validate(template)


@router.post("/templates", response_model=DNSZoneTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: DNSZoneTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """
    Create a new DNS zone template (admin-only).

    Templates allow quick application of common DNS record configurations.
    """
    service = DNSManagementService(db)

    # Check for duplicate name
    existing = await service.template_repo.get_by_name(template_data.name)
    if existing:
        from app.core.exceptions import ConflictException
        raise ConflictException(f"Template with name '{template_data.name}' already exists")

    template = DNSZoneTemplate(
        name=template_data.name,
        template_type=template_data.template_type,
        description=template_data.description,
        record_definitions=[r.model_dump() for r in template_data.record_definitions],
        is_active=True
    )

    template = await service.template_repo.create(template)
    await db.commit()

    logger.info(f"DNS template created: {template.name} (ID: {template.id}) by admin {current_user.id}")

    return DNSZoneTemplateResponse.model_validate(template)


@router.put("/templates/{template_id}", response_model=DNSZoneTemplateResponse)
async def update_template(
    template_id: str = Path(..., description="Template ID"),
    template_data: DNSZoneTemplateUpdate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """Update a DNS zone template (admin-only)."""
    service = DNSManagementService(db)

    template = await service.template_repo.get_by_id(template_id)

    if not template:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Template {template_id} not found")

    # Apply updates
    if template_data.name is not None:
        template.name = template_data.name
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.record_definitions is not None:
        template.record_definitions = [r.model_dump() for r in template_data.record_definitions]
    if template_data.is_active is not None:
        template.is_active = template_data.is_active

    template = await service.template_repo.update(template)
    await db.commit()

    logger.info(f"DNS template updated: {template.name} (ID: {template.id}) by admin {current_user.id}")

    return DNSZoneTemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str = Path(..., description="Template ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """Delete a DNS zone template (admin-only)."""
    service = DNSManagementService(db)

    template = await service.template_repo.get_by_id(template_id)

    if not template:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Template {template_id} not found")

    await service.template_repo.delete(template)
    await db.commit()

    logger.info(f"DNS template deleted: {template.name} (ID: {template.id}) by admin {current_user.id}")


# ============================================================================
# Statistics Endpoints (Admin)
# ============================================================================

@router.get("/statistics/zones", response_model=DNSZoneStatistics)
async def get_zone_statistics_admin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.DNS_ADMIN)),
):
    """Get DNS zone statistics (admin view - all customers)."""
    service = DNSManagementService(db)
    stats = await service.get_zone_statistics(customer_id=None)

    return DNSZoneStatistics(**stats)

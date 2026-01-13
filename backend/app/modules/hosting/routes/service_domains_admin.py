"""
Service Domain Admin API Router.

Administrative endpoints for VPS service domain management.
Includes nginx proxy management and domain statistics.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, status, Query, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.hosting.schemas import (
    ServiceDomainResponse,
    ServiceDomainListResponse
)
from app.modules.hosting.services.service_domain_service import ServiceDomainService
from app.modules.hosting.services.nginx_proxy_service import NginxProxyService
from app.modules.hosting.repository import VPSServiceDomainRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hosting/admin/service-domains", tags=["Service Domains (Admin)"])


# ============================================================================
# Service Domain Admin Endpoints
# ============================================================================

@router.get("", response_model=ServiceDomainListResponse)
async def list_all_service_domains(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    subscription_id: Optional[str] = Query(None, description="Filter by VPS subscription ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    List all service domains (admin view - all customers).

    Supports filtering by subscription and active status.
    Returns paginated results with domain details including nginx proxy status.
    """
    repo = VPSServiceDomainRepository(db)

    domains, total = await repo.get_all(
        skip=skip,
        limit=limit,
        subscription_id=subscription_id,
        is_active=is_active
    )

    return ServiceDomainListResponse(
        items=[ServiceDomainResponse.model_validate(d) for d in domains],
        total=total
    )


@router.get("/{domain_id}", response_model=ServiceDomainResponse)
async def get_service_domain_admin(
    domain_id: str = Path(..., description="Service Domain ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    Get service domain details (admin view).

    Returns complete domain information including DNS zone links
    and nginx proxy configuration status.
    """
    repo = VPSServiceDomainRepository(db)
    domain = await repo.get_by_id(domain_id)

    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service domain not found: {domain_id}"
        )

    return ServiceDomainResponse.model_validate(domain)


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_domain_admin(
    domain_id: str = Path(..., description="Service Domain ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    Delete a service domain (admin action).

    Removes nginx configuration, DNS records (for auto-generated domains),
    and database records. This action cannot be undone.
    """
    service = ServiceDomainService(db)

    success = await service.delete_service_domain(domain_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service domain not found: {domain_id}"
        )


@router.post("/regenerate", status_code=status.HTTP_200_OK)
async def regenerate_all_nginx_configs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    Regenerate all nginx configurations from database.

    Clears all existing nginx site configurations and rebuilds them
    from active service domains in the database. Useful for recovery
    or after manual nginx config corruption.

    This operation:
    1. Clears all nginx site configs
    2. Queries all active service domains
    3. Regenerates nginx server blocks for each
    4. Reloads nginx to apply changes
    """
    nginx_service = NginxProxyService()
    repo = VPSServiceDomainRepository(db)

    # Clear existing configs
    clear_success = await nginx_service.regenerate_all_routes()

    if not clear_success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear existing nginx configurations"
        )

    # Get all active domains
    domains = await repo.get_active_domains_with_subscription()

    regenerated_count = 0
    failed_count = 0

    for domain in domains:
        try:
            # Get VPS IP
            vps_ip = domain.subscription.container.ip_address if domain.subscription.container else None

            if not vps_ip:
                logger.warning(f"No VPS IP found for domain {domain.domain_name}, skipping")
                failed_count += 1
                continue

            # Add nginx route
            success = await nginx_service.add_service_route(
                domain.domain_name,
                vps_ip,
                domain.service_port
            )

            if success:
                # Update proxy_configured flag
                domain.proxy_configured = True
                await repo.update(domain)
                regenerated_count += 1
            else:
                domain.proxy_configured = False
                await repo.update(domain)
                failed_count += 1

        except Exception as e:
            logger.error(f"Failed to regenerate config for {domain.domain_name}: {e}")
            failed_count += 1

    await db.commit()

    return {
        "message": "Nginx configurations regenerated",
        "total_domains": len(domains),
        "regenerated": regenerated_count,
        "failed": failed_count
    }


# ============================================================================
# Nginx Proxy Management
# ============================================================================

@router.get("/nginx/status", status_code=status.HTTP_200_OK)
async def get_nginx_status(
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    Get nginx proxy health and configuration status.

    Returns:
    - Container status
    - Configuration validity
    - List of configured domains
    - Total domain count
    """
    nginx_service = NginxProxyService()

    is_healthy = await nginx_service.check_nginx_health()
    configured_domains = await nginx_service.list_configured_domains()

    return {
        "healthy": is_healthy,
        "configured_domains_count": len(configured_domains),
        "configured_domains": configured_domains
    }


@router.post("/nginx/reload", status_code=status.HTTP_200_OK)
async def reload_nginx(
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    Manually reload nginx configuration.

    Tests the configuration first, then reloads if valid.
    Returns success status and any error messages.
    """
    nginx_service = NginxProxyService()

    success = await nginx_service.reload_nginx()

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reload nginx. Check logs for details."
        )

    return {
        "message": "Nginx reloaded successfully",
        "success": True
    }


# ============================================================================
# Statistics
# ============================================================================

@router.get("/statistics", status_code=status.HTTP_200_OK)
async def get_service_domain_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """
    Get service domain statistics.

    Returns aggregate statistics including:
    - Total domains
    - Active/inactive counts
    - Domain type breakdown (auto vs custom)
    - Proxy configuration status
    """
    repo = VPSServiceDomainRepository(db)

    all_domains, total = await repo.get_all(skip=0, limit=10000)  # Get all for stats

    active_count = sum(1 for d in all_domains if d.is_active)
    inactive_count = total - active_count

    auto_count = sum(1 for d in all_domains if d.domain_type.value == "AUTO")
    custom_count = sum(1 for d in all_domains if d.domain_type.value == "CUSTOM")

    proxy_configured_count = sum(1 for d in all_domains if d.proxy_configured)
    proxy_failed_count = sum(1 for d in all_domains if d.is_active and not d.proxy_configured)

    return {
        "total_domains": total,
        "active": active_count,
        "inactive": inactive_count,
        "auto_generated": auto_count,
        "custom": custom_count,
        "proxy_configured": proxy_configured_count,
        "proxy_failed": proxy_failed_count
    }

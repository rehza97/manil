"""
Service Domain Client API Router.

Customer-facing endpoints for VPS service domain management.
"""
import logging
from fastapi import APIRouter, Depends, status, Query, Path, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.hosting.schemas import (
    ServiceDomainCreate,
    ServiceDomainUpdate,
    ServiceDomainResponse,
    ServiceDomainListResponse
)
from app.modules.hosting.services.service_domain_service import ServiceDomainService
from app.modules.hosting.repository import VPSServiceDomainRepository, VPSSubscriptionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hosting/service-domains", tags=["Service Domains (Customer)"])


async def _validate_subscription_ownership(
    subscription_id: str,
    customer_id: str,
    db: AsyncSession
) -> None:
    """
    Validate that the customer owns the subscription.

    Raises HTTPException if validation fails.
    """
    subscription_repo = VPSSubscriptionRepository(db)
    subscription = await subscription_repo.get_by_id(subscription_id)

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription not found: {subscription_id}"
        )

    if subscription.customer_id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this subscription"
        )


async def _validate_domain_ownership(
    domain_id: str,
    customer_id: str,
    db: AsyncSession
):
    """
    Validate that the customer owns the service domain.

    Returns the domain if valid, raises HTTPException otherwise.
    """
    domain_repo = VPSServiceDomainRepository(db)
    domain = await domain_repo.get_by_id(domain_id)

    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service domain not found: {domain_id}"
        )

    # Check subscription ownership
    await _validate_subscription_ownership(domain.subscription_id, customer_id, db)

    return domain


# ============================================================================
# Service Domain Endpoints (Customer)
# ============================================================================

@router.get("", response_model=ServiceDomainListResponse)
async def list_service_domains(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    is_active: bool = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
):
    """
    List customer's service domains.

    Returns all service domains across all VPS subscriptions owned by the customer.
    Supports filtering by active status and pagination.
    """
    # Get all customer's subscriptions
    subscription_repo = VPSSubscriptionRepository(db)
    subscriptions, _ = await subscription_repo.get_all(
        customer_id=current_user.id,
        skip=0,
        limit=10000  # Get all subscriptions
    )

    subscription_ids = [s.id for s in subscriptions]

    if not subscription_ids:
        return ServiceDomainListResponse(items=[], total=0)

    # Get domains for these subscriptions
    domain_repo = VPSServiceDomainRepository(db)
    all_domains = []
    total = 0

    for sub_id in subscription_ids:
        domains = await domain_repo.get_by_subscription(
            subscription_id=sub_id,
            is_active=is_active
        )
        all_domains.extend(domains)

    total = len(all_domains)

    # Apply pagination
    paginated_domains = all_domains[skip:skip + limit]

    return ServiceDomainListResponse(
        items=[ServiceDomainResponse.model_validate(d) for d in paginated_domains],
        total=total
    )


@router.get("/subscription/{subscription_id}", response_model=ServiceDomainListResponse)
async def get_domains_by_subscription(
    subscription_id: str = Path(..., description="VPS Subscription ID"),
    is_active: bool = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
):
    """
    Get all service domains for a specific VPS subscription.

    Returns domains associated with the specified subscription.
    Validates that the customer owns the subscription.
    """
    # Validate ownership
    await _validate_subscription_ownership(subscription_id, current_user.id, db)

    # Get domains
    domain_repo = VPSServiceDomainRepository(db)
    domains = await domain_repo.get_by_subscription(
        subscription_id=subscription_id,
        is_active=is_active
    )

    return ServiceDomainListResponse(
        items=[ServiceDomainResponse.model_validate(d) for d in domains],
        total=len(domains)
    )


@router.post("/custom", response_model=ServiceDomainResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_domain(
    domain_data: ServiceDomainCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """
    Add a custom domain to a service.

    Allows customers to use their own domain names instead of auto-generated subdomains.
    The customer must:
    1. Own the subscription
    2. Configure DNS externally to point to HOST_PUBLIC_IP
    3. Provide a valid domain name

    After creation:
    - Nginx server block is generated
    - Domain becomes immediately active
    - Customer must ensure DNS is properly configured

    Note: DNS is NOT managed automatically for custom domains.
    """
    # Validate subscription ownership
    await _validate_subscription_ownership(
        domain_data.subscription_id,
        current_user.id,
        db
    )

    # Get subscription to find service port (from existing auto domain or deployment)
    domain_repo = VPSServiceDomainRepository(db)
    existing_domain = await domain_repo.get_by_subscription_and_service(
        domain_data.subscription_id,
        domain_data.service_name
    )

    if not existing_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service '{domain_data.service_name}' not found for this subscription. "
                   "Deploy a service first before adding custom domains."
        )

    service_port = existing_domain.service_port

    # Create custom domain
    service = ServiceDomainService(db)

    try:
        created_domain = await service.create_custom_domain(
            subscription_id=domain_data.subscription_id,
            service_name=domain_data.service_name,
            custom_domain=domain_data.custom_domain,
            service_port=service_port
        )

        return ServiceDomainResponse.model_validate(created_domain)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{domain_id}", response_model=ServiceDomainResponse)
async def update_service_domain(
    domain_id: str = Path(..., description="Service Domain ID"),
    update_data: ServiceDomainUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """
    Update service domain settings.

    Currently supports toggling the active status:
    - Setting `is_active=false` removes the nginx configuration
    - Setting `is_active=true` re-adds the nginx configuration

    This allows temporarily disabling domains without deleting them.
    """
    # Validate ownership
    domain = await _validate_domain_ownership(domain_id, current_user.id, db)

    # Only is_active is updatable for now
    if update_data.is_active is not None:
        service = ServiceDomainService(db)
        updated_domain = await service.update_domain_status(
            domain_id, update_data.is_active
        )

        if not updated_domain:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update domain status"
            )

        return ServiceDomainResponse.model_validate(updated_domain)

    # No changes requested
    return ServiceDomainResponse.model_validate(domain)


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_domain(
    domain_id: str = Path(..., description="Service Domain ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """
    Delete a service domain.

    Removes:
    - Nginx proxy configuration
    - DNS records (for auto-generated domains only)
    - Database record

    This action cannot be undone.
    For auto-generated domains, a new domain will be created if the service
    is redeployed.
    """
    # Validate ownership
    await _validate_domain_ownership(domain_id, current_user.id, db)

    # Delete domain
    service = ServiceDomainService(db)
    success = await service.delete_service_domain(domain_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete service domain"
        )


@router.post("/subscription/{subscription_id}/auto-detect", response_model=ServiceDomainListResponse)
async def auto_detect_services(
    subscription_id: str = Path(..., description="VPS Subscription ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """
    Auto-detect services from docker ps inside the VPS and create domains for them.
    
    Scans running containers inside the VPS and automatically creates service domains
    for any containers with exposed ports.
    
    Validates that the customer owns the subscription.
    """
    # Validate subscription ownership
    await _validate_subscription_ownership(subscription_id, current_user.id, db)
    
    # Detect and create domains
    service = ServiceDomainService(db)
    
    try:
        created_domains = await service.detect_and_create_domains(subscription_id)
        
        return ServiceDomainListResponse(
            items=[ServiceDomainResponse.model_validate(d) for d in created_domains],
            total=len(created_domains)
        )
    except Exception as e:
        logger.error(f"Failed to auto-detect services: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to auto-detect services: {str(e)}"
        )


# ============================================================================
# Statistics
# ============================================================================

@router.get("/statistics", status_code=status.HTTP_200_OK)
async def get_customer_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
):
    """
    Get customer's service domain statistics.

    Returns statistics for all domains owned by the customer:
    - Total domains
    - Active/inactive counts
    - Domain type breakdown (auto vs custom)
    """
    # Get customer's subscriptions
    subscription_repo = VPSSubscriptionRepository(db)
    subscriptions, _ = await subscription_repo.get_all(
        customer_id=current_user.id,
        skip=0,
        limit=10000
    )

    subscription_ids = [s.id for s in subscriptions]

    if not subscription_ids:
        return {
            "total_domains": 0,
            "active": 0,
            "inactive": 0,
            "auto_generated": 0,
            "custom": 0
        }

    # Get all domains
    domain_repo = VPSServiceDomainRepository(db)
    all_domains = []

    for sub_id in subscription_ids:
        domains = await domain_repo.get_by_subscription(sub_id)
        all_domains.extend(domains)

    total = len(all_domains)
    active_count = sum(1 for d in all_domains if d.is_active)
    inactive_count = total - active_count
    auto_count = sum(1 for d in all_domains if d.domain_type.value == "AUTO")
    custom_count = sum(1 for d in all_domains if d.domain_type.value == "CUSTOM")

    return {
        "total_domains": total,
        "active": active_count,
        "inactive": inactive_count,
        "auto_generated": auto_count,
        "custom": custom_count
    }

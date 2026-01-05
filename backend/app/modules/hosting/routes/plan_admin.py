"""
VPS Plan Admin API routes.

Admin-only endpoints for managing VPS plans (CRUD operations).
"""
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.hosting.models import VPSPlan
from app.modules.hosting.repository import VPSPlanRepository
from app.modules.hosting.schemas import VPSPlanResponse, VPSPlanCreate, VPSPlanUpdate
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/hosting/admin/plans", tags=["VPS Plans - Admin"])


# ============================================================================
# VPS Plan Management
# ============================================================================

@router.get(
    "",
    response_model=List[VPSPlanResponse],
    summary="List All VPS Plans (Admin)",
    description="""
    Retrieve all VPS plans (including inactive ones) for admin management.

    **Permissions Required:** `hosting:admin`

    **Response:** List of all VPS plans with full details.
    """
)
async def list_all_plans(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    List all VPS plans for admin management.

    Args:
        is_active: Optional filter for active/inactive plans
        db: Database session
        current_user: Authenticated admin user

    Returns:
        List of all VPS plans
    """
    repo = VPSPlanRepository(db)
    plans, _ = await repo.get_all(skip=0, limit=1000, is_active=is_active)
    return plans


@router.get(
    "/{plan_id}",
    response_model=VPSPlanResponse,
    summary="Get VPS Plan Details (Admin)",
    description="""
    Get detailed information about a specific VPS plan.

    **Permissions Required:** `hosting:admin`
    """
)
async def get_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """Get VPS plan by ID."""
    repo = VPSPlanRepository(db)
    plan = await repo.get_by_id(plan_id)

    if not plan:
        raise NotFoundException(f"VPS Plan {plan_id} not found")

    return plan


@router.post(
    "",
    response_model=VPSPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create VPS Plan",
    description="""
    Create a new VPS hosting plan.

    **Permissions Required:** `hosting:admin`

    **Request Body:**
    - name: Plan name (e.g., "Starter VPS")
    - slug: URL-friendly identifier (e.g., "starter-vps")
    - description: Plan description
    - cpu_cores: Number of CPU cores (e.g., 2)
    - ram_gb: RAM in GB (e.g., 2)
    - storage_gb: Storage in GB (e.g., 40)
    - bandwidth_tb: Bandwidth in TB (e.g., 1)
    - monthly_price: Monthly price in DZD
    - setup_fee: One-time setup fee (optional, default: 0)
    - features: Additional features as JSON object
    - docker_image: Default Docker image
    - is_active: Whether plan is available for purchase
    - display_order: Display order for sorting plans (optional, default: 0)

    **Response:** The created VPS plan object.
    """
)
async def create_plan(
    plan_data: VPSPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Create a new VPS plan.

    Args:
        plan_data: Plan creation data
        db: Database session
        current_user: Authenticated admin user

    Returns:
        Created VPS plan

    Raises:
        400: If plan with same slug already exists
    """
    repo = VPSPlanRepository(db)

    # Check if slug already exists
    existing = await repo.get_by_slug(plan_data.slug)
    if existing:
        raise BadRequestException(f"Plan with slug '{plan_data.slug}' already exists")

    # Create plan
    plan = VPSPlan(
        name=plan_data.name,
        slug=plan_data.slug,
        description=plan_data.description,
        cpu_cores=plan_data.cpu_cores,
        ram_gb=plan_data.ram_gb,
        storage_gb=plan_data.storage_gb,
        bandwidth_tb=plan_data.bandwidth_tb,
        monthly_price=plan_data.monthly_price,
        setup_fee=plan_data.setup_fee or Decimal("0.00"),
        features=plan_data.features or {},
        docker_image=plan_data.docker_image,
        is_active=plan_data.is_active if plan_data.is_active is not None else True,
        display_order=plan_data.display_order if plan_data.display_order is not None else 0
    )

    created_plan = await repo.create(plan)
    await db.commit()
    await db.refresh(created_plan)

    logger.info(
        f"VPS Plan created by admin",
        extra={
            "plan_id": created_plan.id,
            "plan_name": created_plan.name,
            "admin_id": current_user.id,
            "admin_email": current_user.email
        }
    )

    return created_plan


@router.put(
    "/{plan_id}",
    response_model=VPSPlanResponse,
    summary="Update VPS Plan",
    description="""
    Update an existing VPS plan.

    **Permissions Required:** `hosting:admin`

    **Note:** Changes to active subscriptions are not affected. Only new subscriptions will use the updated plan.
    """
)
async def update_plan(
    plan_id: str,
    plan_data: VPSPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Update VPS plan details.

    Args:
        plan_id: Plan ID to update
        plan_data: Updated plan data
        db: Database session
        current_user: Authenticated admin user

    Returns:
        Updated VPS plan

    Raises:
        404: If plan not found
        400: If slug already exists for another plan
    """
    repo = VPSPlanRepository(db)
    plan = await repo.get_by_id(plan_id)

    if not plan:
        raise NotFoundException(f"VPS Plan {plan_id} not found")

    # Check slug uniqueness if being changed
    if plan_data.slug and plan_data.slug != plan.slug:
        existing = await repo.get_by_slug(plan_data.slug)
        if existing and existing.id != plan_id:
            raise BadRequestException(f"Plan with slug '{plan_data.slug}' already exists")

    # Update fields
    if plan_data.name is not None:
        plan.name = plan_data.name
    if plan_data.slug is not None:
        plan.slug = plan_data.slug
    if plan_data.description is not None:
        plan.description = plan_data.description
    if plan_data.cpu_cores is not None:
        plan.cpu_cores = plan_data.cpu_cores
    if plan_data.ram_gb is not None:
        plan.ram_gb = plan_data.ram_gb
    if plan_data.storage_gb is not None:
        plan.storage_gb = plan_data.storage_gb
    if plan_data.bandwidth_tb is not None:
        plan.bandwidth_tb = plan_data.bandwidth_tb
    if plan_data.monthly_price is not None:
        plan.monthly_price = plan_data.monthly_price
    if plan_data.setup_fee is not None:
        plan.setup_fee = plan_data.setup_fee
    if plan_data.features is not None:
        plan.features = plan_data.features
    if plan_data.docker_image is not None:
        plan.docker_image = plan_data.docker_image
    if plan_data.is_active is not None:
        plan.is_active = plan_data.is_active
    if plan_data.display_order is not None:
        plan.display_order = plan_data.display_order

    await db.commit()
    await db.refresh(plan)

    logger.info(
        f"VPS Plan updated by admin",
        extra={
            "plan_id": plan.id,
            "plan_name": plan.name,
            "admin_id": current_user.id,
            "admin_email": current_user.email
        }
    )

    return plan


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete VPS Plan",
    description="""
    Delete a VPS plan.

    **Permissions Required:** `hosting:admin`

    **Warning:** This will fail if there are active subscriptions using this plan.
    Consider deactivating the plan instead.
    """
)
async def delete_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Delete a VPS plan.

    Args:
        plan_id: Plan ID to delete
        db: Database session
        current_user: Authenticated admin user

    Raises:
        404: If plan not found
        400: If plan has active subscriptions
    """
    repo = VPSPlanRepository(db)
    plan = await repo.get_by_id(plan_id)

    if not plan:
        raise NotFoundException(f"VPS Plan {plan_id} not found")

    # Check for active subscriptions
    from app.modules.hosting.repository import VPSSubscriptionRepository
    sub_repo = VPSSubscriptionRepository(db)
    subscriptions, total = await sub_repo.get_all(skip=0, limit=1, plan_id=plan_id)

    if total > 0:
        raise BadRequestException(
            f"Cannot delete plan with {total} active subscription(s). "
            "Deactivate the plan instead or migrate subscriptions first."
        )

    await repo.delete(plan)
    await db.commit()

    logger.warning(
        f"VPS Plan deleted by admin",
        extra={
            "plan_id": plan_id,
            "plan_name": plan.name,
            "admin_id": current_user.id,
            "admin_email": current_user.email
        }
    )


@router.patch(
    "/{plan_id}/activate",
    response_model=VPSPlanResponse,
    summary="Activate VPS Plan",
    description="""
    Activate a VPS plan, making it available for purchase.

    **Permissions Required:** `hosting:admin`
    """
)
async def activate_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """Activate a VPS plan."""
    repo = VPSPlanRepository(db)
    plan = await repo.get_by_id(plan_id)

    if not plan:
        raise NotFoundException(f"VPS Plan {plan_id} not found")

    plan.is_active = True
    await db.commit()
    await db.refresh(plan)

    logger.info(f"VPS Plan {plan_id} activated by admin {current_user.id}")

    return plan


@router.patch(
    "/{plan_id}/deactivate",
    response_model=VPSPlanResponse,
    summary="Deactivate VPS Plan",
    description="""
    Deactivate a VPS plan, preventing new purchases.

    **Permissions Required:** `hosting:admin`

    **Note:** Existing subscriptions continue to work normally.
    """
)
async def deactivate_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """Deactivate a VPS plan."""
    repo = VPSPlanRepository(db)
    plan = await repo.get_by_id(plan_id)

    if not plan:
        raise NotFoundException(f"VPS Plan {plan_id} not found")

    plan.is_active = False
    await db.commit()
    await db.refresh(plan)

    logger.info(f"VPS Plan {plan_id} deactivated by admin {current_user.id}")

    return plan

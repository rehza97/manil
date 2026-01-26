"""
Revenue API routes.

Endpoints for revenue reporting and analytics.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.revenue.service import RevenueService
from app.modules.revenue.schemas import (
    RevenueOverview,
    RevenueTrends,
    RevenueByCategory,
    RevenueByCustomer,
    RevenueReconciliation,
)

router = APIRouter(prefix="/api/v1/revenue", tags=["revenue"])


@router.get("/overview", response_model=RevenueOverview)
async def get_revenue_overview(
    period: str = Query("month", description="Time period (today, week, month, quarter, year)"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
):
    """
    Get overall revenue overview.

    Security:
    - Requires REPORTS_VIEW permission
    - Returns recognized, booked, recurring, and deferred revenue
    """
    service = RevenueService(db)
    return await service.get_overview(period=period, customer_id=customer_id)


@router.get("/trends", response_model=RevenueTrends)
async def get_revenue_trends(
    period: str = Query("month", description="Time period"),
    group_by: str = Query("day", description="Grouping (day, week, month)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
):
    """
    Get revenue trends over time.

    Security:
    - Requires REPORTS_VIEW permission
    """
    service = RevenueService(db)
    return await service.get_trends(period=period, group_by=group_by)


@router.get("/by-category", response_model=RevenueByCategory)
async def get_revenue_by_category(
    period: str = Query("month", description="Time period"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
):
    """
    Get revenue breakdown by product category.

    Security:
    - Requires REPORTS_VIEW permission
    """
    service = RevenueService(db)
    return await service.get_by_category(period=period)


@router.get("/by-customer", response_model=RevenueByCustomer)
async def get_revenue_by_customer(
    period: str = Query("month", description="Time period"),
    limit: int = Query(10, ge=1, le=100, description="Number of top customers"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
):
    """
    Get revenue breakdown by customer.

    Security:
    - Requires REPORTS_VIEW permission
    """
    service = RevenueService(db)
    return await service.get_by_customer(period=period, limit=limit)


@router.get("/reconciliation", response_model=RevenueReconciliation)
async def get_revenue_reconciliation(
    period: str = Query("month", description="Time period"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
):
    """
    Get revenue reconciliation between Orders and Invoices.

    Security:
    - Requires REPORTS_VIEW permission
    - Helps identify double-counting and mismatches
    """
    service = RevenueService(db)
    return await service.get_reconciliation(period=period)

"""
Admin Reports Routes
Maps /admin/reports/* endpoints to the existing report endpoints
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User

# Import the report functions from the main routes
from .routes import (
    get_user_report,
    get_activity_report,
    get_security_report,
    get_performance_report,
)

# Create admin router with /admin/reports prefix
router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])


@router.get("/users")
async def admin_get_user_report(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint for user reports - maps to /reports/users"""
    return await get_user_report(date_from, date_to, current_user, db)


@router.get("/activity")
async def admin_get_activity_report(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint for activity reports - maps to /reports/activity"""
    return await get_activity_report(date_from, date_to, current_user, db)


@router.get("/security")
async def admin_get_security_report(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint for security reports - maps to /reports/security"""
    return await get_security_report(date_from, date_to, current_user, db)


@router.get("/performance")
async def admin_get_performance_report(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint for performance reports - maps to /reports/performance"""
    return await get_performance_report(date_from, date_to, current_user, db)













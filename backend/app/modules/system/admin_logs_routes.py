"""
Admin Logs Routes
Maps /admin/logs/* endpoints to the existing system/audit log endpoints
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User

# Import the system logs function from the main router
from .router import get_system_logs

# Create admin router with /admin/logs prefix
router = APIRouter(prefix="/admin/logs", tags=["admin-logs"])


@router.get("/system")
async def admin_get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level (error, warning, info, debug)"),
    component: Optional[str] = Query(None, description="Filter by component"),
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint for system logs - maps to /system/logs"""
    return await get_system_logs(
        db=db,
        level=level,
        component=component,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
        current_user=current_user
    )




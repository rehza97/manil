"""
Audit log API router.
Provides endpoints for viewing and querying audit logs.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.audit.service import AuditService
from app.modules.audit.schemas import (
    AuditLogListResponse,
    AuditLogResponse,
    AuditLogFilter,
)
from app.modules.audit.models import AuditAction

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    action: Optional[AuditAction] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit logs with pagination and filters.
    Requires authentication. Admin users can see all logs.
    """
    service = AuditService(db)

    # Build filters
    filters = AuditLogFilter(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_email=user_email,
        success=success,
    )

    # Non-admin users can only see their own logs
    if current_user.role != "admin":
        filters.user_id = current_user.id

    return await service.get_logs(page=page, page_size=page_size, filters=filters)


@router.get("/user/{user_id}", response_model=list[AuditLogResponse])
async def get_user_audit_logs(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get audit logs for a specific user.
    Users can only view their own logs unless they are admin.
    """
    # Check permissions
    if current_user.role != "admin" and current_user.id != user_id:
        from app.core.exceptions import ForbiddenException

        raise ForbiddenException("You can only view your own audit logs")

    service = AuditService(db)
    return await service.get_user_activity(
        user_id=user_id, page=page, page_size=page_size
    )


@router.get("/me", response_model=list[AuditLogResponse])
async def get_my_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get audit logs for the current authenticated user."""
    service = AuditService(db)
    return await service.get_user_activity(
        user_id=current_user.id, page=page, page_size=page_size
    )

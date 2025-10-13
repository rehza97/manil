"""
Audit log service for business logic.
Provides high-level operations for audit logging.
"""
from typing import Optional
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from fastapi import Request

from app.modules.audit.repository import AuditRepository
from app.modules.audit.models import AuditLog, AuditAction
from app.modules.audit.schemas import (
    AuditLogCreate,
    AuditLogResponse,
    AuditLogListResponse,
    AuditLogFilter,
)


class AuditService:
    """Service for audit logging operations."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.repository = AuditRepository(db)

    async def log_action(
        self,
        action: AuditAction,
        resource_type: str,
        description: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        request: Optional[Request] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        extra_data: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an audit action.

        Args:
            action: Type of action performed
            resource_type: Type of resource affected
            description: Description of the action
            resource_id: ID of the affected resource
            user_id: ID of user performing action
            user_email: Email of user
            user_role: Role of user
            request: FastAPI request object
            old_values: Previous values (for updates)
            new_values: New values (for creates/updates)
            extra_data: Additional metadata
            success: Whether action was successful
            error_message: Error message if failed

        Returns:
            Created audit log entry
        """
        audit_data = AuditLogCreate(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            old_values=old_values,
            new_values=new_values,
            extra_data=extra_data,
            success=success,
            error_message=error_message,
        )

        # Extract request information if provided
        if request:
            audit_data.ip_address = request.client.host if request.client else None
            audit_data.user_agent = request.headers.get("user-agent")
            audit_data.request_method = request.method
            audit_data.request_path = str(request.url.path)

        return await self.repository.create(audit_data)

    async def get_logs(
        self,
        page: int = 1,
        page_size: int = 20,
        filters: Optional[AuditLogFilter] = None,
    ) -> AuditLogListResponse:
        """Get paginated audit logs with filters."""
        skip = (page - 1) * page_size
        audit_logs, total = await self.repository.get_all(
            skip=skip, limit=page_size, filters=filters
        )

        total_pages = (total + page_size - 1) // page_size

        return AuditLogListResponse(
            data=[AuditLogResponse.model_validate(log) for log in audit_logs],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_user_activity(
        self, user_id: str, page: int = 1, page_size: int = 20
    ) -> list[AuditLogResponse]:
        """Get activity logs for a specific user."""
        skip = (page - 1) * page_size
        audit_logs = await self.repository.get_by_user(
            user_id=user_id, skip=skip, limit=page_size
        )
        return [AuditLogResponse.model_validate(log) for log in audit_logs]

    async def check_failed_logins(
        self, user_email: str, time_window_minutes: int = 15
    ) -> int:
        """
        Check number of failed login attempts for a user.

        Args:
            user_email: Email of the user
            time_window_minutes: Time window to check (default 15 minutes)

        Returns:
            Number of failed login attempts in the time window
        """
        since = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        failed_logins = await self.repository.get_failed_logins(user_email, since)
        return len(failed_logins)

"""
Audit log repository for database operations.
Handles all data access for audit logging.
"""
from typing import Optional
from datetime import datetime

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.modules.audit.models import AuditLog, AuditAction
from app.modules.audit.schemas import AuditLogCreate, AuditLogFilter


class AuditRepository:
    """Repository for audit log data access."""

    def __init__(self, db: Session):
        """Initialize repository with database session."""
        self.db = db

    async def create(self, audit_data: AuditLogCreate) -> AuditLog:
        """
        Create a new audit log entry.

        Args:
            audit_data: Audit log creation data

        Returns:
            Created audit log entry
        """
        audit_log = AuditLog(**audit_data.model_dump())
        self.db.add(audit_log)
        await self.db.commit()
        await self.db.refresh(audit_log)
        return audit_log

    async def get_by_id(self, audit_id: str) -> Optional[AuditLog]:
        """Get audit log by ID."""
        query = select(AuditLog).where(AuditLog.id == audit_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[AuditLogFilter] = None,
    ) -> tuple[list[AuditLog], int]:
        """
        Get all audit logs with pagination and filters.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Optional filters to apply

        Returns:
            Tuple of (audit logs list, total count)
        """
        query = select(AuditLog)

        # Apply filters
        if filters:
            conditions = []

            if filters.action:
                conditions.append(AuditLog.action == filters.action)
            if filters.resource_type:
                conditions.append(AuditLog.resource_type == filters.resource_type)
            if filters.resource_id:
                conditions.append(AuditLog.resource_id == filters.resource_id)
            if filters.user_id:
                conditions.append(AuditLog.user_id == filters.user_id)
            if filters.user_email:
                conditions.append(AuditLog.user_email.ilike(f"%{filters.user_email}%"))
            if filters.success is not None:
                conditions.append(AuditLog.success == filters.success)
            if filters.start_date:
                conditions.append(AuditLog.created_at >= filters.start_date)
            if filters.end_date:
                conditions.append(AuditLog.created_at <= filters.end_date)
            if filters.ip_address:
                conditions.append(AuditLog.ip_address == filters.ip_address)

            if conditions:
                query = query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.execute(count_query)
        total_count = total.scalar()

        # Apply pagination and ordering
        query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        audit_logs = result.scalars().all()

        return list(audit_logs), total_count

    async def get_by_user(
        self, user_id: str, skip: int = 0, limit: int = 100
    ) -> list[AuditLog]:
        """Get audit logs for a specific user."""
        query = (
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_failed_logins(
        self, user_email: str, since: datetime
    ) -> list[AuditLog]:
        """Get failed login attempts for a user since a given time."""
        query = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.action == AuditAction.LOGIN_FAILED,
                    AuditLog.user_email == user_email,
                    AuditLog.created_at >= since,
                )
            )
            .order_by(AuditLog.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

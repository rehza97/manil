"""
Audit & Compliance Report Service

Four reports: user activity, security events, data changes, compliance.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog, AuditAction
from .base_report_service import BaseReportService


class AuditComplianceService(BaseReportService):
    """Audit reports: user activity, security, data changes, compliance."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_activity_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Logins, actions performed, most active users by role."""
        end = end_date or datetime.now(timezone.utc)
        q = select(AuditLog.user_id, func.count(AuditLog.id).label("cnt")).where(
            AuditLog.created_at <= end
        ).group_by(AuditLog.user_id).order_by(func.count(AuditLog.id).desc()).limit(limit)
        rows = (await self.db.execute(q)).all()
        details = [{"user_id": r[0], "action_count": r[1]} for r in rows]
        return {"details": details, "end_date": end}

    async def get_security_events_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Failed logins by IP, suspicious patterns."""
        end = end_date or datetime.now(timezone.utc)
        q = select(AuditLog.action, AuditLog.ip_address, func.count(AuditLog.id)).where(
            and_(
                AuditLog.action == AuditAction.LOGIN_FAILED.value,
                AuditLog.created_at <= end,
            )
        ).group_by(AuditLog.action, AuditLog.ip_address)
        rows = (await self.db.execute(q)).all()
        details = [{"action": r[0], "ip_address": r[1], "count": r[2]}
                   for r in rows]
        return {"details": details, "end_date": end}

    async def get_data_changes_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Critical data modifications: who/when/where."""
        end = end_date or datetime.now(timezone.utc)
        q = select(AuditLog.action, AuditLog.resource_type, AuditLog.user_id, AuditLog.created_at).where(
            and_(
                AuditLog.action.in_(
                    [AuditAction.UPDATE.value, AuditAction.DELETE.value, AuditAction.CREATE.value]),
                AuditLog.created_at <= end,
            )
        ).order_by(AuditLog.created_at.desc()).limit(limit)
        rows = (await self.db.execute(q)).all()
        details = [{"action": r[0], "resource_type": r[1], "user_id": r[2],
                    "created_at": str(r[3]) if r[3] else None} for r in rows]
        return {"details": details, "end_date": end}

    async def get_compliance_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Data retention, access reviews, export tracking (simplified)."""
        end = end_date or datetime.now(timezone.utc)
        q = select(AuditLog.action, func.count(AuditLog.id)).where(
            AuditLog.created_at <= end
        ).group_by(AuditLog.action)
        rows = (await self.db.execute(q)).all()
        by_action = [{"action": r[0], "count": r[1]} for r in rows]
        return {"by_action": by_action, "end_date": end}

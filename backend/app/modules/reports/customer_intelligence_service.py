"""
Customer Intelligence Report Service

Four reports: lifetime value, segmentation, KYC compliance, churn analysis.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.orders.models import Order
from app.modules.tickets.models import Ticket
from app.modules.orders.models import OrderStatus
from .base_report_service import BaseReportService


class CustomerIntelligenceService(BaseReportService):
    """Customer reports: CLV, segmentation, KYC, churn."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_lifetime_value_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Total revenue per customer, purchase frequency, ranking."""
        end = end_date or datetime.now(timezone.utc)
        q = select(
            Order.customer_id,
            func.count(Order.id).label("orders"),
            func.sum(Order.total_amount).label("total"),
        ).where(
            and_(
                Order.deleted_at.is_(None),
                Order.status == OrderStatus.DELIVERED.value,
                Order.created_at <= end,
            )
        ).group_by(Order.customer_id).order_by(func.sum(Order.total_amount).desc()).limit(limit)
        rows = (await self.db.execute(q)).all()
        details = [{"customer_id": r[0], "order_count": r[1],
                    "total_revenue": float(r[2] or 0)} for r in rows]
        return {"details": details, "end_date": end}

    async def get_segmentation_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """By type, status, revenue tier."""
        end = end_date or datetime.now(timezone.utc)
        q = select(Customer.customer_type, Customer.status, func.count(Customer.id)).where(
            and_(Customer.deleted_at.is_(None), Customer.created_at <= end)
        ).group_by(Customer.customer_type, Customer.status)
        rows = (await self.db.execute(q)).all()
        details = [{"customer_type": r[0], "status": r[1], "count": r[2]}
                   for r in rows]
        return {"details": details, "end_date": end}

    async def get_kyc_compliance_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Verification status and compliance rates (simplified: approval_status)."""
        end = end_date or datetime.now(timezone.utc)
        q = select(Customer.approval_status, func.count(Customer.id)).where(
            and_(Customer.deleted_at.is_(None), Customer.created_at <= end)
        ).group_by(Customer.approval_status)
        rows = (await self.db.execute(q)).all()
        details = [{"approval_status": str(r[0]), "count": r[1]} for r in rows]
        total = sum(r[1] for r in rows)
        approved = sum(r[1] for r in rows if str(r[0]) == "approved")
        rate = (approved / total * 100) if total else 0
        return {"details": details, "total": total, "compliance_rate": round(rate, 2), "end_date": end}

    async def get_churn_analysis_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        inactive_days: int = 90,
    ) -> Dict[str, Any]:
        """At-risk and inactive customers (no order in last N days)."""
        end = end_date or datetime.now(timezone.utc)
        cutoff = end - timedelta(days=inactive_days)
        q_last = select(Order.customer_id, func.max(Order.created_at).label("last_order")).where(
            and_(Order.deleted_at.is_(None), Order.status ==
                 OrderStatus.DELIVERED.value)
        ).group_by(Order.customer_id)
        sub = q_last.subquery()
        q_inactive = select(sub.c.customer_id).where(sub.c.last_order < cutoff)
        inactive_ids = [r[0] for r in (await self.db.execute(q_inactive)).all()]
        details = [{"customer_id": cid} for cid in inactive_ids]
        return {
            "inactive_customer_ids": inactive_ids,
            "inactive_count": len(inactive_ids),
            "cutoff": cutoff,
            "details": details,
        }

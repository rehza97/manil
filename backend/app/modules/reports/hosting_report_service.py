"""
Hosting Report Service

Four reports: VPS utilization, lifecycle, uptime (placeholder), billing (MRR).
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hosting.models import VPSSubscription, VPSPlan, SubscriptionStatus
from .base_report_service import BaseReportService


class HostingReportService(BaseReportService):
    """Hosting reports: utilization, lifecycle, uptime, billing."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_vps_utilization_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Resource allocation by plan, utilization %, revenue by plan."""
        end = end_date or datetime.now(timezone.utc)
        q = select(VPSPlan.id, VPSPlan.name, VPSPlan.slug, func.count(VPSSubscription.id).label("count")).join(
            VPSSubscription, VPSSubscription.plan_id == VPSPlan.id
        ).where(
            VPSSubscription.status == SubscriptionStatus.ACTIVE
        ).group_by(VPSPlan.id, VPSPlan.name, VPSPlan.slug)
        rows = (await self.db.execute(q)).all()
        details = [{"plan_id": r[0], "plan_name": r[1],
                    "slug": r[2], "subscription_count": r[3]} for r in rows]
        return {"details": details, "end_date": end}

    async def get_vps_lifecycle_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """New subscriptions, cancellations, churn rate."""
        end = end_date or datetime.now(timezone.utc)

        # Count new subscriptions by start_date (business date), not created_at (DB timestamp)
        filters_new = [VPSSubscription.status == SubscriptionStatus.ACTIVE]
        if start_date:
            filters_new.append(VPSSubscription.start_date >= start_date)
        filters_new.append(VPSSubscription.start_date <= end)
        q_new = select(func.count(VPSSubscription.id)).where(and_(*filters_new))
        new = (await self.db.scalar(q_new)) or 0

        # Count cancelled subscriptions within date range
        filters_cancelled = [VPSSubscription.cancelled_at.isnot(None)]
        if start_date:
            filters_cancelled.append(VPSSubscription.cancelled_at >= start_date)
        filters_cancelled.append(VPSSubscription.cancelled_at <= end)
        q_cancelled = select(func.count(VPSSubscription.id)).where(and_(*filters_cancelled))
        cancelled = (await self.db.scalar(q_cancelled)) or 0

        # Count total subscriptions by start_date
        filters_total = []
        if start_date:
            filters_total.append(VPSSubscription.start_date >= start_date)
        filters_total.append(VPSSubscription.start_date <= end)
        q_total = select(func.count(VPSSubscription.id)).where(and_(*filters_total)) if filters_total else select(func.count(VPSSubscription.id))
        total = (await self.db.scalar(q_total)) or 0
        churn = (cancelled / total * 100) if total else 0
        details = [
            {"metric": "new_subscriptions", "value": new},
            {"metric": "cancelled", "value": cancelled},
            {"metric": "total", "value": total},
            {"metric": "churn_rate", "value": round(churn, 2)},
        ]
        return {
            "new_subscriptions": new,
            "cancelled": cancelled,
            "total": total,
            "churn_rate": round(churn, 2),
            "details": details,
        }

    async def get_vps_uptime_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Placeholder: uptime % if monitoring data available."""
        end = end_date or datetime.now(timezone.utc)
        details = [
            {"metric": "uptime_percent", "value": None},
            {"metric": "note", "value": "Monitoring data not yet integrated"},
        ]
        return {
            "uptime_percent": None,
            "end_date": end,
            "note": "Monitoring data not yet integrated",
            "details": details,
        }

    async def get_vps_billing_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """MRR (sum of active subscriptions monthly_price from plan)."""
        end = end_date or datetime.now(timezone.utc)
        q = select(func.sum(VPSPlan.monthly_price)).join(
            VPSSubscription, VPSSubscription.plan_id == VPSPlan.id
        ).where(VPSSubscription.status == SubscriptionStatus.ACTIVE)
        mrr = (await self.db.scalar(q)) or Decimal("0")
        details = [{"metric": "mrr", "value": float(mrr)}]
        return {"mrr": float(mrr), "end_date": end, "details": details}

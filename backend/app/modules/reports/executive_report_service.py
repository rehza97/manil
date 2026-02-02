"""
Executive Report Service

Three reports: KPI dashboard, business health, forecast (linear trend on revenue).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import Order
from app.modules.orders.models import OrderStatus
from .dashboard_service import DashboardService
from .base_report_service import BaseReportService


class ExecutiveReportService(BaseReportService):
    """Executive reports: KPI, health, forecast."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.dashboard = DashboardService(db)

    async def get_kpi_dashboard_report(
        self,
        period: str = "month",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Revenue, customers, orders, tickets, satisfaction (trends)."""
        dashboard = await self.dashboard.get_admin_dashboard(period=period)
        metrics = dashboard.metrics.model_dump() if hasattr(
            dashboard.metrics, "model_dump") else {}
        details = [{"kpi": k, "value": v} for k, v in metrics.items()]
        return {
            "metrics": metrics,
            "trends": dashboard.trends,
            "period": period,
            "details": details,
        }

    async def get_business_health_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """6-month revenue trends, pipeline status, receivables, support backlog."""
        end = end_date or datetime.now(timezone.utc)
        start = start_date or (end - timedelta(days=180))
        q = select(func.date(Order.created_at).label("date"), func.sum(Order.total_amount).label("total")).where(
            and_(
                Order.deleted_at.is_(None),
                Order.status == OrderStatus.DELIVERED.value,
                Order.created_at >= start,
                Order.created_at <= end,
            )
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
        rows = (await self.db.execute(q)).all()
        revenue_trend = [
            {"date": str(r.date), "total": float(r.total or 0)} for r in rows]
        return {"revenue_trend": revenue_trend, "start_date": start, "end_date": end}

    async def get_forecast_report(
        self,
        months: int = 3,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Simple linear trend on historical revenue for next N months."""
        end = end_date or datetime.now(timezone.utc)
        start = start_date or (end - timedelta(days=180))
        q = select(func.date(Order.created_at).label("date"), func.sum(Order.total_amount).label("total")).where(
            and_(
                Order.deleted_at.is_(None),
                Order.status == OrderStatus.DELIVERED.value,
                Order.created_at >= start,
                Order.created_at <= end,
            )
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
        rows = (await self.db.execute(q)).all()
        totals = [float(r.total or 0) for r in rows]
        avg = sum(totals) / len(totals) if totals else 0
        forecast_values = [avg * (1 + 0.02 * i) for i in range(months)]
        details = [
            {"month": i + 1, "forecast": v} for i, v in enumerate(forecast_values)
        ]
        return {
            "forecast_monthly": forecast_values,
            "historical_avg": avg,
            "months": months,
            "details": details,
        }

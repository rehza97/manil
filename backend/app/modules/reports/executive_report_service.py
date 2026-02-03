"""
Executive Report Service

Three reports: KPI dashboard, business health, forecast (linear trend on revenue).
Uses RevenueRepository as single source for revenue metrics.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.revenue.repository import RevenueRepository
from .dashboard_service import DashboardService
from .base_report_service import BaseReportService


class ExecutiveReportService(BaseReportService):
    """Executive reports: KPI, health, forecast."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.dashboard = DashboardService(db)
        self.revenue_repo = RevenueRepository(db)

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
        """6-month revenue trends (booked revenue from single source)."""
        end = end_date or datetime.now(timezone.utc)
        start = start_date or (end - timedelta(days=180))
        trend_data = await self.revenue_repo.get_revenue_trends(
            start_date=start, end_date=end, group_by="day"
        )
        revenue_trend = [
            {"date": item["date"], "total": float(item["booked_revenue"])}
            for item in trend_data
        ]
        return {"revenue_trend": revenue_trend, "start_date": start, "end_date": end}

    async def get_forecast_report(
        self,
        months: int = 3,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Simple linear trend on historical booked revenue for next N months."""
        end = end_date or datetime.now(timezone.utc)
        start = start_date or (end - timedelta(days=180))
        trend_data = await self.revenue_repo.get_revenue_trends(
            start_date=start, end_date=end, group_by="day"
        )
        totals = [float(item["booked_revenue"]) for item in trend_data]
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

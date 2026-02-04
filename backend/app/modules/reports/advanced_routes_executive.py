"""Advanced report routes: Executive (3 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .executive_report_service import ExecutiveReportService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/executive", tags=["reports-advanced-executive"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/kpi-dashboard")
async def get_kpi_dashboard(
    period: str = Query("month"), format: str = Query("json", enum=["json", "pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    data = await ExecutiveReportService(db).get_kpi_dashboard_report(period=period)
    return await generate_report_response(
        db, data, "reports/executive/kpi_dashboard.html", "KPI Dashboard", format, "kpi_dashboard",
        export_details_key="details",
        generated_by=current_user.id,
        report_type="executive_kpi_dashboard",
        description="Key performance indicators overview",
    )


@router.get("/business-health")
async def get_business_health(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("json", enum=["json", "pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await ExecutiveReportService(db).get_business_health_report(start, end)
    return await generate_report_response(
        db, data, "reports/executive/business_health.html", "Business Health", format, "business_health",
        export_details_key="revenue_trend",
        generated_by=current_user.id,
        start_date=start,
        end_date=end,
        report_type="executive_business_health",
        description="Overall business health metrics",
    )


@router.get("/forecast")
async def get_forecast(
    months: int = Query(3), start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("json", enum=["json", "pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await ExecutiveReportService(db).get_forecast_report(months=months, start_date=start, end_date=end)
    return await generate_report_response(
        db, data, "reports/executive/forecast.html", "Forecast", format, "forecast",
        export_details_key="details",
        generated_by=current_user.id,
        start_date=start,
        end_date=end,
        report_type="executive_forecast",
        description="Revenue and growth forecasting",
    )

"""Advanced report routes: Operations (4 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .operations_report_service import OperationsReportService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/operations", tags=["reports-advanced-operations"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/sla-compliance")
async def get_sla_compliance(
    priority: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await OperationsReportService(db).get_sla_compliance_report(priority, start, end)
    return await generate_report_response(db, data, "reports/operations/sla_compliance.html", "SLA Compliance", format, "sla_compliance", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/agent-performance")
async def get_agent_performance(
    agent_id: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await OperationsReportService(db).get_agent_performance_report(agent_id, start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Agent Performance", format, "agent_performance", export_details_key="agents", generated_by=current_user.id)


@router.get("/ticket-category-analysis")
async def get_ticket_category_analysis(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await OperationsReportService(db).get_ticket_category_analysis_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Ticket Category Analysis", format, "category_analysis", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/quality-metrics")
async def get_quality_metrics(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await OperationsReportService(db).get_quality_metrics_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Support Quality Metrics", format, "quality_metrics", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)

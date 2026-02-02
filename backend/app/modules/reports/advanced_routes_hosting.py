"""Advanced report routes: Hosting (4 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .hosting_report_service import HostingReportService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/hosting", tags=["reports-advanced-hosting"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/vps-utilization")
async def get_vps_utilization(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await HostingReportService(db).get_vps_utilization_report(start, end)
    return await generate_report_response(db, data, "reports/hosting/vps_utilization.html", "VPS Utilization", format, "vps_utilization", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/vps-lifecycle")
async def get_vps_lifecycle(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await HostingReportService(db).get_vps_lifecycle_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "VPS Lifecycle", format, "vps_lifecycle", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/vps-uptime")
async def get_vps_uptime(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await HostingReportService(db).get_vps_uptime_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "VPS Uptime", format, "vps_uptime", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/vps-billing")
async def get_vps_billing(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await HostingReportService(db).get_vps_billing_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "VPS Billing (MRR)", format, "vps_billing", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)

"""Advanced report routes: Audit & Compliance (4 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .audit_compliance_service import AuditComplianceService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/audit", tags=["reports-advanced-audit"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/user-activity")
async def get_user_activity(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await AuditComplianceService(db).get_user_activity_report(start, end)
    return await generate_report_response(db, data, "reports/audit/user_activity.html", "User Activity", format, "user_activity", export_details_key="details", start_date=start, end_date=end)


@router.get("/security-events")
async def get_security_events(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await AuditComplianceService(db).get_security_events_report(start, end)
    return await generate_report_response(db, data, "reports/audit/security_events.html", "Security Events", format, "security_events", export_details_key="details", start_date=start, end_date=end)


@router.get("/data-changes")
async def get_data_changes(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await AuditComplianceService(db).get_data_changes_report(start, end)
    return await generate_report_response(db, data, "reports/audit/data_changes.html", "Data Change Audit", format, "data_changes", export_details_key="details", start_date=start, end_date=end)


@router.get("/compliance")
async def get_compliance(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await AuditComplianceService(db).get_compliance_report(start, end)
    return await generate_report_response(db, data, "reports/audit/compliance.html", "Regulatory Compliance", format, "compliance", export_details_key="by_action", generated_by=current_user.id, start_date=start, end_date=end)

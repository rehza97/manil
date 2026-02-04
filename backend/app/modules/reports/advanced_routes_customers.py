"""Advanced report routes: Customer Intelligence (4 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .customer_intelligence_service import CustomerIntelligenceService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/customers", tags=["reports-advanced-customers"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/lifetime-value")
async def get_lifetime_value(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await CustomerIntelligenceService(db).get_lifetime_value_report(start, end)
    return await generate_report_response(db, data, "reports/customers/lifetime_value.html", "Customer Lifetime Value", format, "lifetime_value", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/segmentation")
async def get_segmentation(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await CustomerIntelligenceService(db).get_segmentation_report(start, end)
    return await generate_report_response(db, data, "reports/customers/segmentation.html", "Customer Segmentation", format, "segmentation", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/kyc-compliance")
async def get_kyc_compliance(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await CustomerIntelligenceService(db).get_kyc_compliance_report(start, end)
    return await generate_report_response(db, data, "reports/customers/kyc_compliance.html", "KYC Compliance", format, "kyc_compliance", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/churn-analysis")
async def get_churn_analysis(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await CustomerIntelligenceService(db).get_churn_analysis_report(start, end)
    return await generate_report_response(db, data, "reports/customers/churn_analysis.html", "Churn Analysis", format, "churn_analysis", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)

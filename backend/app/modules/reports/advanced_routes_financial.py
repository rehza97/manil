"""Advanced report routes: Financial (5 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .financial_report_service import FinancialReportService
from .chart_service import ChartService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/financial", tags=["reports-advanced-financial"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/invoice-aging")
async def get_invoice_aging(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]), include_charts: bool = True,
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await FinancialReportService(db).get_invoice_aging_report(start, end)
    charts = []
    if include_charts and format == "pdf":
        cs = ChartService()
        chart_b64 = cs.generate_bar_chart(
            [b["amount"] for b in data["aging_buckets"]], "Aging by Amount",
            labels=[b["bucket"] for b in data["aging_buckets"]])
        if chart_b64 is not None:
            charts.append({"title": "Invoice Aging", "image_base64": chart_b64})
    return await generate_report_response(
        db, data, "reports/financial/invoice_aging.html", "Invoice Aging Report",
        format, "invoice_aging", charts=charts, export_details_key="details",
        generated_by=current_user.id, start_date=start, end_date=end
    )


@router.get("/payment-status")
async def get_payment_status(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]), include_charts: bool = True,
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await FinancialReportService(db).get_payment_status_report(start, end)
    charts = []
    if include_charts and format == "pdf" and data.get("by_status"):
        cs = ChartService()
        chart_b64 = cs.generate_pie_chart(
            [r["amount"] for r in data["by_status"]], [r["status"] for r in data["by_status"]])
        if chart_b64 is not None:
            charts.append({"title": "Payment Status", "image_base64": chart_b64})
    return await generate_report_response(db, data, "reports/base_report.html", "Payment Status", format, "payment_status", charts=charts, export_details_key="by_status", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/revenue-recognition")
async def get_revenue_recognition(
    period: str = Query("month"), format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    data = await FinancialReportService(db).get_revenue_recognition_report(period=period)
    return await generate_report_response(db, data, "reports/base_report.html", "Revenue Recognition", format, "revenue_recognition", export_details_key="details", generated_by=current_user.id)


@router.get("/tax-summary")
async def get_tax_summary(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await FinancialReportService(db).get_tax_summary_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Tax Summary", format, "tax_summary", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/profit-margin")
async def get_profit_margin(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await FinancialReportService(db).get_profit_margin_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Profit Margin", format, "profit_margin", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)

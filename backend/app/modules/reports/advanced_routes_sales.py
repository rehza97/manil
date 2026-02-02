"""Advanced report routes: Sales (4 reports)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User

from .sales_report_service import SalesReportService
from .advanced_routes_helpers import generate_report_response


router = APIRouter(prefix="/sales", tags=["reports-advanced-sales"])


def _parse_dates(start_date: Optional[str], end_date: Optional[str]):
    start = datetime.fromisoformat(start_date.replace(
        "Z", "+00:00")) if start_date else None
    end = datetime.fromisoformat(end_date.replace(
        "Z", "+00:00")) if end_date else datetime.now(timezone.utc)
    return start, end


@router.get("/quote-conversion")
async def get_quote_conversion(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await SalesReportService(db).get_quote_conversion_report(start, end)
    return await generate_report_response(db, data, "reports/sales/quote_conversion.html", "Quote Conversion", format, "quote_conversion", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/order-pipeline")
async def get_order_pipeline(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]), include_charts: bool = True,
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await SalesReportService(db).get_order_pipeline_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Order Pipeline", format, "order_pipeline", export_details_key="by_status", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/product-performance")
async def get_product_performance(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await SalesReportService(db).get_product_performance_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Product Performance", format, "product_performance", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)


@router.get("/customer-purchase-patterns")
async def get_customer_purchase_patterns(
    start_date: Optional[str] = None, end_date: Optional[str] = None,
    format: str = Query("pdf", enum=["pdf", "excel", "csv"]),
    current_user: User = Depends(require_permission(Permission.REPORTS_VIEW)),
    db: AsyncSession = Depends(get_db),
):
    start, end = _parse_dates(start_date, end_date)
    data = await SalesReportService(db).get_customer_purchase_patterns_report(start, end)
    return await generate_report_response(db, data, "reports/base_report.html", "Customer Purchase Patterns", format, "customer_patterns", export_details_key="details", generated_by=current_user.id, start_date=start, end_date=end)

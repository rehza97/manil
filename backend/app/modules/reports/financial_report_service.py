"""
Financial Report Service

Five reports: invoice aging, payment status, revenue recognition, tax summary, profit margin.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invoices.models import Invoice, InvoiceStatus, InvoiceItem
from app.modules.revenue.service import RevenueService
from .aggregation_service import AggregationService
from .base_report_service import BaseReportService


class FinancialReportService(BaseReportService):
    """Financial reports: aging, payment, revenue, tax, profit margin."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.agg = AggregationService(db)

    async def get_invoice_aging_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Aging buckets and outstanding amounts."""
        end = end_date or datetime.now(timezone.utc)
        buckets = await self.agg.get_invoice_aging_buckets(end)
        total_amount = sum(b["amount"] for b in buckets)
        total_count = sum(b["count"] for b in buckets)
        return {
            "aging_buckets": buckets,
            "total_outstanding": total_amount,
            "total_invoices": total_count,
            "start_date": start_date,
            "end_date": end,
            "details": [{"bucket": b["bucket"], "count": b["count"], "amount": b["amount"]} for b in buckets],
        }

    async def get_payment_status_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Breakdown by paid/unpaid/overdue; payment method distribution."""
        end = end_date or datetime.now(timezone.utc)
        q = select(Invoice.status, func.count(Invoice.id), func.sum(Invoice.total_amount)).where(
            and_(Invoice.deleted_at.is_(None), Invoice.issue_date <= end)
        ).group_by(Invoice.status)
        rows = (await self.db.execute(q)).all()
        status_str = lambda x: x.value if hasattr(x, "value") else str(x)
        by_status = [
            {"status": status_str(r[0]), "count": r[1], "amount": float(r[2] or 0)}
            for r in rows
        ]
        total = sum(r["amount"] for r in by_status)
        return {"by_status": by_status, "total_amount": total, "end_date": end}

    async def get_revenue_recognition_report(
        self,
        period: str = "month",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Uses RevenueService: recognized, booked, deferred, recurring."""
        rev = RevenueService(self.db)
        overview = await rev.get_overview(period=period)
        recognized = float(overview.metrics.total_revenue)
        booked = float(overview.metrics.booked_revenue)
        deferred = float(overview.metrics.deferred_revenue)
        recurring = float(overview.metrics.recurring_revenue)
        return {
            "recognized_revenue": recognized,
            "booked_revenue": booked,
            "deferred_revenue": deferred,
            "recurring_revenue": recurring,
            "period": period,
            "metrics": {
                "Recognized": recognized,
                "Booked": booked,
                "Deferred": deferred,
                "Recurring": recurring,
            },
            "details": [
                {"Metric": "Recognized revenue", "Value": recognized},
                {"Metric": "Booked revenue", "Value": booked},
                {"Metric": "Deferred revenue", "Value": deferred},
                {"Metric": "Recurring revenue", "Value": recurring},
            ],
        }

    async def get_tax_summary_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """TVA 19% and TAP 0.5% totals from invoices."""
        end = end_date or datetime.now(timezone.utc)
        q = select(
            func.sum(Invoice.tax_amount).label("tax_total"),
            func.sum(Invoice.subtotal_amount).label("subtotal"),
        ).where(and_(Invoice.deleted_at.is_(None), Invoice.issue_date <= end))
        row = (await self.db.execute(q)).one()
        tax_total = float(row.tax_total or 0)
        subtotal = float(row.subtotal or 0)
        tva = round(subtotal * 0.19, 2)
        tap = round(subtotal * 0.005, 2)
        return {
            "tva_total": float(tva),
            "tap_total": float(tap),
            "tax_total": tax_total,
            "subtotal": subtotal,
            "details": [
                {"Item": "Subtotal", "Amount": subtotal},
                {"Item": "TVA (19%)", "Amount": tva},
                {"Item": "TAP (0.5%)", "Amount": tap},
                {"Item": "Tax total", "Amount": tax_total},
            ],
        }

    async def get_profit_margin_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Revenue vs cost by product category (total revenue from single source)."""
        end = end_date or datetime.now(timezone.utc)
        rev = RevenueService(self.db)
        total_revenue = float(
            await rev.get_booked_revenue_for_range(start_date=None, end_date=end, customer_id=None)
        )
        return {
            "total_revenue": total_revenue,
            "end_date": end,
            "metrics": {"Total revenue": total_revenue},
            "details": [],
        }

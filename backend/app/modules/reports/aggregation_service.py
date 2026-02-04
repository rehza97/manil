"""
Aggregation Service

Cross-module SQL queries used by multiple report services.
Returns dicts/lists of primitives. Kept under 150 lines.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invoices.models import Invoice, InvoiceStatus
from app.modules.quotes.models import Quote, QuoteStatus
from app.modules.orders.models import Order
from app.modules.tickets.models import Ticket, TicketReply
from app.modules.auth.models import User


class AggregationService:
    """Shared aggregation queries for reports."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_invoice_aging_buckets(
        self, end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Outstanding invoices by aging bucket: current, 1-30, 31-60, 61-90, 90+ days."""
        end = end_date or datetime.now(timezone.utc)
        end = end.replace(tzinfo=timezone.utc) if end.tzinfo is None else end
        q = select(Invoice).where(
            and_(
                Invoice.deleted_at.is_(None),
                Invoice.status.in_(
                    [InvoiceStatus.ISSUED.value, InvoiceStatus.SENT.value,
                     InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]
                ),
                Invoice.due_date <= end,
            )
        )
        result = await self.db.execute(q)
        invoices = result.scalars().all()
        buckets = {"current": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
        amounts = {k: float(0) for k in buckets}
        for inv in invoices:
            due = inv.due_date.replace(
                tzinfo=timezone.utc) if inv.due_date.tzinfo is None else inv.due_date
            days = (end - due).days
            outstanding = float(inv.total_amount - inv.paid_amount)
            if days <= 0:
                key = "current"
            elif days <= 30:
                key = "1-30"
            elif days <= 60:
                key = "31-60"
            elif days <= 90:
                key = "61-90"
            else:
                key = "90+"
            buckets[key] += 1
            amounts[key] += outstanding
        return [
            {"bucket": k, "count": v, "amount": amounts[k]}
            for k, v in buckets.items()
        ]

    async def get_conversion_rates(
        self, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """Quote-to-order conversion: total quotes, converted, accepted, orders created."""
        q_quotes = select(func.count(Quote.id)).where(
            and_(
                Quote.deleted_at.is_(None),
                Quote.created_at >= start_date,
                Quote.created_at <= end_date,
            )
        )
        total_quotes = (await self.db.scalar(q_quotes)) or 0
        q_converted = select(func.count(Quote.id)).where(
            and_(
                Quote.deleted_at.is_(None),
                Quote.created_at >= start_date,
                Quote.created_at <= end_date,
                Quote.status == QuoteStatus.CONVERTED.value,
            )
        )
        converted = (await self.db.scalar(q_converted)) or 0
        q_orders = select(func.count(Order.id)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.created_at >= start_date,
                Order.created_at <= end_date,
                Order.quote_id.isnot(None),
            )
        )
        orders_from_quotes = (await self.db.scalar(q_orders)) or 0
        rate = (converted / total_quotes * 100) if total_quotes else 0
        return {
            "total_quotes": total_quotes,
            "converted_quotes": converted,
            "orders_from_quotes": orders_from_quotes,
            "conversion_rate": round(rate, 2),
        }

    async def get_sla_compliance_metrics(
        self, priority: Optional[str] = None
    ) -> Dict[str, Any]:
        """Count tickets meeting/breaching response and resolution SLA (simplified)."""
        conditions = [Ticket.deleted_at.is_(
            None), Ticket.resolved_at.isnot(None)]
        if priority:
            conditions.append(Ticket.priority == priority)
        q = select(
            func.count(Ticket.id).label("total"),
            func.count(case((Ticket.first_response_at.isnot(None), 1))).label(
                "with_response"),
        ).where(and_(*conditions))
        row = (await self.db.execute(q)).one()
        total = row.total or 0
        with_response = row.with_response or 0
        return {
            "total_resolved": total,
            "with_first_response": with_response,
            "response_rate": round((with_response / total * 100), 2) if total else 0,
        }

    async def get_agent_performance_metrics(
        self, agent_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Tickets per agent: count resolved, avg time (placeholder for resolution time)."""
        q = select(
            Ticket.assigned_to,
            func.count(Ticket.id).label("count"),
        ).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.assigned_to.isnot(None),
                Ticket.status.in_(["resolved", "closed"]),
            )
        ).group_by(Ticket.assigned_to)
        if agent_id:
            q = q.where(Ticket.assigned_to == agent_id)
        result = await self.db.execute(q)
        rows = result.all()
        return [
            {"agent_id": str(r.assigned_to), "ticket_count": r.count}
            for r in rows
        ]

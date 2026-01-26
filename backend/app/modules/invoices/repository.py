"""
Invoice repository layer.

Handles database operations for invoices.
"""
from typing import List, Tuple, Optional
from datetime import datetime, timezone

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceTimeline, InvoiceStatus


class InvoiceRepository:
    """Repository for invoice database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        status: Optional[InvoiceStatus] = None,
        quote_id: Optional[str] = None,
        overdue_only: bool = False,
    ) -> Tuple[List[Invoice], int]:
        """Get all invoices with filters and pagination."""
        # Build query
        query = select(Invoice).where(Invoice.deleted_at.is_(None))

        # Apply filters
        if customer_id:
            query = query.where(Invoice.customer_id == customer_id)
        if status:
            query = query.where(Invoice.status == status)
        if quote_id:
            query = query.where(Invoice.quote_id == quote_id)
        if overdue_only:
            now = datetime.now(timezone.utc)
            query = query.where(
                and_(
                    Invoice.due_date < now,
                    Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID])
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination and load relationships
        query = query.options(
            selectinload(Invoice.items),
            selectinload(Invoice.customer),
            selectinload(Invoice.quote)
        ).offset(skip).limit(limit).order_by(Invoice.created_at.desc())

        result = await self.db.execute(query)
        invoices = result.scalars().all()

        return list(invoices), total

    async def get_by_id(self, invoice_id: str) -> Optional[Invoice]:
        """Get invoice by ID with relationships loaded."""
        query = select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.deleted_at.is_(None)
        ).options(
            selectinload(Invoice.items),
            selectinload(Invoice.customer),
            selectinload(Invoice.quote),
            selectinload(Invoice.timeline_events)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_invoice_number(self, invoice_number: str) -> Optional[Invoice]:
        """Get invoice by invoice number."""
        query = select(Invoice).where(
            Invoice.invoice_number == invoice_number,
            Invoice.deleted_at.is_(None)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, invoice: Invoice) -> Invoice:
        """Create a new invoice."""
        self.db.add(invoice)
        await self.db.flush()
        await self.db.refresh(invoice)
        return invoice

    async def update(self, invoice: Invoice) -> Invoice:
        """Update an existing invoice."""
        invoice.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(invoice)
        return invoice

    async def delete(self, invoice: Invoice) -> None:
        """Soft delete an invoice."""
        invoice.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def add_timeline_event(self, event: InvoiceTimeline) -> InvoiceTimeline:
        """Add timeline event to invoice."""
        self.db.add(event)
        await self.db.flush()
        await self.db.refresh(event)
        return event

    async def get_overdue_invoices(self) -> List[Invoice]:
        """Get all overdue invoices."""
        now = datetime.now(timezone.utc)
        query = select(Invoice).where(
            Invoice.deleted_at.is_(None),
            Invoice.due_date < now,
            Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID])
        ).options(selectinload(Invoice.items))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_statistics(self, customer_id: Optional[str] = None) -> dict:
        """Get invoice statistics."""
        # Build base query
        base_query = select(Invoice).where(Invoice.deleted_at.is_(None))

        if customer_id:
            base_query = base_query.where(Invoice.customer_id == customer_id)

        # Total invoices
        total_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total_invoices = total_result.scalar_one()

        # Count by status
        stats_query = select(
            Invoice.status,
            func.count(Invoice.id).label('count'),
            func.sum(Invoice.total_amount).label('total')
        ).where(Invoice.deleted_at.is_(None))

        if customer_id:
            stats_query = stats_query.where(Invoice.customer_id == customer_id)

        stats_query = stats_query.group_by(Invoice.status)
        stats_result = await self.db.execute(stats_query)
        status_stats = stats_result.all()

        # Build statistics dictionary
        stats = {
            'total_invoices': total_invoices,
            'draft_count': 0,
            'issued_count': 0,
            'sent_count': 0,
            'paid_count': 0,
            'overdue_count': 0,
            'total_revenue': 0,
            'total_outstanding': 0,
        }

        for status, count, total in status_stats:
            if status == InvoiceStatus.DRAFT:
                stats['draft_count'] = count
            elif status == InvoiceStatus.ISSUED:
                stats['issued_count'] = count
                stats['total_outstanding'] += float(total or 0)
            elif status == InvoiceStatus.SENT:
                stats['sent_count'] = count
                stats['total_outstanding'] += float(total or 0)
            elif status == InvoiceStatus.PAID:
                stats['paid_count'] = count
                # Note: total_revenue will be calculated using RevenueService below
            elif status == InvoiceStatus.OVERDUE:
                stats['overdue_count'] = count
                stats['total_outstanding'] += float(total or 0)

        # Calculate total revenue using RevenueService for consistency
        from app.modules.revenue.service import RevenueService
        revenue_service = RevenueService(self.db)
        revenue_overview = await revenue_service.get_overview(period="year", customer_id=customer_id)
        stats['total_revenue'] = float(revenue_overview.metrics.total_revenue)

        return stats

"""
Invoice service layer.

Business logic for invoice management, CRUD operations, and conversions.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Tuple, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceTimeline, InvoiceStatus, PaymentMethod
from app.modules.invoices.repository import InvoiceRepository
from app.modules.invoices.schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceItemCreate,
    InvoicePaymentRequest,
    InvoiceConvertFromQuoteRequest,
)
from app.modules.quotes.models import Quote
from app.modules.quotes.service import QuoteService


class InvoiceService:
    """Service for invoice business logic."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = InvoiceRepository(db)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        status: Optional[InvoiceStatus] = None,
        quote_id: Optional[str] = None,
        overdue_only: bool = False,
    ) -> Tuple[List[Invoice], int]:
        """Get all invoices with filters."""
        return await self.repository.get_all(
            skip=skip,
            limit=limit,
            customer_id=customer_id,
            status=status,
            quote_id=quote_id,
            overdue_only=overdue_only,
        )

    async def get_by_id(self, invoice_id: str) -> Invoice:
        """Get invoice by ID."""
        invoice = await self.repository.get_by_id(invoice_id)
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice {invoice_id} not found"
            )
        return invoice

    async def create(self, invoice_data: InvoiceCreate, created_by_id: str) -> Invoice:
        """Create a new invoice."""
        # Generate invoice number
        invoice_number = await self._generate_invoice_number()

        # Calculate totals
        subtotal, tax_amount, total = self._calculate_totals(
            invoice_data.items,
            invoice_data.tax_rate,
            invoice_data.discount_amount
        )

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            quote_id=invoice_data.quote_id,
            customer_id=invoice_data.customer_id,
            title=invoice_data.title,
            description=invoice_data.description,
            status=InvoiceStatus.DRAFT,
            subtotal_amount=subtotal,
            tax_rate=invoice_data.tax_rate,
            tax_amount=tax_amount,
            discount_amount=invoice_data.discount_amount,
            total_amount=total,
            paid_amount=Decimal("0.00"),
            issue_date=invoice_data.issue_date,
            due_date=invoice_data.due_date,
            notes=invoice_data.notes,
            created_by_id=created_by_id,
        )

        # Add items
        for item_data in invoice_data.items:
            line_total = Decimal(str(item_data.quantity)) * item_data.unit_price
            item = InvoiceItem(
                invoice=invoice,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                line_total=line_total,
                product_id=item_data.product_id,
            )
            invoice.items.append(item)

        # Save to database
        invoice = await self.repository.create(invoice)

        # Add timeline event
        await self._add_timeline_event(
            invoice.id,
            "created",
            f"Invoice {invoice.invoice_number} created",
            created_by_id
        )

        await self.db.commit()
        return invoice

    async def update(self, invoice_id: str, invoice_data: InvoiceUpdate) -> Invoice:
        """Update an existing invoice."""
        invoice = await self.get_by_id(invoice_id)

        # Check if invoice can be edited
        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot edit invoice with status {invoice.status.value}"
            )

        # Update fields
        if invoice_data.title is not None:
            invoice.title = invoice_data.title
        if invoice_data.description is not None:
            invoice.description = invoice_data.description
        if invoice_data.notes is not None:
            invoice.notes = invoice_data.notes
        if invoice_data.due_date is not None:
            invoice.due_date = invoice_data.due_date

        # Update financial fields if items provided
        if invoice_data.items is not None:
            # Remove old items
            invoice.items.clear()

            # Add new items
            for item_data in invoice_data.items:
                line_total = Decimal(str(item_data.quantity)) * item_data.unit_price
                item = InvoiceItem(
                    invoice=invoice,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    line_total=line_total,
                    product_id=item_data.product_id,
                )
                invoice.items.append(item)

        # Recalculate if needed
        if invoice_data.items or invoice_data.tax_rate or invoice_data.discount_amount:
            tax_rate = invoice_data.tax_rate if invoice_data.tax_rate is not None else invoice.tax_rate
            discount = invoice_data.discount_amount if invoice_data.discount_amount is not None else invoice.discount_amount

            subtotal, tax_amount, total = self._calculate_totals(
                invoice.items if invoice_data.items else [
                    InvoiceItemCreate(
                        description=item.description,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        product_id=item.product_id
                    ) for item in invoice.items
                ],
                tax_rate,
                discount
            )

            invoice.subtotal_amount = subtotal
            invoice.tax_rate = tax_rate
            invoice.tax_amount = tax_amount
            invoice.discount_amount = discount
            invoice.total_amount = total

        invoice = await self.repository.update(invoice)
        await self.db.commit()

        return invoice

    async def delete(self, invoice_id: str) -> None:
        """Delete an invoice (soft delete)."""
        invoice = await self.get_by_id(invoice_id)

        if invoice.status == InvoiceStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete paid invoice"
            )

        await self.repository.delete(invoice)
        await self.db.commit()

    def _calculate_totals(
        self,
        items: List[InvoiceItemCreate],
        tax_rate: Decimal,
        discount_amount: Decimal
    ) -> Tuple[Decimal, Decimal, Decimal]:
        """Calculate invoice totals."""
        subtotal = sum(
            Decimal(str(item.quantity)) * item.unit_price
            for item in items
        )

        # Apply discount
        after_discount = subtotal - discount_amount

        # Calculate tax
        tax_amount = (after_discount * tax_rate) / Decimal("100")

        # Calculate total
        total = after_discount + tax_amount

        return subtotal, tax_amount, total

    async def _generate_invoice_number(self) -> str:
        """Generate unique invoice number (INV-YYYYMMDD-XXXX)."""
        today = datetime.now(timezone.utc)
        date_str = today.strftime("%Y%m%d")

        # Find highest number for today
        from sqlalchemy import select, func
        query = select(func.max(Invoice.invoice_number)).where(
            Invoice.invoice_number.like(f"INV-{date_str}-%")
        )
        result = await self.db.execute(query)
        max_number = result.scalar_one_or_none()

        if max_number:
            # Extract sequence number and increment
            seq = int(max_number.split("-")[-1]) + 1
        else:
            seq = 1

        return f"INV-{date_str}-{seq:04d}"

    async def _add_timeline_event(
        self,
        invoice_id: str,
        event_type: str,
        description: str,
        user_id: Optional[str] = None
    ) -> InvoiceTimeline:
        """Add timeline event."""
        event = InvoiceTimeline(
            invoice_id=invoice_id,
            event_type=event_type,
            description=description,
            user_id=user_id,
        )
        return await self.repository.add_timeline_event(event)

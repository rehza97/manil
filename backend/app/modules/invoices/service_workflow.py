"""
Invoice workflow service.

Business logic for invoice status transitions, payments, and quote conversion.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceStatus
from app.modules.invoices.repository import InvoiceRepository
from app.modules.invoices.service import InvoiceService
from app.modules.invoices.schemas import (
    InvoicePaymentRequest,
    InvoiceConvertFromQuoteRequest,
    InvoiceItemCreate,
    InvoiceCreate,
)
from app.modules.invoices.pdf_service import InvoicePDFService
from app.modules.quotes.models import Quote, QuoteStatus
from app.modules.quotes.repository import QuoteRepository
from app.modules.customers.models import Customer
from app.infrastructure.email.service import EmailService


class InvoiceWorkflowService:
    """Service for invoice workflow operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = InvoiceRepository(db)
        self.base_service = InvoiceService(db)
        self.quote_repository = QuoteRepository(db)

    async def issue_invoice(self, invoice_id: str, issued_by_id: str) -> Invoice:
        """Issue a draft invoice."""
        invoice = await self.base_service.get_by_id(invoice_id)

        if invoice.status != InvoiceStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot issue invoice with status {invoice.status.value}"
            )

        invoice.status = InvoiceStatus.ISSUED
        invoice = await self.repository.update(invoice)

        await self.base_service._add_timeline_event(
            invoice.id,
            "issued",
            f"Invoice {invoice.invoice_number} issued",
            issued_by_id
        )

        await self.db.commit()
        return invoice

    async def send_invoice(self, invoice_id: str, sent_by_id: str, send_email: bool = True) -> Invoice:
        """Send invoice to customer."""
        invoice = await self.base_service.get_by_id(invoice_id)

        if invoice.status not in [InvoiceStatus.ISSUED, InvoiceStatus.DRAFT]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot send invoice with status {invoice.status.value}"
            )

        invoice.status = InvoiceStatus.SENT
        invoice.sent_at = datetime.now(timezone.utc)
        invoice = await self.repository.update(invoice)

        await self.base_service._add_timeline_event(
            invoice.id,
            "sent",
            f"Invoice {invoice.invoice_number} sent to customer",
            sent_by_id
        )

        # Send email if requested
        if send_email:
            await self._send_invoice_email(invoice)

        await self.db.commit()
        return invoice

    async def _send_invoice_email(self, invoice: Invoice) -> bool:
        """
        Send invoice by email with PDF attachment.

        Args:
            invoice: Invoice instance with items loaded

        Returns:
            True if email sent successfully
        """
        # Get customer data
        customer_query = select(Customer).where(Customer.id == invoice.customer_id)
        result = await self.db.execute(customer_query)
        customer = result.scalar_one_or_none()

        if not customer or not customer.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer email not found"
            )

        # Generate PDF
        pdf_service = InvoicePDFService()
        customer_data = {
            'name': customer.name,
            'email': customer.email,
            'phone': customer.phone or 'N/A',
            'address': customer.address or 'N/A',
            'city': customer.city or 'N/A',
        }
        pdf_path = pdf_service.generate_invoice_pdf(invoice, customer_data)

        # Send email with attachment
        email_service = EmailService()
        due_date = invoice.due_date.strftime('%d/%m/%Y')

        success = await email_service.send_invoice_email(
            to=customer.email,
            invoice_number=invoice.invoice_number,
            customer_name=customer.name,
            title=invoice.title,
            total_amount=float(invoice.total_amount),
            due_date=due_date,
            pdf_path=pdf_path,
        )

        if success:
            await self.base_service._add_timeline_event(
                invoice.id,
                "email_sent",
                f"Invoice emailed to {customer.email}",
                "system"
            )

        return success

    async def record_payment(
        self,
        invoice_id: str,
        payment_data: InvoicePaymentRequest,
        recorded_by_id: str
    ) -> Invoice:
        """Record a payment for an invoice."""
        invoice = await self.base_service.get_by_id(invoice_id)

        if invoice.status in [InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot record payment for invoice with status {invoice.status.value}"
            )

        # Calculate new paid amount
        new_paid_amount = invoice.paid_amount + payment_data.amount

        if new_paid_amount > invoice.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount exceeds invoice total (remaining: {invoice.total_amount - invoice.paid_amount})"
            )

        invoice.paid_amount = new_paid_amount
        invoice.payment_method = payment_data.payment_method

        # Update status
        if new_paid_amount >= invoice.total_amount:
            invoice.status = InvoiceStatus.PAID
            invoice.paid_at = payment_data.payment_date
            event_desc = f"Invoice {invoice.invoice_number} fully paid ({payment_data.amount} DZD via {payment_data.payment_method.value})"
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID
            event_desc = f"Partial payment recorded for invoice {invoice.invoice_number} ({payment_data.amount} DZD via {payment_data.payment_method.value})"

        if payment_data.payment_notes:
            invoice.payment_notes = payment_data.payment_notes

        invoice = await self.repository.update(invoice)

        await self.base_service._add_timeline_event(
            invoice.id,
            "payment_recorded",
            event_desc,
            recorded_by_id
        )

        # If invoice is fully paid and linked to VPS subscription, trigger webhook
        if new_paid_amount >= invoice.total_amount and invoice.vps_subscription_id:
            try:
                from app.modules.hosting.services.billing_service import SubscriptionBillingService
                billing_service = SubscriptionBillingService(self.db)
                await billing_service.process_payment_webhook(invoice.id)
            except Exception as e:
                from app.core.logging import logger
                logger.error(f"VPS payment webhook failed for invoice {invoice.id}: {e}")
                # Don't fail payment recording if webhook fails

        await self.db.commit()
        return invoice

    async def cancel_invoice(self, invoice_id: str, cancelled_by_id: str) -> Invoice:
        """Cancel an invoice."""
        invoice = await self.base_service.get_by_id(invoice_id)

        if invoice.status == InvoiceStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel paid invoice"
            )

        invoice.status = InvoiceStatus.CANCELLED
        invoice = await self.repository.update(invoice)

        await self.base_service._add_timeline_event(
            invoice.id,
            "cancelled",
            f"Invoice {invoice.invoice_number} cancelled",
            cancelled_by_id
        )

        await self.db.commit()
        return invoice

    async def convert_quote_to_invoice(
        self,
        conversion_data: InvoiceConvertFromQuoteRequest,
        created_by_id: str
    ) -> Invoice:
        """Convert a quote to an invoice."""
        # Get quote
        quote = await self.quote_repository.get_by_id(conversion_data.quote_id)
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quote {conversion_data.quote_id} not found"
            )

        # Verify quote is accepted
        if quote.status != QuoteStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot convert quote with status {quote.status.value}. Quote must be accepted."
            )

        # Check if quote already converted
        existing = await self.repository.get_all(quote_id=quote.id)
        if existing[1] > 0:  # total count
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quote {quote.quote_number} has already been converted to an invoice"
            )

        # Create invoice from quote
        invoice_items = [
            InvoiceItemCreate(
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                product_id=item.product_id,
            )
            for item in quote.items
        ]

        invoice_data = InvoiceCreate(
            customer_id=quote.customer_id,
            quote_id=quote.id,
            title=quote.title,
            description=quote.description or f"Invoice for Quote {quote.quote_number}",
            tax_rate=quote.tax_rate,
            discount_amount=quote.discount_amount,
            notes=conversion_data.notes,
            items=invoice_items,
            issue_date=conversion_data.issue_date,
            due_date=conversion_data.due_date,
        )

        # Create invoice
        invoice = await self.base_service.create(invoice_data, created_by_id)

        # Update quote status
        quote.status = QuoteStatus.CONVERTED
        await self.quote_repository.update(quote)

        # Add timeline event
        await self.base_service._add_timeline_event(
            invoice.id,
            "converted_from_quote",
            f"Invoice {invoice.invoice_number} created from quote {quote.quote_number}",
            created_by_id
        )

        await self.db.commit()
        return invoice

    async def update_overdue_invoices(self) -> int:
        """Update status of overdue invoices."""
        overdue_invoices = await self.repository.get_overdue_invoices()

        count = 0
        for invoice in overdue_invoices:
            invoice.status = InvoiceStatus.OVERDUE
            await self.repository.update(invoice)

            await self.base_service._add_timeline_event(
                invoice.id,
                "overdue",
                f"Invoice {invoice.invoice_number} marked as overdue",
                None
            )
            count += 1

        await self.db.commit()
        return count

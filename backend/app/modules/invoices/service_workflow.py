"""
Invoice workflow service.

Business logic for invoice status transitions, payments, and quote conversion.
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceStatus, InvoicePayment
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
from app.modules.notifications.service import user_id_by_email, create_notification
from app.modules.settings.service import UserNotificationPreferencesService
from app.modules.settings.utils import notification_gate_allows
from app.infrastructure.sms.service import SMSService
from app.core.logging import logger


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
            await self._send_invoice_email(invoice, sent_by_id=sent_by_id)

        await self.db.commit()
        return invoice

    async def _send_invoice_email(self, invoice: Invoice, sent_by_id: Optional[str] = None) -> bool:
        """
        Send invoice by email with PDF attachment.

        Args:
            invoice: Invoice instance with items loaded
            sent_by_id: User id for timeline (must exist in users; use None for system)

        Returns:
            True if email sent successfully
        """
        # Get customer data
        customer_query = select(Customer).where(
            Customer.id == invoice.customer_id)
        result = await self.db.execute(customer_query)
        customer = result.scalar_one_or_none()

        if not customer or not customer.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer email not found"
            )

        if not await notification_gate_allows(self.db, "email", "invoice.sent"):
            return False

        uid = await user_id_by_email(self.db, customer.email)
        if uid:
            prefs_svc = UserNotificationPreferencesService(self.db)
            prefs = await prefs_svc.get(uid)
            if not prefs.get("email", {}).get("invoiceUpdates", True):
                return False

        # Get company info from DB
        from app.modules.settings.utils import get_company_info_for_pdf
        company_info = await get_company_info_for_pdf(self.db)

        # Generate PDF
        try:
            pdf_service = InvoicePDFService()
            customer_data = {
                'name': customer.name,
                'email': customer.email,
                'phone': customer.phone or 'N/A',
                'address': customer.address or 'N/A',
                'city': customer.city or 'N/A',
            }
            pdf_path = pdf_service.generate_invoice_pdf(
                invoice, customer_data, company_info=company_info)
        except Exception as e:
            logger.error(f"Failed to generate invoice PDF: {e}", exc_info=True)
            # Continue without PDF attachment rather than failing email send
            pdf_path = None

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
            db=self.db,
        )

        if success and sent_by_id:
            await self.base_service._add_timeline_event(
                invoice.id,
                "email_sent",
                f"Invoice emailed to {customer.email}",
                sent_by_id,
            )

            if (
                customer.phone
                and customer.phone.strip()
                and await notification_gate_allows(self.db, "sms", "invoice.sent")
            ):
                try:
                    if uid:
                        prefs_svc = UserNotificationPreferencesService(self.db)
                        prefs = await prefs_svc.get(uid)
                        if prefs.get("sms", {}).get("invoiceUpdates", False):
                            sms_service = SMSService()
                            await sms_service.send_invoice_notification(
                                customer.phone,
                                invoice.invoice_number,
                                float(invoice.total_amount),
                                due_date,
                                db=self.db,
                            )
                except Exception as e:
                    logger.warning("Invoice SMS notification failed: %s", e)

            # In-app notification for invoice sent
            try:
                if uid:
                    await create_notification(
                        self.db,
                        uid,
                        "invoice_sent",
                        f"Invoice {invoice.invoice_number} Sent",
                        body=f"Invoice for {float(invoice.total_amount):.2f} DZD has been sent. Due: {due_date}",
                        link=f"/invoices/{invoice.id}",
                    )
            except Exception as e:
                logger.warning(
                    "In-app invoice sent notification failed: %s", e)

        return success

    async def record_payment(
        self,
        invoice_id: str,
        payment_data: InvoicePaymentRequest,
        recorded_by_id: str
    ) -> Invoice:
        """Record a payment for an invoice. Idempotent when idempotency_key is provided."""
        invoice = await self.base_service.get_by_id(invoice_id)

        if payment_data.idempotency_key:
            q = select(InvoicePayment).where(
                InvoicePayment.invoice_id == invoice_id,
                InvoicePayment.idempotency_key == payment_data.idempotency_key,
            )
            result = await self.db.execute(q)
            existing = result.scalar_one_or_none()
            if existing:
                return invoice

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

        payment_record = InvoicePayment(
            invoice_id=invoice.id,
            amount=payment_data.amount,
            payment_method=payment_data.payment_method.value,
            payment_date=payment_data.payment_date,
            recorded_by_id=recorded_by_id,
            idempotency_key=payment_data.idempotency_key,
        )
        self.db.add(payment_record)

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
                logger.error(
                    f"VPS payment webhook failed for invoice {invoice.id}: {e}")
                # Don't fail payment recording if webhook fails

        try:
            customer_query = select(Customer).where(
                Customer.id == invoice.customer_id)
            result = await self.db.execute(customer_query)
            customer = result.scalar_one_or_none()

            # Send email notification for payment received
            if (
                customer
                and customer.email
                and await notification_gate_allows(
                    self.db, "email", "invoice.payment_received", skip_quiet_hours=True
                )
            ):
                try:
                    uid = await user_id_by_email(self.db, customer.email)
                    if uid:
                        prefs_svc = UserNotificationPreferencesService(self.db)
                        prefs = await prefs_svc.get(uid)
                        if prefs.get("email", {}).get("invoiceUpdates", True):
                            email_service = EmailService()
                            payment_date_str = payment_data.payment_date.strftime(
                                '%d/%m/%Y') if payment_data.payment_date else datetime.utcnow().strftime('%d/%m/%Y')
                            invoice_link = f"https://cloudmanager.dz/invoices/{invoice.id}"
                            await email_service.send_payment_confirmation(
                                to=customer.email,
                                customer_name=customer.name or customer.email,
                                invoice_number=invoice.invoice_number,
                                payment_amount=float(payment_data.amount),
                                payment_date=payment_date_str,
                                invoice_link=invoice_link,
                                db=self.db,
                            )
                except Exception as e:
                    logger.warning(
                        "Payment confirmation email notification failed: %s", e)

            # Send SMS notification for payment received
            if (
                customer
                and customer.phone
                and customer.phone.strip()
                and await notification_gate_allows(
                    self.db, "sms", "invoice.payment_received", skip_quiet_hours=True
                )
            ):
                uid = await user_id_by_email(self.db, customer.email)
                if uid:
                    prefs_svc = UserNotificationPreferencesService(self.db)
                    prefs = await prefs_svc.get(uid)
                    if prefs.get("sms", {}).get("invoiceUpdates", False):
                        sms_service = SMSService()
                        await sms_service.send_payment_confirmation(
                            to=customer.phone,
                            invoice_number=invoice.invoice_number,
                            amount=payment_data.amount,
                            db=self.db,
                        )

            # In-app notification for payment received
            uid = await user_id_by_email(self.db, customer.email) if customer and customer.email else None
            if uid:
                try:
                    is_fully_paid = new_paid_amount >= invoice.total_amount
                    status_text = "fully paid" if is_fully_paid else f"partially paid ({float(payment_data.amount):.2f} DZD received)"
                    await create_notification(
                        self.db,
                        uid,
                        "invoice_payment_received",
                        f"Payment Received - Invoice {invoice.invoice_number}",
                        body=f"Invoice {invoice.invoice_number} is {status_text}. Thank you!",
                        link=f"/invoices/{invoice.id}",
                    )
                except Exception as e:
                    logger.warning(
                        "In-app payment received notification failed: %s", e)
        except Exception as e:
            logger.warning(
                "Payment confirmation SMS notification failed: %s", e)

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

        # Verify quote is accepted/approved; allow CONVERTED so invoice+order can both be created
        if quote.status not in (QuoteStatus.ACCEPTED, QuoteStatus.APPROVED, QuoteStatus.CONVERTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quote must be accepted or approved.",
            )

        # Check if quote already converted
        existing = await self.repository.get_all(quote_id=quote.id)
        if existing[1] > 0:  # total count
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quote {quote.quote_number} has already been converted to an invoice"
            )

        # Default issue_date and due_date when not provided
        now = datetime.now(timezone.utc)
        issue_date = conversion_data.issue_date or now
        if conversion_data.due_date is not None:
            due_date = conversion_data.due_date
        elif quote.valid_until and quote.valid_until >= now:
            due_date = quote.valid_until
        else:
            due_date = issue_date + timedelta(days=30)

        # Create invoice from quote (quote item description can be None; InvoiceItemCreate requires a string)
        invoice_items = [
            InvoiceItemCreate(
                description=(item.description or item.item_name or "Item").strip() or "Item",
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
            issue_date=issue_date,
            due_date=due_date,
        )

        # Create invoice (allow quote line items without product, e.g. setup fees)
        invoice = await self.base_service.create(
            invoice_data, created_by_id, allow_custom_items=True
        )

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

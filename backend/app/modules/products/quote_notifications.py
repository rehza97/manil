"""
Quote request email notifications.
Handles sending emails for quote events and status changes.
"""
import logging
import asyncio
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.email.service import EmailService
from app.infrastructure.email import templates
from app.infrastructure.sms.service import SMSService
from app.modules.products.quote_models import QuoteRequest, ServiceRequest
from app.modules.customers.models import Customer
from app.modules.notifications.service import user_id_by_email, create_notification
from app.modules.settings.service import UserNotificationPreferencesService
from app.modules.settings.utils import notification_gate_allows
from app.config.settings import get_settings
from sqlalchemy import select

logger = logging.getLogger(__name__)
email_service = EmailService()
settings = get_settings()


class QuoteNotificationService:
    """Service for sending quote-related email notifications."""

    @staticmethod
    async def send_quote_creation_notification(
        db: AsyncSession, quote: QuoteRequest, frontend_url: str = "http://localhost:3000"
    ) -> None:
        """Send quote creation notification (email + SMS) with preference checks."""
        customer_email = quote.customer_email or quote.customer_name
        if not customer_email:
            return

        # Check notification gates first
        gate_allows_email = await notification_gate_allows(db, "email", "quote.created")
        gate_allows_sms = await notification_gate_allows(db, "sms", "quote.created")

        if not gate_allows_email and not gate_allows_sms:
            return  # Both channels blocked by gate

        # Check user preferences
        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False
        customer_phone = None

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            # Quotes use orderUpdates preference key (standardized)
            should_send_email = bool(
                prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(
                prefs.get("sms", {}).get("orderUpdates", False))

        # Get customer phone if SMS is enabled
        if should_send_sms and gate_allows_sms:
            try:
                result = await db.execute(
                    select(Customer).where(Customer.email == customer_email)
                )
                customer = result.scalar_one_or_none()
                if customer and customer.phone and customer.phone.strip():
                    customer_phone = customer.phone
            except Exception as e:
                logger.warning(f"Failed to get customer phone for SMS: {e}")

        # Send email if gate and preferences allow
        if should_send_email and gate_allows_email:
            QuoteNotificationService.send_quote_creation_email(
                quote, frontend_url)

        # Send SMS if gate, preferences allow and phone exists
        if should_send_sms and gate_allows_sms and customer_phone:
            try:
                sms_service = SMSService()
                await sms_service.send_quote_notification(
                    to=customer_phone,
                    quote_id=quote.id,
                    status="created",
                    message=f"Quote request {quote.id} created. We'll review it soon.",
                    db=db
                )
            except Exception as e:
                logger.warning(f"Failed to send quote creation SMS: {e}")

    @staticmethod
    def send_quote_creation_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote request is created.
        Sent to: Customer
        """
        try:
            template = templates.quote_creation_template(
                customer_name=quote.customer_name,
                quote_id=quote.id,
                title=quote.title,
                quantity=quote.quantity or 1,
                quote_link=f"{frontend_url}/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[quote.customer_email or quote.customer_name],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote creation email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote creation email: {str(e)}")

    @staticmethod
    async def send_quote_approved_notification(
        db: AsyncSession, quote: QuoteRequest, frontend_url: str = "http://localhost:3000"
    ) -> None:
        """Send quote approved notification (email + SMS) with gate checks and preference checks."""
        customer_email = quote.customer_email
        if not customer_email:
            return

        # Check notification gates first
        gate_allows_email = await notification_gate_allows(db, "email", "quote.approved")
        gate_allows_sms = await notification_gate_allows(db, "sms", "quote.approved")

        if not gate_allows_email and not gate_allows_sms:
            return  # Both channels blocked by gate

        # Check user preferences
        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False
        customer_phone = None

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            # Quotes use orderUpdates preference key (standardized)
            should_send_email = bool(
                prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(
                prefs.get("sms", {}).get("orderUpdates", False))

        if should_send_sms and gate_allows_sms:
            try:
                result = await db.execute(
                    select(Customer).where(Customer.email == customer_email)
                )
                customer = result.scalar_one_or_none()
                if customer and customer.phone and customer.phone.strip():
                    customer_phone = customer.phone
            except Exception as e:
                logger.warning(f"Failed to get customer phone for SMS: {e}")

        if should_send_email and gate_allows_email:
            QuoteNotificationService.send_quote_approved_email(
                quote, frontend_url)

        if should_send_sms and gate_allows_sms and customer_phone:
            try:
                sms_service = SMSService()
                await sms_service.send_quote_notification(
                    to=customer_phone,
                    quote_id=quote.id,
                    status="approved",
                    message=f"Quote {quote.id} has been reviewed and is ready.",
                    db=db
                )
            except Exception as e:
                logger.warning(f"Failed to send quote approved SMS: {e}")

    @staticmethod
    def send_quote_approved_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is approved (reviewed).
        Sent to: Customer
        """
        try:
            template = templates.quote_reviewed_template(
                customer_name=quote.customer_name,
                quote_id=quote.id,
                title=quote.title,
                message="Your quote has been reviewed and is ready for your consideration.",
                quote_link=f"{frontend_url}/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[quote.customer_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote approved email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote approved email: {str(e)}")

    @staticmethod
    async def send_quote_quoted_notification(
        db: AsyncSession, quote: QuoteRequest, frontend_url: str = "http://localhost:3000"
    ) -> None:
        """Send quote quoted notification (email + SMS) with preference checks."""
        customer_email = quote.customer_email
        if not customer_email:
            return

        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False
        customer_phone = None

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            # Quotes use orderUpdates preference key (standardized)
            should_send_email = bool(
                prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(
                prefs.get("sms", {}).get("orderUpdates", False))

        # Check notification gates first
        gate_allows_email = await notification_gate_allows(db, "email", "quote.quoted")
        gate_allows_sms = await notification_gate_allows(db, "sms", "quote.quoted")

        if not gate_allows_email and not gate_allows_sms:
            return  # Both channels blocked by gate

        # Check user preferences
        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False
        customer_phone = None

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            # Quotes use orderUpdates preference key (standardized)
            should_send_email = bool(
                prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(
                prefs.get("sms", {}).get("orderUpdates", False))

        if should_send_sms and gate_allows_sms:
            try:
                result = await db.execute(
                    select(Customer).where(Customer.email == customer_email)
                )
                customer = result.scalar_one_or_none()
                if customer and customer.phone and customer.phone.strip():
                    customer_phone = customer.phone
            except Exception as e:
                logger.warning(f"Failed to get customer phone for SMS: {e}")

        if should_send_email and gate_allows_email:
            QuoteNotificationService.send_quote_quoted_email(
                quote, frontend_url)

        if should_send_sms and gate_allows_sms and customer_phone:
            try:
                price = float(quote.estimated_price or quote.final_price or 0)
                sms_service = SMSService()
                await sms_service.send_quote_notification(
                    to=customer_phone,
                    quote_id=quote.id,
                    status="quoted",
                    message=f"Quote {quote.id} ready: {price:.2f} DZD. Please review.",
                    db=db
                )
            except Exception as e:
                logger.warning(f"Failed to send quote quoted SMS: {e}")

    @staticmethod
    def send_quote_quoted_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is quoted (price provided).
        Sent to: Customer
        """
        try:
            price = float(quote.estimated_price or quote.final_price or 0)
            template = templates.quote_quoted_template(
                customer_name=quote.customer_name,
                quote_id=quote.id,
                title=quote.title,
                price=price,
                message="Your quote has been prepared. Please review and let us know if you'd like to proceed.",
                quote_link=f"{frontend_url}/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[quote.customer_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote quoted email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote quoted email: {str(e)}")

    @staticmethod
    async def send_quote_accepted_notification(
        db: AsyncSession, quote: QuoteRequest, frontend_url: str = "http://localhost:3000"
    ) -> None:
        """Send quote accepted notification (email + SMS) with gate checks and preference checks."""
        customer_email = quote.customer_email
        if not customer_email:
            return

        # Check notification gates first
        gate_allows_email = await notification_gate_allows(db, "email", "quote.accepted")
        gate_allows_sms = await notification_gate_allows(db, "sms", "quote.accepted")

        if not gate_allows_email and not gate_allows_sms:
            return  # Both channels blocked by gate

        # Check user preferences
        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False
        customer_phone = None

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            # Quotes use orderUpdates preference key (standardized)
            should_send_email = bool(
                prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(
                prefs.get("sms", {}).get("orderUpdates", False))

        if should_send_sms and gate_allows_sms:
            try:
                result = await db.execute(
                    select(Customer).where(Customer.email == customer_email)
                )
                customer = result.scalar_one_or_none()
                if customer and customer.phone and customer.phone.strip():
                    customer_phone = customer.phone
            except Exception as e:
                logger.warning(f"Failed to get customer phone for SMS: {e}")

        if should_send_email and gate_allows_email:
            QuoteNotificationService.send_quote_accepted_email(
                quote, frontend_url)

        if should_send_sms and gate_allows_sms and customer_phone:
            try:
                sms_service = SMSService()
                await sms_service.send_quote_notification(
                    to=customer_phone,
                    quote_id=quote.id,
                    status="accepted",
                    message=f"Quote {quote.id} accepted! We'll proceed with your order.",
                    db=db
                )
            except Exception as e:
                logger.warning(f"Failed to send quote accepted SMS: {e}")

    @staticmethod
    def send_quote_accepted_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is accepted.
        Sent to: Customer and Corporate Team
        """
        try:
            # Send to customer
            template = templates.quote_accepted_customer_template(
                customer_name=quote.customer_name,
                quote_id=quote.id,
                title=quote.title,
                message="Thank you! Your quote has been accepted. We will proceed with your order.",
                quote_link=f"{frontend_url}/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[quote.customer_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote accepted email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote accepted email: {str(e)}")

        try:
            # Send to corporate team
            admin_email = settings.ADMIN_EMAIL
            price = float(quote.final_price or 0)
            template = templates.quote_accepted_corporate_template(
                customer_name=quote.customer_name,
                customer_email=quote.customer_email,
                quote_id=quote.id,
                title=quote.title,
                price=price,
                quote_link=f"{frontend_url}/admin/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[admin_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote accepted corporate email sent")
        except Exception as e:
            logger.warning(
                f"Failed to send quote accepted corporate email: {str(e)}")

    @staticmethod
    async def send_quote_rejected_notification(
        db: AsyncSession, quote: QuoteRequest, reason: Optional[str] = None, frontend_url: str = "http://localhost:3000"
    ) -> None:
        """Send quote rejected notification (email + SMS) with gate checks and preference checks."""
        customer_email = quote.customer_email
        if not customer_email:
            return

        # Check notification gates first
        gate_allows_email = await notification_gate_allows(db, "email", "quote.rejected")
        gate_allows_sms = await notification_gate_allows(db, "sms", "quote.rejected")

        if not gate_allows_email and not gate_allows_sms:
            return  # Both channels blocked by gate

        # Check user preferences
        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False
        customer_phone = None

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            # Quotes use orderUpdates preference key (standardized)
            should_send_email = bool(
                prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(
                prefs.get("sms", {}).get("orderUpdates", False))

        if should_send_sms and gate_allows_sms:
            try:
                result = await db.execute(
                    select(Customer).where(Customer.email == customer_email)
                )
                customer = result.scalar_one_or_none()
                if customer and customer.phone and customer.phone.strip():
                    customer_phone = customer.phone
            except Exception as e:
                logger.warning(f"Failed to get customer phone for SMS: {e}")

        if should_send_email and gate_allows_email:
            QuoteNotificationService.send_quote_rejected_email(
                quote, reason, frontend_url)

        if should_send_sms and gate_allows_sms and customer_phone:
            try:
                sms_service = SMSService()
                await sms_service.send_quote_notification(
                    to=customer_phone,
                    quote_id=quote.id,
                    status="rejected",
                    message=f"Quote {quote.id} was not approved. Contact us for details.",
                    db=db
                )
            except Exception as e:
                logger.warning(f"Failed to send quote rejected SMS: {e}")

    @staticmethod
    def send_quote_rejected_email(quote: QuoteRequest, reason: Optional[str] = None, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is rejected.
        Sent to: Customer and Corporate Team
        """
        try:
            # Send to customer
            template = templates.quote_rejected_customer_template(
                customer_name=quote.customer_name,
                quote_id=quote.id,
                title=quote.title,
                reason=reason or "We're unable to proceed with this quote at this time.",
                message="Thank you for your interest. We appreciate the opportunity.",
                quote_link=f"{frontend_url}/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[quote.customer_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote rejected email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote rejected email: {str(e)}")

        try:
            # Send to corporate team
            admin_email = settings.ADMIN_EMAIL
            template = templates.quote_rejected_corporate_template(
                customer_name=quote.customer_name,
                customer_email=quote.customer_email,
                quote_id=quote.id,
                title=quote.title,
                reason=reason or "Not specified",
                quote_link=f"{frontend_url}/admin/quote-requests/{quote.id}"
            )
            asyncio.run(email_service.send_email(
                to=[admin_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(f"Quote rejected corporate email sent")
        except Exception as e:
            logger.warning(
                f"Failed to send quote rejected corporate email: {str(e)}")

    @staticmethod
    def send_service_request_email(service: ServiceRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email confirmation when service request is created.
        Sent to: Customer
        """
        try:
            template = templates.service_request_confirmation_template(
                customer_name=service.customer_name,
                service_id=service.id,
                service_type=service.service_type or "General Service",
                message="Thank you for submitting your service request. We will review it and get back to you soon.",
                service_link=f"{frontend_url}/service-requests/{service.id}"
            )
            asyncio.run(email_service.send_email(
                to=[service.customer_email],
                subject=template["subject"],
                html_body=template["html"],
                text_body=template.get("text")
            ))
            logger.info(
                f"Service request email sent to {service.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send service request email: {str(e)}")

    @staticmethod
    async def send_service_request_notification_async(
        db: AsyncSession,
        service: ServiceRequest,
        frontend_url: str = "http://localhost:3000"
    ) -> None:
        """
        Send service request notification (email + SMS + in-app) with preference checks.
        SMS only sent to customers.
        """
        customer_email = service.customer_email
        if not customer_email:
            return

        # Check notification gates
        gate_allows_email = await notification_gate_allows(db, "email", "service_request.created")
        gate_allows_sms = await notification_gate_allows(db, "sms", "service_request.created")

        # Get user ID and preferences
        uid = await user_id_by_email(db, customer_email)
        should_send_email = True
        should_send_sms = False

        if uid:
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            should_send_email = bool(prefs.get("email", {}).get("orderUpdates", True))
            should_send_sms = bool(prefs.get("sms", {}).get("orderUpdates", False))

        # Get customer phone for SMS
        customer_phone = getattr(service, 'customer_phone', None)
        if not customer_phone:
            try:
                result = await db.execute(
                    select(Customer).where(Customer.email == customer_email)
                )
                customer = result.scalar_one_or_none()
                if customer and customer.phone:
                    customer_phone = customer.phone
            except Exception:
                pass

        # Send email (use existing sync method)
        if should_send_email and gate_allows_email:
            QuoteNotificationService.send_service_request_email(service, frontend_url)

        # Send SMS (customer only)
        if should_send_sms and gate_allows_sms and customer_phone and customer_phone.strip():
            try:
                sms_service = SMSService()
                await sms_service.send_custom_notification(
                    to=customer_phone,
                    title="Service Request",
                    body=f"Request #{service.id} received. We'll contact you soon.",
                    db=db
                )
            except Exception as e:
                logger.warning(f"Service request SMS notification failed: {e}")

        # Send in-app notification
        if uid:
            try:
                await create_notification(
                    db=db,
                    user_id=uid,
                    type="service_request_created",
                    title="Service Request Submitted",
                    body=f"Your {service.service_type or 'service'} request has been submitted successfully.",
                    link=f"/service-requests/{service.id}"
                )
            except Exception as e:
                logger.warning(f"Service request in-app notification failed: {e}")

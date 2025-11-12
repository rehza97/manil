"""
Quote request email notifications.
Handles sending emails for quote events and status changes.
"""
import logging
from typing import Optional

from app.infrastructure.email.service import EmailService
from app.modules.products.quote_models import QuoteRequest, ServiceRequest

logger = logging.getLogger(__name__)
email_service = EmailService()


class QuoteNotificationService:
    """Service for sending quote-related email notifications."""

    @staticmethod
    def send_quote_creation_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote request is created.
        Sent to: Customer
        """
        try:
            email_service.send_email(
                to=quote.customer_email or quote.customer_name,
                subject=f"Quote Request #{quote.id[:8]} Received",
                template="quote_creation",
                context={
                    "customer_name": quote.customer_name,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "quantity": quote.quantity,
                    "quote_link": f"{frontend_url}/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote creation email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote creation email: {str(e)}")

    @staticmethod
    def send_quote_approved_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is approved (reviewed).
        Sent to: Customer
        """
        try:
            email_service.send_email(
                to=quote.customer_email,
                subject=f"Quote #{quote.id[:8]} Reviewed",
                template="quote_reviewed",
                context={
                    "customer_name": quote.customer_name,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "message": "Your quote has been reviewed and is ready for your consideration.",
                    "quote_link": f"{frontend_url}/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote approved email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote approved email: {str(e)}")

    @staticmethod
    def send_quote_quoted_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is quoted (price provided).
        Sent to: Customer
        """
        try:
            email_service.send_email(
                to=quote.customer_email,
                subject=f"Quote #{quote.id[:8]} - Price Quote Ready",
                template="quote_quoted",
                context={
                    "customer_name": quote.customer_name,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "price": quote.estimated_price or quote.final_price,
                    "message": "Your quote has been prepared. Please review and let us know if you'd like to proceed.",
                    "quote_link": f"{frontend_url}/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote quoted email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote quoted email: {str(e)}")

    @staticmethod
    def send_quote_accepted_email(quote: QuoteRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is accepted.
        Sent to: Customer and Corporate Team
        """
        try:
            # Send to customer
            email_service.send_email(
                to=quote.customer_email,
                subject=f"Quote #{quote.id[:8]} - Accepted",
                template="quote_accepted_customer",
                context={
                    "customer_name": quote.customer_name,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "message": "Thank you! Your quote has been accepted. We will proceed with your order.",
                    "quote_link": f"{frontend_url}/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote accepted email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote accepted email: {str(e)}")

        try:
            # Send to corporate team (would need admin email config)
            email_service.send_email(
                to="admin@company.com",  # Should be configurable
                subject=f"Quote #{quote.id[:8]} - Accepted by Customer",
                template="quote_accepted_corporate",
                context={
                    "customer_name": quote.customer_name,
                    "customer_email": quote.customer_email,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "price": quote.final_price,
                    "quote_link": f"{frontend_url}/admin/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote accepted corporate email sent")
        except Exception as e:
            logger.warning(f"Failed to send quote accepted corporate email: {str(e)}")

    @staticmethod
    def send_quote_rejected_email(quote: QuoteRequest, reason: Optional[str] = None, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email notification when quote is rejected.
        Sent to: Customer and Corporate Team
        """
        try:
            # Send to customer
            email_service.send_email(
                to=quote.customer_email,
                subject=f"Quote #{quote.id[:8]} - Status Update",
                template="quote_rejected_customer",
                context={
                    "customer_name": quote.customer_name,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "reason": reason or "We're unable to proceed with this quote at this time.",
                    "message": "Thank you for your interest. We appreciate the opportunity.",
                    "quote_link": f"{frontend_url}/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote rejected email sent to {quote.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send quote rejected email: {str(e)}")

        try:
            # Send to corporate team
            email_service.send_email(
                to="admin@company.com",  # Should be configurable
                subject=f"Quote #{quote.id[:8]} - Rejected",
                template="quote_rejected_corporate",
                context={
                    "customer_name": quote.customer_name,
                    "customer_email": quote.customer_email,
                    "quote_id": quote.id,
                    "title": quote.title,
                    "reason": reason,
                    "quote_link": f"{frontend_url}/admin/quotes/{quote.id}",
                },
            )
            logger.info(f"Quote rejected corporate email sent")
        except Exception as e:
            logger.warning(f"Failed to send quote rejected corporate email: {str(e)}")

    @staticmethod
    def send_service_request_email(service: ServiceRequest, frontend_url: str = "http://localhost:3000") -> None:
        """
        Send email confirmation when service request is created.
        Sent to: Customer
        """
        try:
            email_service.send_email(
                to=service.customer_email,
                subject=f"Service Request #{service.id[:8]} Received",
                template="service_request_confirmation",
                context={
                    "customer_name": service.customer_name,
                    "service_id": service.id,
                    "service_type": service.service_type,
                    "message": "Thank you for submitting your service request. We will review it and get back to you soon.",
                    "service_link": f"{frontend_url}/service-requests/{service.id}",
                },
            )
            logger.info(f"Service request email sent to {service.customer_email}")
        except Exception as e:
            logger.warning(f"Failed to send service request email: {str(e)}")

"""
Email service for sending notifications.

Provides high-level API for sending emails with templates.
"""

from typing import List, Optional

from app.infrastructure.email.providers import get_email_provider
from app.infrastructure.email import templates
from app.infrastructure.email.jinja2_service import get_template_service
from app.infrastructure.email.template_context import (
    build_welcome_context,
    build_password_reset_context,
    build_ticket_created_context,
    build_ticket_reply_context,
    build_ticket_status_change_context,
    build_ticket_assigned_context,
    build_ticket_closed_context,
    build_invoice_sent_context,
    build_email_verification_context,
    build_quote_sent_context,
    build_order_status_context,
)
from app.core.logging import logger


class EmailService:
    """
    Email service for sending notifications.

    Handles email sending with support for multiple providers
    and pre-built templates.
    """

    def __init__(self):
        self.provider = get_email_provider()
        self.template_service = get_template_service()
        self.use_jinja2 = True  # Flag to enable/disable Jinja2 (for gradual migration)

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        template_name: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> bool:
        """
        Send email with custom content.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            template_name: Template name for history tracking (optional)
            metadata: Additional metadata for history (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        # Check if email is invalid (permanent bounce)
        try:
            from app.config.database import get_sync_db
            from app.modules.notifications.services.bounce_service import BounceService
            
            sync_db = next(get_sync_db())
            if BounceService.is_email_invalid(sync_db, to[0] if to else "unknown"):
                logger.warning(f"Skipping email send to invalid address: {to[0] if to else 'unknown'}")
                return False
        except Exception as e:
            logger.warning(f"Failed to check bounce status: {e}")
        
        # Log send attempt to history if template_name is provided
        history_id = None
        if template_name:
            try:
                from app.config.database import AsyncSessionLocal
                from app.modules.notifications.services.send_history_service import SendHistoryService
                from app.modules.notifications.models import EmailSendStatus
                
                async with AsyncSessionLocal() as db:
                    history_service = SendHistoryService(db)
                    history = await history_service.log_send(
                        template_name=template_name,
                        recipient_email=to[0] if to else "unknown",
                        subject=subject,
                        html_body=html_body,
                        text_body=text_body,
                        provider=self.provider.__class__.__name__.replace("Provider", "").lower(),
                        metadata=metadata,
                    )
                    history_id = history.id
            except Exception as e:
                logger.warning(f"Failed to log email send history: {e}")

        ok = await self.provider.send_email(to, subject, html_body, text_body)
        
        # Update history status
        if history_id and template_name:
            try:
                from app.config.database import AsyncSessionLocal
                from app.modules.notifications.services.send_history_service import SendHistoryService
                from app.modules.notifications.models import EmailSendStatus
                
                async with AsyncSessionLocal() as db:
                    history_service = SendHistoryService(db)
                    status = EmailSendStatus.SENT if ok else EmailSendStatus.FAILED
                    error_msg = None if ok else "Email delivery failed"
                    await history_service.update_send_status(
                        history_id=history_id,
                        status=status,
                        error_message=error_msg,
                    )
            except Exception as e:
                logger.warning(f"Failed to update email send history: {e}")
        
        if not ok:
            logger.warning("Email delivery failed: to=%s subject=%s", to, subject)
        return ok

    async def send_welcome_email(self, to: str, user_name: str) -> bool:
        """
        Send welcome email to new user.

        Args:
            to: Recipient email address
            user_name: Name of the user

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_welcome_context(user_name)
                rendered = self.template_service.render_email_template("welcome", context)
                subject = "Welcome to CloudManager"
                return await self.send_email([to], subject, rendered["html"], rendered.get("text"), template_name="welcome")
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.welcome_email_template(user_name)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text"), template_name="welcome"
        )

    async def send_password_reset(
        self, to: str, user_name: str, reset_token: str
    ) -> bool:
        """
        Send password reset email.

        Args:
            to: Recipient email address
            user_name: Name of the user
            reset_token: Password reset token

        Returns:
            True if email sent successfully
        """
        template = templates.password_reset_template(user_name, reset_token)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_password_reset_email(
        self, to_email: str, user_name: str, reset_url: str
    ) -> bool:
        """
        Send password reset email with full reset URL.

        Args:
            to_email: Recipient email address
            user_name: Name of the user
            reset_url: Complete password reset URL

        Returns:
            True if email sent successfully
        """
        template = templates.password_reset_url_template(user_name, reset_url)
        return await self.send_email(
            [to_email], template["subject"], template["html"], template.get("text")
        )

    async def send_ticket_created(
        self, to: str, ticket_id: str, subject: str
    ) -> bool:
        """
        Send ticket creation confirmation.

        Args:
            to: Recipient email address
            ticket_id: Ticket ID
            subject: Ticket subject

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_ticket_created_context(ticket_id, subject)
                rendered = self.template_service.render_email_template("ticket_created", context)
                subject_text = f"Ticket Created: {ticket_id}"
                return await self.send_email([to], subject_text, rendered["html"], rendered.get("text"), template_name="ticket_created")
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.ticket_created_template(ticket_id, subject)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text"), template_name="ticket_created"
        )

    async def send_order_status_update(
        self, to: str, order_id: str, status: str
    ) -> bool:
        """
        Send order status update notification.

        Args:
            to: Recipient email address
            order_id: Order ID
            status: New order status

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_order_status_context(order_id, status)
                rendered = self.template_service.render_email_template("order_status", context)
                subject_text = f"Order {order_id} - Status Update"
                return await self.send_email([to], subject_text, rendered["html"], rendered.get("text"), template_name="order_status")
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.order_status_template(order_id, status)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_invoice_notification(
        self, to: str, invoice_id: str, amount: float
    ) -> bool:
        """
        Send invoice notification.

        Args:
            to: Recipient email address
            invoice_id: Invoice ID
            amount: Invoice amount

        Returns:
            True if email sent successfully
        """
        template = templates.invoice_sent_template(invoice_id, amount)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_2fa_code(self, to: str, code: str) -> bool:
        """
        Send 2FA verification code.

        Args:
            to: Recipient email address
            code: 2FA code

        Returns:
            True if email sent successfully
        """
        subject = "Your 2FA Verification Code"
        html_body = templates.get_base_template(f"""
            <h2>2FA Verification Code</h2>
            <p>Your verification code is:</p>
            <h1 style="text-align: center; color: #2563eb; font-size: 36px;">
                {code}
            </h1>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
        """)

        return await self.send_email([to], subject, html_body)

    async def send_ticket_reply(
        self, to: str, ticket_id: str, subject: str, reply_author: str, is_internal: bool = False
    ) -> bool:
        """
        Send ticket reply notification.

        Args:
            to: Recipient email address
            ticket_id: Ticket ID
            subject: Ticket subject
            reply_author: Name of person who replied
            is_internal: Whether the reply is internal

        Returns:
            True if email sent successfully
        """
        template = templates.ticket_reply_template(ticket_id, subject, reply_author, is_internal)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_ticket_status_change(
        self, to: str, ticket_id: str, subject: str, old_status: str, new_status: str
    ) -> bool:
        """
        Send ticket status change notification.

        Args:
            to: Recipient email address
            ticket_id: Ticket ID
            subject: Ticket subject
            old_status: Previous status
            new_status: New status

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_ticket_status_change_context(ticket_id, subject, old_status, new_status)
                rendered = self.template_service.render_email_template("ticket_status_change", context)
                subject_text = f"Ticket {ticket_id} - Status Updated to {new_status.replace('_', ' ').title()}"
                return await self.send_email([to], subject_text, rendered["html"], rendered.get("text"))
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.ticket_status_change_template(ticket_id, subject, old_status, new_status)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text"), template_name="ticket_status_change"
        )

    async def send_ticket_assigned(
        self, to: str, ticket_id: str, subject: str, assigned_to: str
    ) -> bool:
        """
        Send ticket assignment notification.

        Args:
            to: Recipient email address
            ticket_id: Ticket ID
            subject: Ticket subject
            assigned_to: Name of assigned agent

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_ticket_assigned_context(ticket_id, subject, assigned_to)
                rendered = self.template_service.render_email_template("ticket_assigned", context)
                subject_text = f"Ticket {ticket_id} Assigned to You"
                return await self.send_email([to], subject_text, rendered["html"], rendered.get("text"), template_name="ticket_assigned")
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.ticket_assigned_template(ticket_id, subject, assigned_to)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text"), template_name="ticket_assigned"
        )

    async def send_ticket_closed(self, to: str, ticket_id: str, subject: str) -> bool:
        """
        Send ticket closed notification.

        Args:
            to: Recipient email address
            ticket_id: Ticket ID
            subject: Ticket subject

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_ticket_closed_context(ticket_id, subject)
                rendered = self.template_service.render_email_template("ticket_closed", context)
                subject_text = f"Ticket {ticket_id} - Closed"
                return await self.send_email([to], subject_text, rendered["html"], rendered.get("text"), template_name="ticket_closed")
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.ticket_closed_template(ticket_id, subject)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text"), template_name="ticket_closed"
        )

    async def send_quote_email(
        self,
        to: str,
        quote_number: str,
        customer_name: str,
        title: str,
        total_amount: float,
        valid_until: str,
        pdf_path: str,
    ) -> bool:
        """
        Send quote by email with PDF attachment.

        Args:
            to: Recipient email address
            quote_number: Quote number
            customer_name: Customer name
            title: Quote title
            total_amount: Quote total amount
            valid_until: Quote expiration date
            pdf_path: Path to the PDF file

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_quote_sent_context(
                    quote_number, customer_name, title, total_amount, valid_until
                )
                rendered = self.template_service.render_email_template("quote_sent", context)
                subject_text = f"Quote {quote_number} - {title}"
                attachments = [{"path": pdf_path, "filename": f"Quote_{quote_number}.pdf"}]
                # Log to history before sending
                try:
                    from app.config.database import AsyncSessionLocal
                    from app.modules.notifications.services.send_history_service import SendHistoryService
                    from app.modules.notifications.models import EmailSendStatus
                    
                    async with AsyncSessionLocal() as db:
                        history_service = SendHistoryService(db)
                        history = await history_service.log_send(
                            template_name="quote_sent",
                            recipient_email=to,
                            subject=subject_text,
                            html_body=rendered["html"],
                            text_body=rendered.get("text"),
                            provider=self.provider.__class__.__name__.replace("Provider", "").lower(),
                        )
                        history_id = history.id
                except Exception as e:
                    logger.warning(f"Failed to log quote email history: {e}")
                    history_id = None
                
                ok = await self.provider.send_email(
                    [to],
                    subject_text,
                    rendered["html"],
                    rendered.get("text"),
                    attachments=attachments,
                )
                
                # Update history
                if history_id:
                    try:
                        async with AsyncSessionLocal() as db:
                            history_service = SendHistoryService(db)
                            status = EmailSendStatus.SENT if ok else EmailSendStatus.FAILED
                            await history_service.update_send_status(history_id, status)
                    except Exception as e:
                        logger.warning(f"Failed to update quote email history: {e}")
                
                return ok
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.quote_sent_template(
            quote_number, customer_name, title, total_amount, valid_until
        )
        attachments = [{"path": pdf_path, "filename": f"Quote_{quote_number}.pdf"}]

        return await self.provider.send_email(
            [to],
            template["subject"],
            template["html"],
            template.get("text"),
            attachments=attachments,
        )

    async def send_invoice_email(
        self,
        to: str,
        invoice_number: str,
        customer_name: str,
        title: str,
        total_amount: float,
        due_date: str,
        pdf_path: str,
    ) -> bool:
        """
        Send invoice by email with PDF attachment.

        Args:
            to: Recipient email address
            invoice_number: Invoice number
            customer_name: Customer name
            title: Invoice title
            total_amount: Invoice total amount
            due_date: Payment due date
            pdf_path: Path to the PDF file

        Returns:
            True if email sent successfully
        """
        if self.use_jinja2:
            try:
                context = build_invoice_sent_context(
                    invoice_number, customer_name, title, total_amount, due_date
                )
                rendered = self.template_service.render_email_template("invoice_sent", context)
                subject_text = f"Invoice {invoice_number} - {title}"
                attachments = [{"path": pdf_path, "filename": f"Invoice_{invoice_number}.pdf"}]
                # Log to history before sending
                try:
                    from app.config.database import AsyncSessionLocal
                    from app.modules.notifications.services.send_history_service import SendHistoryService
                    from app.modules.notifications.models import EmailSendStatus
                    
                    async with AsyncSessionLocal() as db:
                        history_service = SendHistoryService(db)
                        history = await history_service.log_send(
                            template_name="invoice_sent",
                            recipient_email=to,
                            subject=subject_text,
                            html_body=rendered["html"],
                            text_body=rendered.get("text"),
                            provider=self.provider.__class__.__name__.replace("Provider", "").lower(),
                        )
                        history_id = history.id
                except Exception as e:
                    logger.warning(f"Failed to log invoice email history: {e}")
                    history_id = None
                
                ok = await self.provider.send_email(
                    [to],
                    subject_text,
                    rendered["html"],
                    rendered.get("text"),
                    attachments=attachments,
                )
                
                # Update history
                if history_id:
                    try:
                        async with AsyncSessionLocal() as db:
                            history_service = SendHistoryService(db)
                            status = EmailSendStatus.SENT if ok else EmailSendStatus.FAILED
                            await history_service.update_send_status(history_id, status)
                    except Exception as e:
                        logger.warning(f"Failed to update invoice email history: {e}")
                
                return ok
            except Exception as e:
                logger.warning(f"Jinja2 template failed, falling back to legacy: {e}")
        
        # Fallback to legacy templates
        template = templates.invoice_sent_template_with_attachment(
            invoice_number, customer_name, title, total_amount, due_date
        )
        attachments = [{"path": pdf_path, "filename": f"Invoice_{invoice_number}.pdf"}]

        return await self.provider.send_email(
            [to],
            template["subject"],
            template["html"],
            template.get("text"),
            attachments=attachments,
        )

    async def send_email_verification(
        self, to: str, full_name: str, verification_link: str, expires_in_hours: int = 24
    ) -> bool:
        """
        Send email verification email for registration.

        Args:
            to: Recipient email address
            full_name: User's full name
            verification_link: Email verification link
            expires_in_hours: Link expiration time in hours (default: 24)

        Returns:
            True if email sent successfully
        """
        template = templates.email_verification_template(
            full_name, verification_link, expires_in_hours
        )
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_vps_welcome(
        self,
        to: str,
        subscription_number: str,
        ip_address: str,
        ssh_port: int,
        container_name: str,
    ) -> bool:
        """
        Send VPS welcome email with connection details.

        Args:
            to: Recipient email address
            subscription_number: VPS subscription number
            ip_address: VPS IP address
            ssh_port: SSH port number
            container_name: Docker container name

        Returns:
            True if email sent successfully
        """
        template = templates.vps_welcome_template(
            subscription_number, ip_address, ssh_port, container_name
        )
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_vps_alert(
        self,
        to: str,
        subscription_number: str,
        alert_type: str,
        severity: str,
        threshold: float,
        detected_at: str,
        subscription_link: str,
    ) -> bool:
        """
        Send VPS resource alert notification email.

        Args:
            to: Recipient email address
            subscription_number: VPS subscription number
            alert_type: Type of alert (CPU, Memory, Disk)
            severity: Alert severity (warning, critical)
            threshold: Alert threshold percentage
            detected_at: Detection timestamp
            subscription_link: Link to subscription details

        Returns:
            True if email sent successfully
        """
        template = templates.vps_alert_template(
            subscription_number,
            alert_type,
            severity,
            threshold,
            detected_at,
            subscription_link,
        )
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

    async def send_payment_confirmation(
        self,
        to: str,
        customer_name: str,
        invoice_number: str,
        payment_amount: float,
        payment_date: str,
        invoice_link: str,
    ) -> bool:
        """
        Send payment received confirmation email.

        Args:
            to: Recipient email address
            customer_name: Customer name
            invoice_number: Invoice number
            payment_amount: Payment amount
            payment_date: Payment date
            invoice_link: Link to invoice

        Returns:
            True if email sent successfully
        """
        template = templates.payment_confirmation_template(
            customer_name, invoice_number, payment_amount, payment_date, invoice_link
        )
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

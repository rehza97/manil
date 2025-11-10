"""
Email service for sending notifications.

Provides high-level API for sending emails with templates.
"""

from typing import List, Optional

from app.infrastructure.email.providers import get_email_provider
from app.infrastructure.email import templates


class EmailService:
    """
    Email service for sending notifications.

    Handles email sending with support for multiple providers
    and pre-built templates.
    """

    def __init__(self):
        self.provider = get_email_provider()

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """
        Send email with custom content.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        return await self.provider.send_email(to, subject, html_body, text_body)

    async def send_welcome_email(self, to: str, user_name: str) -> bool:
        """
        Send welcome email to new user.

        Args:
            to: Recipient email address
            user_name: Name of the user

        Returns:
            True if email sent successfully
        """
        template = templates.welcome_email_template(user_name)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
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
        template = templates.ticket_created_template(ticket_id, subject)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
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
        template = templates.ticket_status_change_template(ticket_id, subject, old_status, new_status)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
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
        template = templates.ticket_assigned_template(ticket_id, subject, assigned_to)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
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
        template = templates.ticket_closed_template(ticket_id, subject)
        return await self.send_email(
            [to], template["subject"], template["html"], template.get("text")
        )

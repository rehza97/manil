"""
Email provider implementations.

Supports multiple email providers:
- SMTP (generic)
- SendGrid
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from abc import ABC, abstractmethod

from app.config.settings import get_settings

settings = get_settings()


class EmailProvider(ABC):
    """Base class for email providers."""

    @abstractmethod
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send email via provider."""
        pass


class SMTPProvider(EmailProvider):
    """SMTP email provider implementation."""

    def __init__(self):
        self.smtp_host = getattr(settings, "SMTP_HOST", "localhost")
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_user = getattr(settings, "SMTP_USER", "")
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        self.smtp_tls = getattr(settings, "SMTP_TLS", True)
        self.from_email = settings.EMAIL_FROM

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """
        Send email via SMTP.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = ", ".join(to)

            # Add text and HTML parts
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Connect to SMTP server
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_tls:
                    server.starttls()

                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)

                server.send_message(msg)

            return True
        except Exception as e:
            print(f"❌ SMTP send error: {e}")
            return False


class SendGridProvider(EmailProvider):
    """SendGrid email provider implementation."""

    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.EMAIL_FROM

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """
        Send email via SendGrid.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Content

            # Create message
            mail = Mail(
                from_email=self.from_email,
                to_emails=to,
                subject=subject,
                html_content=html_body,
            )

            if text_body:
                mail.content = [
                    Content("text/plain", text_body),
                    Content("text/html", html_body),
                ]

            # Send email
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(mail)

            return response.status_code in [200, 202]
        except Exception as e:
            print(f"❌ SendGrid send error: {e}")
            return False


def get_email_provider() -> EmailProvider:
    """
    Get configured email provider.

    Returns:
        EmailProvider instance based on settings
    """
    provider = settings.EMAIL_PROVIDER.lower()

    if provider == "sendgrid":
        return SendGridProvider()
    else:
        return SMTPProvider()

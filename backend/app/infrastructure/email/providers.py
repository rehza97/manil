"""
Email provider implementations.

Supports multiple email providers:
- SMTP (generic)
- SendGrid
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional, Dict
from abc import ABC, abstractmethod
from pathlib import Path

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
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> bool:
        """
        Send email via provider.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            attachments: List of attachments with 'path' and 'filename' keys

        Returns:
            True if email sent successfully
        """
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
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> bool:
        """
        Send email via SMTP.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            attachments: List of attachments with 'path' and 'filename' keys

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = ", ".join(to)

            # Create alternative part for text/html
            msg_alternative = MIMEMultipart("alternative")

            # Add text and HTML parts
            if text_body:
                msg_alternative.attach(MIMEText(text_body, "plain"))
            msg_alternative.attach(MIMEText(html_body, "html"))

            msg.attach(msg_alternative)

            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    file_path = attachment.get('path')
                    filename = attachment.get('filename')

                    if file_path and Path(file_path).exists():
                        with open(file_path, 'rb') as f:
                            part = MIMEApplication(f.read(), Name=filename)
                            part['Content-Disposition'] = f'attachment; filename="{filename}"'
                            msg.attach(part)

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
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> bool:
        """
        Send email via SendGrid.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            attachments: List of attachments with 'path' and 'filename' keys

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Content, Attachment, FileContent, FileName, FileType, Disposition
            import base64

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

            # Add attachments if provided
            if attachments:
                for attachment_info in attachments:
                    file_path = attachment_info.get('path')
                    filename = attachment_info.get('filename')

                    if file_path and Path(file_path).exists():
                        with open(file_path, 'rb') as f:
                            data = f.read()
                            encoded = base64.b64encode(data).decode()

                            attachment = Attachment()
                            attachment.file_content = FileContent(encoded)
                            attachment.file_name = FileName(filename)
                            attachment.file_type = FileType('application/pdf')
                            attachment.disposition = Disposition('attachment')

                            mail.add_attachment(attachment)

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

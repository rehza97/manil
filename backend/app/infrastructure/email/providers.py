"""
Email provider implementations.

Supports multiple email providers:
- SMTP (generic)
- SendGrid
- AWS SES
"""

import asyncio
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
        self.smtp_user = getattr(settings, "SMTP_USERNAME", "")
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        self.smtp_tls = getattr(settings, "SMTP_USE_TLS", True)
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

            # Send email (run sync SDK in thread pool to avoid blocking)
            loop = asyncio.get_running_loop()
            sg = SendGridAPIClient(self.api_key)
            response = await loop.run_in_executor(None, lambda: sg.send(mail))
            return response.status_code in [200, 202]
        except Exception as e:
            print(f"❌ SendGrid send error: {e}")
            return False


class SESProvider(EmailProvider):
    """AWS SES email provider implementation."""

    def __init__(self):
        self.region = getattr(settings, "AWS_SES_REGION", "us-east-1")
        self.from_email = settings.EMAIL_FROM
        self.access_key = getattr(settings, "AWS_ACCESS_KEY_ID", None)
        self.secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", None)

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> bool:
        """
        Send email via AWS SES.

        Uses boto3 SES client. Credentials via AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY, or default boto3 resolution (env/instance).
        """
        try:
            import boto3

            client_kw: dict = {"region_name": self.region}
            if self.access_key and self.secret_key:
                client_kw["aws_access_key_id"] = self.access_key
                client_kw["aws_secret_access_key"] = self.secret_key
            ses = boto3.client("ses", **client_kw)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = ", ".join(to)
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            raw = msg.as_string()

            def _send() -> dict:
                return ses.send_raw_email(
                    Source=self.from_email,
                    Destinations=to,
                    RawMessage={"Data": raw.encode("utf-8")},
                )

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _send)
            return True
        except Exception as e:
            print(f"❌ SES send error: {e}")
            return False


def get_email_provider() -> EmailProvider:
    """
    Get configured email provider.

    Returns:
        EmailProvider instance based on settings
    """
    provider = settings.EMAIL_PROVIDER.lower().strip()

    if provider == "sendgrid":
        return SendGridProvider()
    if provider == "ses":
        return SESProvider()
    return SMTPProvider()

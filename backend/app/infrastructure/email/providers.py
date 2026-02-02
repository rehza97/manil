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
from typing import Any, Dict, List, Optional
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
        *,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """
        Send email via provider.

        Args:
            to: List of recipient email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body (optional)
            attachments: List of attachments with 'path' and 'filename' keys
            from_email: Override From address (from DB); else use env
            from_name: Override From name (from DB); else use env
            reply_to: Reply-To address (from DB); optional

        Returns:
            True if email sent successfully
        """
        pass


class SMTPProvider(EmailProvider):
    """
    SMTP email provider.
    Connection (host, port, user, password, TLS) from DB when smtp_config provided,
    otherwise falls back to env.
    """

    def __init__(self):
        # Defaults from env (fallback)
        self.smtp_host = getattr(settings, "SMTP_HOST", "localhost")
        self.smtp_port = getattr(settings, "SMTP_PORT", 587)
        self.smtp_user = getattr(settings, "SMTP_USERNAME", "")
        self.smtp_password = getattr(settings, "SMTP_PASSWORD", "")
        self.smtp_tls = getattr(settings, "SMTP_USE_TLS", True)
        self._from_email = settings.EMAIL_FROM
        self._from_name = getattr(settings, "EMAIL_FROM_NAME", "CloudManager")

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        *,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
        smtp_config: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send email via SMTP.
        SMTP connection from smtp_config (DB) if provided, else uses env defaults.
        From/Reply-To overridable per call.
        """
        try:
            # Use provided SMTP config (from DB) or fall back to instance defaults (env)
            smtp_host = (smtp_config.get("host")
                         if smtp_config else None) or self.smtp_host
            smtp_port = int(
                (smtp_config.get("port") if smtp_config else None) or self.smtp_port)
            smtp_user = (smtp_config.get("user")
                         if smtp_config else None) or self.smtp_user
            smtp_password = (smtp_config.get("password")
                             if smtp_config else None) or self.smtp_password
            smtp_tls = (smtp_config.get("use_tls") if smtp_config else None)
            if smtp_tls is None:
                smtp_tls = self.smtp_tls

            addr = from_email or self._from_email
            name = from_name or self._from_name
            from_header = f'"{name}" <{addr}>' if name else addr

            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = ", ".join(to)
            if reply_to:
                msg["Reply-To"] = reply_to

            # Create alternative part for text/html
            msg_alternative = MIMEMultipart("alternative")

            # Add text and HTML parts
            if text_body:
                msg_alternative.attach(MIMEText(text_body, "plain"))
            msg_alternative.attach(MIMEText(html_body, "html"))

            msg.attach(msg_alternative)

            # Add attachments if provided
            if attachments:
                from app.config.settings import get_settings
                settings = get_settings()
                storage_base = Path(settings.STORAGE_PATH).resolve()

                for attachment in attachments:
                    file_path = attachment.get('path')
                    filename = attachment.get('filename')

                    if file_path:
                        # Resolve and validate path to prevent path traversal
                        try:
                            resolved_path = Path(file_path).resolve()
                            # Ensure path is within storage directory
                            if not str(resolved_path).startswith(str(storage_base)):
                                logger.warning(
                                    f"Invalid attachment path (outside storage): {file_path}")
                                continue

                            if resolved_path.exists() and resolved_path.is_file():
                                with open(resolved_path, 'rb') as f:
                                    part = MIMEApplication(
                                        f.read(), Name=filename)
                                    part['Content-Disposition'] = f'attachment; filename="{filename}"'
                                    msg.attach(part)
                        except Exception as e:
                            logger.warning(
                                f"Failed to attach file {file_path}: {e}")
                            continue

            # Connect to SMTP server
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                if smtp_tls:
                    server.starttls()

                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)

                server.send_message(msg)

            return True
        except Exception as e:
            print(f"❌ SMTP send error: {e}")
            return False


class SendGridProvider(EmailProvider):
    """SendGrid email provider. From/name/reply_to overridable per call from DB."""

    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self._from_email = settings.EMAIL_FROM
        self._from_name = getattr(settings, "EMAIL_FROM_NAME", "CloudManager")

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        *,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """Send email via SendGrid."""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Content, Attachment, FileContent, FileName, FileType, Disposition, Email
            import base64

            addr = from_email or self._from_email
            name = from_name or self._from_name
            from_addr = Email(addr, name) if name else Email(addr)

            mail = Mail(
                from_email=from_addr,
                to_emails=to,
                subject=subject,
                html_content=html_body,
            )
            if reply_to:
                mail.reply_to = Email(reply_to)

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
    """AWS SES. From/name/reply_to overridable per call from DB."""

    def __init__(self):
        self.region = getattr(settings, "AWS_SES_REGION", "us-east-1")
        self._from_email = settings.EMAIL_FROM
        self._from_name = getattr(settings, "EMAIL_FROM_NAME", "CloudManager")
        self.access_key = getattr(settings, "AWS_ACCESS_KEY_ID", None)
        self.secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", None)

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        *,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> bool:
        """Send email via AWS SES."""
        try:
            import boto3

            addr = from_email or self._from_email
            name = from_name or self._from_name
            from_header = f'"{name}" <{addr}>' if name else addr

            client_kw: dict = {"region_name": self.region}
            if self.access_key and self.secret_key:
                client_kw["aws_access_key_id"] = self.access_key
                client_kw["aws_secret_access_key"] = self.secret_key
            ses = boto3.client("ses", **client_kw)

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = ", ".join(to)
            if reply_to:
                msg["Reply-To"] = reply_to
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            raw = msg.as_string()

            def _send() -> dict:
                return ses.send_raw_email(
                    Source=addr,
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

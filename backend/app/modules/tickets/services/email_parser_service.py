"""Email parser service for RFC822 email parsing.

Handles parsing of raw email content in RFC822 format,
extracting headers, body, and attachments.
"""

import email
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timezone
import logging
from pathlib import Path
import base64
import uuid

logger = logging.getLogger(__name__)


class EmailParseError(Exception):
    """Exception raised when email parsing fails."""

    pass


class EmailAttachmentInfo:
    """Information about an email attachment."""

    def __init__(
        self,
        filename: str,
        mime_type: str,
        content: bytes,
        is_inline: bool = False,
    ):
        self.filename = filename
        self.mime_type = mime_type
        self.content = content
        self.is_inline = is_inline
        self.size = len(content)

    def __repr__(self) -> str:
        return f"<EmailAttachmentInfo {self.filename} ({self.size} bytes)>"


class ParsedEmail:
    """Represents a parsed email message."""

    def __init__(
        self,
        message_id: str,
        from_address: str,
        to_addresses: List[str],
        cc_addresses: List[str],
        subject: str,
        body_text: Optional[str],
        body_html: Optional[str],
        received_at: datetime,
        in_reply_to: Optional[str] = None,
        references: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachmentInfo]] = None,
    ):
        self.message_id = message_id
        self.from_address = from_address
        self.to_addresses = to_addresses
        self.cc_addresses = cc_addresses
        self.subject = subject
        self.body_text = body_text
        self.body_html = body_html
        self.received_at = received_at
        self.in_reply_to = in_reply_to
        self.references = references or []
        self.attachments = attachments or []

    def has_attachments(self) -> bool:
        """Check if email has attachments."""
        return len(self.attachments) > 0

    def __repr__(self) -> str:
        return f"<ParsedEmail {self.message_id} from {self.from_address}>"


class EmailParserService:
    """Service for parsing RFC822 email messages."""

    # Storage directory for attachments
    ATTACHMENT_BASE_DIR = Path("/app/storage/email_attachments")

    @classmethod
    def parse_email(cls, raw_email: str) -> ParsedEmail:
        """Parse raw RFC822 email into structured format.

        Args:
            raw_email: Raw email content in RFC822 format

        Returns:
            ParsedEmail: Parsed email object

        Raises:
            EmailParseError: If email parsing fails
        """
        try:
            message = email.message_from_string(raw_email)
            return cls._extract_email_data(message, raw_email)
        except Exception as e:
            logger.error(f"Failed to parse email: {e}")
            raise EmailParseError(f"Failed to parse email: {str(e)}") from e

    @classmethod
    def _extract_email_data(cls, message, raw_email: str) -> ParsedEmail:
        """Extract structured data from email message.

        Args:
            message: email.message.Message object
            raw_email: Original raw email string

        Returns:
            ParsedEmail: Extracted email data
        """
        # Extract headers
        message_id = cls._extract_message_id(message)
        from_address = cls._extract_from_address(message)
        to_addresses = cls._extract_recipients(message.get("To", ""))
        cc_addresses = cls._extract_recipients(message.get("Cc", ""))
        subject = message.get("Subject", "(No Subject)").strip()
        received_at = cls._extract_received_date(message)
        in_reply_to = message.get("In-Reply-To", None)
        references = cls._extract_references(message.get("References", ""))

        # Extract body
        body_text, body_html = cls._extract_body(message)

        # Extract attachments
        attachments = cls._extract_attachments(message)

        return ParsedEmail(
            message_id=message_id,
            from_address=from_address,
            to_addresses=to_addresses,
            cc_addresses=cc_addresses,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            received_at=received_at,
            in_reply_to=in_reply_to,
            references=references,
            attachments=attachments,
        )

    @staticmethod
    def _extract_message_id(message) -> str:
        """Extract or generate message ID.

        Args:
            message: email.message.Message object

        Returns:
            str: Message ID
        """
        msg_id = message.get("Message-ID", "").strip("<>")
        if msg_id:
            return msg_id
        # Generate ID if not present
        return f"<{uuid.uuid4()}@generated>"

    @staticmethod
    def _extract_from_address(message) -> str:
        """Extract from address.

        Args:
            message: email.message.Message object

        Returns:
            str: From address
        """
        from_header = message.get("From", "unknown@example.com")
        # Extract email from "Name <email@domain>" format
        if "<" in from_header and ">" in from_header:
            return from_header[from_header.index("<") + 1 : from_header.index(">")]
        return from_header.strip()

    @staticmethod
    def _extract_recipients(recipients_str: str) -> List[str]:
        """Extract recipient email addresses.

        Args:
            recipients_str: Recipient string (potentially multiple addresses)

        Returns:
            List[str]: List of email addresses
        """
        if not recipients_str:
            return []

        addresses = []
        for addr in recipients_str.split(","):
            addr = addr.strip()
            if "<" in addr and ">" in addr:
                addr = addr[addr.index("<") + 1 : addr.index(">")]
            if addr:
                addresses.append(addr)
        return addresses

    @staticmethod
    def _extract_received_date(message) -> datetime:
        """Extract received date from email.

        Args:
            message: email.message.Message object

        Returns:
            datetime: Received timestamp
        """
        from email.utils import parsedate_to_datetime

        try:
            date_str = message.get("Date", None)
            if date_str:
                dt = parsedate_to_datetime(date_str)
                # Ensure UTC timezone
                if dt.tzinfo is None:
                    return dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
        except Exception as e:
            logger.warning(f"Failed to parse date: {e}")

        # Default to current time if parsing fails
        return datetime.now(timezone.utc)

    @staticmethod
    def _extract_references(references_str: str) -> List[str]:
        """Extract message references for threading.

        Args:
            references_str: References header value

        Returns:
            List[str]: List of referenced message IDs
        """
        if not references_str:
            return []

        refs = []
        for ref in references_str.split():
            ref = ref.strip("<>")
            if ref:
                refs.append(ref)
        return refs

    @staticmethod
    def _extract_body(message) -> Tuple[Optional[str], Optional[str]]:
        """Extract email body in text and HTML formats.

        Args:
            message: email.message.Message object

        Returns:
            Tuple[Optional[str], Optional[str]]: (text_body, html_body)
        """
        text_body = None
        html_body = None

        if message.is_multipart():
            for part in message.walk():
                content_type = part.get_content_type()
                content_disposition = part.get("Content-Disposition", "")

                # Skip attachments
                if content_disposition.startswith("attachment"):
                    continue

                if content_type == "text/plain":
                    text_body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                elif content_type == "text/html":
                    html_body = part.get_payload(decode=True).decode("utf-8", errors="replace")
        else:
            # Single part message
            content_type = message.get_content_type()
            if content_type == "text/plain":
                text_body = message.get_payload(decode=True).decode("utf-8", errors="replace")
            elif content_type == "text/html":
                html_body = message.get_payload(decode=True).decode("utf-8", errors="replace")

        return text_body, html_body

    @classmethod
    def _extract_attachments(cls, message) -> List[EmailAttachmentInfo]:
        """Extract attachments from email.

        Args:
            message: email.message.Message object

        Returns:
            List[EmailAttachmentInfo]: List of attachments
        """
        attachments = []

        if not message.is_multipart():
            return attachments

        for part in message.walk():
            # Skip non-attachment parts
            if part.get_content_maintype() == "multipart":
                continue

            content_disposition = part.get("Content-Disposition", "")
            if not (
                content_disposition.startswith("attachment")
                or content_disposition.startswith("inline")
            ):
                continue

            filename = part.get_filename()
            if not filename:
                # Generate filename for unnamed attachments
                filename = f"attachment_{len(attachments)}"

            mime_type = part.get_content_type()
            is_inline = content_disposition.startswith("inline")

            try:
                content = part.get_payload(decode=True)
                attachment = EmailAttachmentInfo(
                    filename=filename,
                    mime_type=mime_type,
                    content=content,
                    is_inline=is_inline,
                )
                attachments.append(attachment)
            except Exception as e:
                logger.warning(f"Failed to extract attachment {filename}: {e}")

        return attachments

    @classmethod
    def save_attachment(cls, attachment: EmailAttachmentInfo, email_id: str) -> str:
        """Save attachment to disk.

        Args:
            attachment: EmailAttachmentInfo object
            email_id: ID of the parent email

        Returns:
            str: Path to saved attachment (relative)
        """
        try:
            # Create directory structure
            email_dir = cls.ATTACHMENT_BASE_DIR / email_id
            email_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            filename = attachment.filename
            filepath = email_dir / filename
            counter = 1
            while filepath.exists():
                name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
                filename = f"{name}_{counter}.{ext}" if ext else f"{filename}_{counter}"
                filepath = email_dir / filename
                counter += 1

            # Save file
            filepath.write_bytes(attachment.content)
            logger.info(f"Saved attachment: {filepath}")

            # Return relative path
            return str(filepath.relative_to(cls.ATTACHMENT_BASE_DIR.parent))

        except Exception as e:
            logger.error(f"Failed to save attachment {attachment.filename}: {e}")
            raise

    @staticmethod
    def validate_email(email_address: str) -> bool:
        """Validate email address format.

        Args:
            email_address: Email address to validate

        Returns:
            bool: True if valid format
        """
        import re

        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email_address))

    @staticmethod
    def extract_domain(email_address: str) -> str:
        """Extract domain from email address.

        Args:
            email_address: Email address

        Returns:
            str: Domain part of email
        """
        if "@" in email_address:
            return email_address.split("@")[1]
        return ""

"""Email to ticket conversion service.

Handles conversion of incoming emails into support tickets,
including thread detection, automatic categorization, and acknowledgements.
"""

import logging
import re
import uuid
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import json

from app.modules.tickets.models import (
    Ticket,
    TicketStatus,
    TicketPriority,
    EmailMessage,
    EmailAccount,
    EmailAttachment,
)
from app.modules.customers.models import Customer
from app.modules.tickets.services.email_parser_service import ParsedEmail, EmailParserService

logger = logging.getLogger(__name__)


class EmailToTicketError(Exception):
    """Exception raised for email-to-ticket operations."""

    pass


class TicketCreationResult:
    """Result of email-to-ticket conversion."""

    def __init__(
        self,
        success: bool,
        ticket_id: Optional[str] = None,
        email_message_id: Optional[str] = None,
        error_message: Optional[str] = None,
        is_reply: bool = False,
    ):
        self.success = success
        self.ticket_id = ticket_id
        self.email_message_id = email_message_id
        self.error_message = error_message
        self.is_reply = is_reply

    def __repr__(self) -> str:
        status = "Reply" if self.is_reply else "New"
        return f"<TicketCreationResult {status} - Success={self.success}>"


class EmailToTicketService:
    """Service for converting emails to tickets."""

    # Priority keywords and patterns
    PRIORITY_PATTERNS = {
        TicketPriority.URGENT: [
            r"\burgen",
            r"\bcritical",
            r"\basap",
            r"\bimmediate",
            r"\bdown",
        ],
        TicketPriority.HIGH: [
            r"\bhigh\s+priority",
            r"\bhigh\s+importance",
            r"\bimportant",
        ],
        TicketPriority.LOW: [
            r"\blow\s+priority",
            r"\bnot\s+urgent",
            r"\bwhen\s+possible",
        ],
    }

    # Category keywords
    CATEGORY_PATTERNS = {
        "technical": [r"\berror", r"\bbug", r"\bcrash", r"\bnot\s+work"],
        "billing": [r"\binvoice", r"\bbill", r"\spayment", r"\bcharge"],
        "general": [r"\bquestion", r"\bhelp", r"\binformation"],
    }

    @classmethod
    def process_email(
        cls,
        db: Session,
        parsed_email: ParsedEmail,
        email_account: EmailAccount,
        customer: Optional[Customer] = None,
    ) -> TicketCreationResult:
        """Convert email to ticket or add as reply.

        Args:
            db: Database session
            parsed_email: Parsed email object
            email_account: Source email account
            customer: Optional customer (if known)

        Returns:
            TicketCreationResult: Result of conversion
        """
        try:
            # Check if this is a reply to existing ticket
            reply_to_ticket = cls._find_related_ticket(db, parsed_email)

            if reply_to_ticket:
                # Add email as reply to existing ticket
                return cls._add_ticket_reply(db, parsed_email, email_account, reply_to_ticket)
            else:
                # Create new ticket
                return cls._create_new_ticket(db, parsed_email, email_account, customer)

        except Exception as e:
            logger.error(f"Failed to process email {parsed_email.message_id}: {e}")
            return TicketCreationResult(
                success=False,
                error_message=f"Failed to process email: {str(e)}",
            )

    @classmethod
    def _find_related_ticket(cls, db: Session, parsed_email: ParsedEmail) -> Optional[Ticket]:
        """Find ticket related to email (for replies).

        Args:
            db: Database session
            parsed_email: Parsed email object

        Returns:
            Optional[Ticket]: Related ticket if found
        """
        # Check in-reply-to field
        if parsed_email.in_reply_to:
            email_msg = db.query(EmailMessage).filter(
                EmailMessage.message_id == parsed_email.in_reply_to
            ).first()
            if email_msg and email_msg.ticket_id:
                return db.query(Ticket).filter(Ticket.id == email_msg.ticket_id).first()

        # Check subject line for ticket ID pattern
        ticket_id_match = re.search(r"\[#(\d+)\]", parsed_email.subject)
        if ticket_id_match:
            ticket_id = ticket_id_match.group(1)
            return db.query(Ticket).filter(Ticket.id == ticket_id).first()

        # Check references for any related ticket
        if parsed_email.references:
            for ref in parsed_email.references:
                email_msg = db.query(EmailMessage).filter(
                    EmailMessage.message_id == ref
                ).first()
                if email_msg and email_msg.ticket_id:
                    return db.query(Ticket).filter(Ticket.id == email_msg.ticket_id).first()

        return None

    @classmethod
    def _create_new_ticket(
        cls,
        db: Session,
        parsed_email: ParsedEmail,
        email_account: EmailAccount,
        customer: Optional[Customer] = None,
    ) -> TicketCreationResult:
        """Create new ticket from email.

        Args:
            db: Database session
            parsed_email: Parsed email
            email_account: Source email account
            customer: Customer (if known)

        Returns:
            TicketCreationResult: Creation result
        """
        try:
            # Find or create customer from email
            if not customer:
                customer = cls._find_or_create_customer(db, parsed_email.from_address)

            # Create ticket
            ticket_id = str(uuid.uuid4())
            priority = cls._detect_priority(parsed_email.subject, parsed_email.body_text)
            category = cls._detect_category(parsed_email.subject, parsed_email.body_text)

            ticket = Ticket(
                id=ticket_id,
                title=parsed_email.subject or "(No Subject)",
                description=parsed_email.body_text or parsed_email.body_html or "",
                status=TicketStatus.OPEN,
                priority=priority,
                customer_id=customer.id,
                category_id=category,
                created_by="system",
                created_at=parsed_email.received_at,
            )

            db.add(ticket)
            db.flush()

            # Create email message record
            email_msg = cls._create_email_message(
                db,
                parsed_email,
                email_account,
                ticket_id,
            )

            db.commit()

            logger.info(f"Created ticket {ticket_id} from email {parsed_email.message_id}")

            return TicketCreationResult(
                success=True,
                ticket_id=ticket_id,
                email_message_id=email_msg.id,
                is_reply=False,
            )

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create ticket: {e}")
            raise

    @classmethod
    def _add_ticket_reply(
        cls,
        db: Session,
        parsed_email: ParsedEmail,
        email_account: EmailAccount,
        ticket: Ticket,
    ) -> TicketCreationResult:
        """Add email as reply to existing ticket.

        Args:
            db: Database session
            parsed_email: Parsed email
            email_account: Source email account
            ticket: Target ticket

        Returns:
            TicketCreationResult: Creation result
        """
        try:
            # Create email message record
            email_msg = cls._create_email_message(
                db,
                parsed_email,
                email_account,
                ticket.id,
            )

            # Update ticket status if needed
            if ticket.status == TicketStatus.WAITING_FOR_RESPONSE:
                ticket.status = TicketStatus.OPEN
                ticket.updated_at = datetime.now(timezone.utc)

            db.commit()

            logger.info(f"Added reply to ticket {ticket.id} from email {parsed_email.message_id}")

            return TicketCreationResult(
                success=True,
                ticket_id=ticket.id,
                email_message_id=email_msg.id,
                is_reply=True,
            )

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to add ticket reply: {e}")
            raise

    @classmethod
    def _create_email_message(
        cls,
        db: Session,
        parsed_email: ParsedEmail,
        email_account: EmailAccount,
        ticket_id: Optional[str] = None,
    ) -> EmailMessage:
        """Create email message record in database.

        Args:
            db: Database session
            parsed_email: Parsed email
            email_account: Source email account
            ticket_id: Related ticket ID (if any)

        Returns:
            EmailMessage: Created email message record
        """
        email_msg = EmailMessage(
            id=str(uuid.uuid4()),
            email_account_id=email_account.id,
            message_id=parsed_email.message_id,
            from_address=parsed_email.from_address,
            to_addresses=json.dumps(parsed_email.to_addresses),
            cc_addresses=json.dumps(parsed_email.cc_addresses) if parsed_email.cc_addresses else None,
            subject=parsed_email.subject,
            body_text=parsed_email.body_text,
            body_html=parsed_email.body_html,
            raw_email="",  # Would store actual RFC822 if desired
            in_reply_to=parsed_email.in_reply_to,
            references=json.dumps(parsed_email.references) if parsed_email.references else None,
            ticket_id=ticket_id,
            has_attachments=parsed_email.has_attachments(),
            attachment_count=len(parsed_email.attachments),
            received_at=parsed_email.received_at,
            spam_score=0,  # Would be calculated by spam filter
            is_automated=cls._is_automated_email(parsed_email),
        )

        db.add(email_msg)
        db.flush()

        # Create attachment records
        for attachment in parsed_email.attachments:
            try:
                file_path = EmailParserService.save_attachment(attachment, email_msg.id)

                attachment_record = EmailAttachment(
                    id=str(uuid.uuid4()),
                    email_message_id=email_msg.id,
                    filename=attachment.filename,
                    mime_type=attachment.mime_type,
                    file_size=attachment.size,
                    file_path=file_path,
                    is_inline=attachment.is_inline,
                )

                db.add(attachment_record)
            except Exception as e:
                logger.warning(f"Failed to save attachment {attachment.filename}: {e}")

        return email_msg

    @classmethod
    def _find_or_create_customer(cls, db: Session, email_address: str) -> Customer:
        """Find or create customer from email address.

        Args:
            db: Database session
            email_address: Customer email address

        Returns:
            Customer: Customer record
        """
        # Extract name from email if possible
        name_part = email_address.split("@")[0]
        name_part = name_part.replace(".", " ").replace("_", " ").title()

        customer = db.query(Customer).filter(
            Customer.email == email_address
        ).first()

        if not customer:
            customer = Customer(
                id=str(uuid.uuid4()),
                name=name_part or email_address,
                email=email_address,
                status="active",
                created_by="system",
            )
            db.add(customer)
            db.flush()

        return customer

    @staticmethod
    def _detect_priority(subject: str, body: Optional[str]) -> str:
        """Detect ticket priority from email content.

        Args:
            subject: Email subject
            body: Email body

        Returns:
            str: Detected priority level
        """
        content = f"{subject} {body or ''}".lower()

        for priority, patterns in EmailToTicketService.PRIORITY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, content):
                    return priority

        return TicketPriority.MEDIUM

    @staticmethod
    def _detect_category(subject: str, body: Optional[str]) -> Optional[str]:
        """Detect ticket category from email content.

        Args:
            subject: Email subject
            body: Email body

        Returns:
            Optional[str]: Detected category
        """
        content = f"{subject} {body or ''}".lower()

        for category, patterns in EmailToTicketService.CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, content):
                    return category

        return None

    @staticmethod
    def _is_automated_email(parsed_email: ParsedEmail) -> bool:
        """Detect if email is from automated system.

        Args:
            parsed_email: Parsed email object

        Returns:
            bool: True if email appears automated
        """
        # Check for automated email indicators
        automated_indicators = [
            r"noreply",
            r"no-reply",
            r"auto-reply",
            r"automated",
            r"do not reply",
            r"unattended mailbox",
        ]

        content = f"{parsed_email.from_address} {parsed_email.subject}".lower()

        for indicator in automated_indicators:
            if re.search(indicator, content):
                return True

        return False

    @staticmethod
    def send_acknowledgement_email(
        customer_email: str,
        ticket_id: str,
        ticket_subject: str,
    ) -> bool:
        """Send acknowledgement email to customer.

        Args:
            customer_email: Customer email address
            ticket_id: Created ticket ID
            ticket_subject: Ticket subject line

        Returns:
            bool: True if sent successfully
        """
        # TODO: Implement email sending using configured email service
        logger.info(
            f"Would send acknowledgement for ticket {ticket_id} to {customer_email}"
        )
        return True

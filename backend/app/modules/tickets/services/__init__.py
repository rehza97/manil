"""Ticket module services."""

from app.modules.tickets.services.email_parser_service import (
    EmailParserService,
    ParsedEmail,
    EmailAttachmentInfo,
    EmailParseError,
)
from app.modules.tickets.services.imap_service import (
    IMAPService,
    IMAPEmail,
    IMAPError,
)
from app.modules.tickets.services.email_to_ticket_service import (
    EmailToTicketService,
    TicketCreationResult,
    EmailToTicketError,
)
from app.modules.tickets.services.spam_filter_service import (
    SpamFilterService,
    SpamAnalysisResult,
    SpamFilterError,
)

__all__ = [
    "EmailParserService",
    "ParsedEmail",
    "EmailAttachmentInfo",
    "EmailParseError",
    "IMAPService",
    "IMAPEmail",
    "IMAPError",
    "EmailToTicketService",
    "TicketCreationResult",
    "EmailToTicketError",
    "SpamFilterService",
    "SpamAnalysisResult",
    "SpamFilterError",
]

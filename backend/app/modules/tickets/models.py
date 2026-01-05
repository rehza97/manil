"""Ticket system database models."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


class TicketStatus(str, Enum):
    """Ticket lifecycle states."""

    OPEN = "open"
    ANSWERED = "answered"
    WAITING_FOR_RESPONSE = "waiting_for_response"
    ON_HOLD = "on_hold"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    """Ticket priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Ticket(Base):
    """Ticket model for support system."""

    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default=TicketStatus.OPEN, nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(20), default=TicketPriority.MEDIUM, nullable=False, index=True
    )
    status_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # Foreign keys
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id"), nullable=False, index=True
    )
    assigned_to: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True, index=True
    )
    category_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("ticket_categories.id"), nullable=True, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    first_response_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Audit fields
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Metadata
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    customer = relationship("Customer", back_populates="tickets")
    category = relationship("TicketCategory", foreign_keys=[category_id])
    replies = relationship(
        "TicketReply", back_populates="ticket", cascade="all, delete-orphan"
    )
    tags = relationship(
        "TicketTag", back_populates="ticket", cascade="all, delete-orphan"
    )
    watchers = relationship(
        "TicketWatcher", back_populates="ticket", cascade="all, delete-orphan"
    )
    attachments = relationship(
        "TicketAttachment", back_populates="ticket", cascade="all, delete-orphan"
    )
    history = relationship(
        "TicketHistory", back_populates="ticket", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Ticket {self.id} - {self.title}>"


class TicketReply(Base):
    """Ticket reply/comment model."""

    __tablename__ = "ticket_replies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)
    is_solution: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Audit fields
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    ticket = relationship("Ticket", back_populates="replies")

    def __repr__(self) -> str:
        return f"<TicketReply {self.id} for ticket {self.ticket_id}>"


class EmailBounceType(str, Enum):
    """Email bounce type classification."""

    PERMANENT = "permanent"
    TEMPORARY = "temporary"
    COMPLAINT = "complaint"
    UNSUBSCRIBE = "unsubscribe"


class EmailAccount(Base):
    """Email account configuration for IMAP polling."""

    __tablename__ = "email_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email_address: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    imap_server: Mapped[str] = mapped_column(String(255), nullable=False)
    imap_port: Mapped[int] = mapped_column(Integer, default=993)
    imap_username: Mapped[str] = mapped_column(String(255), nullable=False)
    imap_password_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    use_tls: Mapped[bool] = mapped_column(Boolean, default=True)
    polling_interval_minutes: Mapped[int] = mapped_column(Integer, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    messages = relationship(
        "EmailMessage",
        back_populates="email_account",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EmailAccount {self.email_address}>"


class EmailMessage(Base):
    """Stored email message with RFC822 raw content."""

    __tablename__ = "email_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email_account_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("email_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    from_address: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    to_addresses: Mapped[str] = mapped_column(Text, nullable=False)  # JSON list
    cc_addresses: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_email: Mapped[str] = mapped_column(Text, nullable=False)

    # Email threading
    in_reply_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    references: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON

    # Ticket linking
    ticket_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("tickets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    thread_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )

    # Security & quality metrics
    spam_score: Mapped[int] = mapped_column(Integer, default=0)
    is_spam: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_automated: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    has_attachments: Mapped[bool] = mapped_column(Boolean, default=False)
    attachment_count: Mapped[int] = mapped_column(Integer, default=0)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    email_account = relationship("EmailAccount", back_populates="messages")
    ticket = relationship("Ticket")
    attachments = relationship(
        "EmailAttachment",
        back_populates="email_message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<EmailMessage {self.message_id} from {self.from_address}>"


class EmailAttachment(Base):
    """Email attachment metadata and storage."""

    __tablename__ = "email_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email_message_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("email_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_inline: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    email_message = relationship("EmailMessage", back_populates="attachments")

    def __repr__(self) -> str:
        return f"<EmailAttachment {self.filename}>"


class EmailBounce(Base):
    """Track bounced email addresses and bounce metrics."""

    __tablename__ = "email_bounces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email_address: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    bounce_type: Mapped[str] = mapped_column(
        String(50), default=EmailBounceType.PERMANENT, nullable=False
    )
    bounce_reason: Mapped[str] = mapped_column(Text, nullable=False)
    bounce_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_invalid: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_retry_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Sender reputation
    sender_reputation_score: Mapped[int] = mapped_column(Integer, default=100)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<EmailBounce {self.email_address}>"


class Tag(Base):
    """Tag for organizing and categorizing tickets."""

    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#3B82F6", nullable=False)  # Hex color

    # Statistics
    usage_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Audit fields
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    ticket_tags = relationship(
        "TicketTag", back_populates="tag", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Tag {self.name}>"


class TicketTag(Base):
    """Association between tickets and tags (many-to-many)."""

    __tablename__ = "ticket_tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tag_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tags.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    ticket = relationship("Ticket", back_populates="tags")
    tag = relationship("Tag", back_populates="ticket_tags")

    def __repr__(self) -> str:
        return f"<TicketTag ticket={self.ticket_id} tag={self.tag_id}>"


class TicketWatcher(Base):
    """Track users watching a ticket for updates."""

    __tablename__ = "ticket_watchers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Notification preference
    notify_on_reply: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_status_change: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_assignment: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    ticket = relationship("Ticket", back_populates="watchers")

    def __repr__(self) -> str:
        return f"<TicketWatcher ticket={self.ticket_id} user={self.user_id}>"


class SLAPolicy(Base):
    """SLA (Service Level Agreement) policy definitions."""

    __tablename__ = "sla_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # SLA time limits (in minutes)
    first_response_time: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g., 60
    resolution_time: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g., 480

    # Priority-based SLA
    priority: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True
    )  # If null, applies to all priorities

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    breaches = relationship(
        "SLABreach", back_populates="policy", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<SLAPolicy {self.id} - {self.name}>"


class SLABreach(Base):
    """Track SLA breaches for tickets."""

    __tablename__ = "sla_breaches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    policy_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sla_policies.id"), nullable=False, index=True
    )

    # Breach type
    breach_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "first_response" or "resolution"

    # Breach time
    expected_by: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    breached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Resolution
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    ticket = relationship("Ticket")
    policy = relationship("SLAPolicy", back_populates="breaches")

    def __repr__(self) -> str:
        return f"<SLABreach ticket={self.ticket_id} type={self.breach_type}>"


class SupportGroup(Base):
    """Support group model for organizing support agents."""

    __tablename__ = "support_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    members = relationship(
        "SupportGroupMember", back_populates="group", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<SupportGroup {self.id} - {self.name}>"


class SupportGroupMember(Base):
    """Support group member (user) association."""

    __tablename__ = "support_group_members"

    group_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("support_groups.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    group = relationship("SupportGroup", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<SupportGroupMember group={self.group_id} user={self.user_id}>"


class AutomationRule(Base):
    """Automation rule for ticket processing."""

    __tablename__ = "automation_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trigger_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # 'ticket_created', 'ticket_updated', 'ticket_replied'
    conditions: Mapped[dict] = mapped_column(
        JSONB, nullable=False
    )  # Rule conditions
    actions: Mapped[dict] = mapped_column(JSONB, nullable=False)  # Actions to execute
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AutomationRule {self.id} - {self.name}>"


class TicketAttachment(Base):
    """File attachment on a ticket."""

    __tablename__ = "ticket_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)  # Storage path

    # Security
    virus_scanned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_safe: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Metadata
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Visible to customer
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Audit fields
    uploaded_by: Mapped[str] = mapped_column(String(36), nullable=False)

    # Relationships
    ticket = relationship("Ticket", back_populates="attachments")

    def __repr__(self) -> str:
        return f"<TicketAttachment {self.id} - {self.filename}>"


class TicketHistory(Base):
    """Audit log for ticket changes."""

    __tablename__ = "ticket_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Change tracking
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # Actions: 'created', 'updated', 'status_changed', 'assigned', 'priority_changed',
    # 'tagged', 'commented', 'closed', 'reopened', 'merged', etc.

    field_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Context
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    change_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Audit
    created_by: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)  # IPv6 support

    # Relationships
    ticket = relationship("Ticket", back_populates="history")

    def __repr__(self) -> str:
        return f"<TicketHistory {self.id} - {self.action} on ticket {self.ticket_id}>"


# Import models that are defined in other files but need to be available via models.py
from app.modules.tickets.response_templates import TicketCategory, ResponseTemplate  # noqa: E402, F401

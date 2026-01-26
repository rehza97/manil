"""In-app notification models."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from sqlalchemy import DateTime, String, Text, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base


class Notification(Base):
    """In-app notification for a user."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Notification {self.id} user={self.user_id} type={self.type}>"


class EmailSendStatus(str, Enum):
    """Email send status enumeration."""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class EmailSendHistory(Base):
    """Email send history tracking model."""

    __tablename__ = "email_send_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    
    # Template information
    template_name: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    
    # Recipient information
    recipient_email: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    recipient_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    # Email content
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    html_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    text_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Send status
    status: Mapped[str] = mapped_column(
        String(20), default=EmailSendStatus.PENDING.value, nullable=False, index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Provider information
    provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    
    # Metadata
    email_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<EmailSendHistory {self.id} template={self.template_name} recipient={self.recipient_email} status={self.status}>"


class NotificationTargetType(str, Enum):
    """Notification group target type enumeration."""
    ALL = "all"
    CUSTOMER_TYPE = "customer_type"
    CATEGORY = "category"
    CUSTOM = "custom"


class NotificationGroup(Base):
    """Notification group for targeting notifications to specific user sets."""

    __tablename__ = "notification_groups"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # all, customer_type, category, custom
    target_criteria: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )  # JSON object storing targeting rules
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
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

    def __repr__(self) -> str:
        return f"<NotificationGroup {self.id} name={self.name} target_type={self.target_type}>"

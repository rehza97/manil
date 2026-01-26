"""SMS message models for custom SMS gateway."""
import uuid
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base


class SMSStatus(str, enum.Enum):
    """SMS message status."""

    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class SMSMessage(Base):
    """SMS message queued for sending via custom gateway."""

    __tablename__ = "sms_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[SMSStatus] = mapped_column(
        SQLEnum(SMSStatus), nullable=False, default=SMSStatus.PENDING, index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
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
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<SMSMessage {self.id} to={self.phone_number} status={self.status.value}>"

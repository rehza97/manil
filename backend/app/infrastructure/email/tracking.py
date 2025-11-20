"""
Email tracking model and service.

Track email delivery status, opens, and failures.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from enum import Enum

from sqlalchemy import Column, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import Base


class EmailStatus(str, Enum):
    """Email delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    FAILED = "failed"


class EmailTracking(Base):
    """Email tracking model."""
    __tablename__ = "email_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    email_type = Column(String(50), nullable=False, index=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    status = Column(String(20), nullable=False, default=EmailStatus.PENDING, index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index('idx_email_tracking_status_created', 'status', 'created_at'),
        Index('idx_email_tracking_type_created', 'email_type', 'created_at'),
    )


class EmailTrackingService:
    """Service for tracking email delivery."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_tracking(
        self,
        recipient_email: str,
        subject: str,
        email_type: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailTracking:
        """
        Create email tracking record.

        Args:
            recipient_email: Recipient email address
            subject: Email subject
            email_type: Type of email (quote, invoice, ticket, etc.)
            related_entity_type: Type of related entity
            related_entity_id: ID of related entity
            metadata: Additional metadata

        Returns:
            EmailTracking instance
        """
        tracking = EmailTracking(
            recipient_email=recipient_email,
            subject=subject,
            email_type=email_type,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            status=EmailStatus.PENDING,
            metadata=metadata,
        )
        self.db.add(tracking)
        await self.db.flush()
        return tracking

    async def mark_sent(self, tracking_id: uuid.UUID) -> EmailTracking:
        """Mark email as sent."""
        query = select(EmailTracking).where(EmailTracking.id == tracking_id)
        result = await self.db.execute(query)
        tracking = result.scalar_one_or_none()

        if tracking:
            tracking.status = EmailStatus.SENT
            tracking.sent_at = datetime.now(timezone.utc)
            await self.db.flush()

        return tracking

    async def mark_delivered(self, tracking_id: uuid.UUID) -> EmailTracking:
        """Mark email as delivered."""
        query = select(EmailTracking).where(EmailTracking.id == tracking_id)
        result = await self.db.execute(query)
        tracking = result.scalar_one_or_none()

        if tracking:
            tracking.status = EmailStatus.DELIVERED
            tracking.delivered_at = datetime.now(timezone.utc)
            await self.db.flush()

        return tracking

    async def mark_opened(self, tracking_id: uuid.UUID) -> EmailTracking:
        """Mark email as opened."""
        query = select(EmailTracking).where(EmailTracking.id == tracking_id)
        result = await self.db.execute(query)
        tracking = result.scalar_one_or_none()

        if tracking:
            tracking.status = EmailStatus.OPENED
            tracking.opened_at = datetime.now(timezone.utc)
            await self.db.flush()

        return tracking

    async def mark_failed(self, tracking_id: uuid.UUID, error_message: str) -> EmailTracking:
        """Mark email as failed."""
        query = select(EmailTracking).where(EmailTracking.id == tracking_id)
        result = await self.db.execute(query)
        tracking = result.scalar_one_or_none()

        if tracking:
            tracking.status = EmailStatus.FAILED
            tracking.failed_at = datetime.now(timezone.utc)
            tracking.error_message = error_message
            await self.db.flush()

        return tracking

    async def get_by_entity(
        self,
        entity_type: str,
        entity_id: str,
    ) -> list[EmailTracking]:
        """Get all email tracking records for an entity."""
        query = select(EmailTracking).where(
            EmailTracking.related_entity_type == entity_type,
            EmailTracking.related_entity_id == entity_id
        ).order_by(EmailTracking.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

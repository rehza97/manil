"""SMS message repository for database operations."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.infrastructure.sms.models import SMSMessage, SMSStatus


class SMSRepository:
    """SMS message data access layer."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create_message(
        self, phone_number: str, message: str
    ) -> SMSMessage:
        """
        Create and queue a new SMS message.

        Args:
            phone_number: Recipient phone number
            message: SMS message content

        Returns:
            Created SMSMessage object
        """
        sms = SMSMessage(
            phone_number=phone_number,
            message=message,
            status=SMSStatus.PENDING,
        )
        self.db.add(sms)
        await self.db.commit()
        await self.db.refresh(sms)
        logger.info(
            "SMS queue create_message: inserted id=%s, to=%s, status=pending (table: sms_messages)",
            sms.id,
            phone_number,
        )
        return sms

    async def get_pending_messages(
        self, device_id: Optional[str] = None, limit: int = 10
    ) -> List[SMSMessage]:
        """
        Get pending SMS messages, optionally filtered by device_id.

        Args:
            device_id: Optional device ID to filter messages
            limit: Maximum number of messages to return

        Returns:
            List of pending SMS messages
        """
        query = select(SMSMessage).where(
            SMSMessage.status == SMSStatus.PENDING
        )

        # If device_id is provided, only get messages not yet assigned to a device
        # or messages assigned to this specific device
        if device_id:
            query = query.where(
                (SMSMessage.device_id.is_(None)) | (SMSMessage.device_id == device_id)
            )

        query = query.order_by(SMSMessage.created_at.asc()).limit(limit)

        logger.info(
            "SMS get_pending_messages: device_id=%s, limit=%s (query: status=pending, device_id IS NULL OR = device_id)",
            device_id,
            limit,
        )
        result = await self.db.execute(query)
        rows = list(result.scalars().all())
        logger.info("SMS get_pending_messages result: %s row(s) from sms_messages", len(rows))
        return rows

    async def update_message_status(
        self,
        message_id: uuid.UUID,
        status: SMSStatus,
        device_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[SMSMessage]:
        """
        Update SMS message status after sending.

        Args:
            message_id: SMS message ID
            status: New status (SENT or FAILED)
            device_id: Device ID that processed the message
            error_message: Error message if status is FAILED

        Returns:
            Updated SMSMessage object or None if not found
        """
        query = select(SMSMessage).where(SMSMessage.id == message_id)
        result = await self.db.execute(query)
        sms = result.scalar_one_or_none()

        if not sms:
            return None

        sms.status = status
        if device_id:
            sms.device_id = device_id
        if error_message:
            sms.error_message = error_message
        if status == SMSStatus.SENT:
            sms.sent_at = datetime.now(timezone.utc)
        sms.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(sms)
        return sms

    async def get_by_id(self, message_id: uuid.UUID) -> Optional[SMSMessage]:
        """
        Get SMS message by ID.

        Args:
            message_id: SMS message ID

        Returns:
            SMSMessage object or None if not found
        """
        query = select(SMSMessage).where(SMSMessage.id == message_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_messages(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[SMSStatus] = None,
    ) -> List[SMSMessage]:
        """
        List SMS messages for admin queue view.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional status filter (pending, sent, failed)

        Returns:
            List of SMSMessage objects ordered by created_at desc
        """
        query = select(SMSMessage).order_by(SMSMessage.created_at.desc())
        if status is not None:
            query = query.where(SMSMessage.status == status)
        query = query.offset(skip).limit(limit)
        logger.info(
            "SMS queue list_messages: skip=%s, limit=%s, status=%s (query: sms_messages ORDER BY created_at DESC)",
            skip,
            limit,
            status.value if status is not None else "all",
        )
        result = await self.db.execute(query)
        rows = list(result.scalars().all())
        logger.info("SMS queue list_messages result: %s row(s) returned", len(rows))
        return rows

"""
Email send history service.

Tracks email sends for auditing and debugging purposes.
"""
from datetime import datetime, timezone, timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.notifications.models import EmailSendStatus
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import EmailSendHistory, EmailSendStatus
from app.core.logging import logger


class SendHistoryService:
    """Service for managing email send history."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def log_send(
        self,
        template_name: str,
        recipient_email: str,
        subject: str,
        html_body: Optional[str] = None,
        text_body: Optional[str] = None,
        recipient_user_id: Optional[str] = None,
        provider: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailSendHistory:
        """
        Log an email send attempt.

        Args:
            template_name: Name of the email template
            recipient_email: Recipient email address
            subject: Email subject
            html_body: HTML email body (optional)
            text_body: Plain text email body (optional)
            recipient_user_id: User ID if recipient is a registered user
            provider: Email provider used (smtp, sendgrid, ses)
            metadata: Additional metadata (JSON)

        Returns:
            Created EmailSendHistory record
        """
        history = EmailSendHistory(
            template_name=template_name,
            recipient_email=recipient_email,
            recipient_user_id=recipient_user_id,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            status=EmailSendStatus.PENDING.value,
            provider=provider,
            email_metadata=metadata,
        )

        self.db.add(history)
        await self.db.commit()
        await self.db.refresh(history)

        return history

    async def update_send_status(
        self,
        history_id: str,
        status: EmailSendStatus | str,
        message_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[EmailSendHistory]:
        """
        Update email send status.

        Args:
            history_id: Email send history ID
            status: New status (sent or failed)
            message_id: Provider message ID (if available)
            error_message: Error message if failed

        Returns:
            Updated EmailSendHistory record or None if not found
        """
        result = await self.db.execute(
            select(EmailSendHistory).where(EmailSendHistory.id == history_id)
        )
        history = result.scalar_one_or_none()

        if not history:
            logger.warning(f"Email send history not found: {history_id}")
            return None

        if isinstance(status, EmailSendStatus):
            history.status = status.value
            status_check = status
        else:
            history.status = status
            # Try to convert string to enum for comparison
            try:
                status_check = EmailSendStatus(status)
            except ValueError:
                status_check = None
        
        history.message_id = message_id
        history.error_message = error_message

        if status_check == EmailSendStatus.SENT or (isinstance(status, str) and status == "sent"):
            history.sent_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(history)

        return history

    async def get_history(
        self,
        recipient_email: Optional[str] = None,
        template_name: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """
        Get email send history with filtering and pagination.

        Args:
            recipient_email: Filter by recipient email
            template_name: Filter by template name
            status: Filter by status (pending, sent, failed)
            from_date: Filter by start date
            to_date: Filter by end date
            page: Page number (1-based)
            page_size: Number of records per page

        Returns:
            Dictionary with 'items' (list) and 'total' (count)
        """
        query = select(EmailSendHistory)

        # Apply filters
        conditions = []
        if recipient_email:
            conditions.append(EmailSendHistory.recipient_email == recipient_email)
        if template_name:
            conditions.append(EmailSendHistory.template_name == template_name)
        if status:
            conditions.append(EmailSendHistory.status == status)
        if from_date:
            conditions.append(EmailSendHistory.created_at >= from_date)
        if to_date:
            conditions.append(EmailSendHistory.created_at <= to_date)

        if conditions:
            query = query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(EmailSendHistory)
        if conditions:
            count_query = count_query.where(and_(*conditions))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.order_by(EmailSendHistory.created_at.desc())
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    async def get_template_stats(
        self,
        template_name: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get statistics for a specific template.

        Args:
            template_name: Template name
            days: Number of days to look back

        Returns:
            Dictionary with statistics
        """
        from_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Total sends
        total_query = select(func.count()).where(
            and_(
                EmailSendHistory.template_name == template_name,
                EmailSendHistory.created_at >= from_date,
            )
        )
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # Successful sends
        sent_query = select(func.count()).where(
            and_(
                EmailSendHistory.template_name == template_name,
                EmailSendHistory.status == EmailSendStatus.SENT.value,
                EmailSendHistory.created_at >= from_date,
            )
        )
        sent_result = await self.db.execute(sent_query)
        sent = sent_result.scalar() or 0

        # Failed sends
        failed_query = select(func.count()).where(
            and_(
                EmailSendHistory.template_name == template_name,
                EmailSendHistory.status == EmailSendStatus.FAILED.value,
                EmailSendHistory.created_at >= from_date,
            )
        )
        failed_result = await self.db.execute(failed_query)
        failed = failed_result.scalar() or 0

        return {
            "template_name": template_name,
            "period_days": days,
            "total": total,
            "sent": sent,
            "failed": failed,
            "success_rate": (sent / total * 100) if total > 0 else 0,
        }

"""
Auto-close service for tickets.

Automatically closes resolved tickets after a configurable number of days.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import Ticket, TicketStatus
from app.modules.settings.service import SystemSettingService
from app.core.logging import logger


class AutoCloseService:
    """Service for automatically closing resolved tickets."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.settings_service = SystemSettingService(db)

    async def get_auto_close_days(self) -> int:
        """
        Get auto-close days setting from system settings.

        Returns:
            Number of days (default: 7)
        """
        try:
            setting = await self.settings_service.get_by_key("tickets.auto_close_days")
            if setting and setting.value:
                # Handle both dict and direct value formats
                if isinstance(setting.value, dict):
                    value = setting.value.get("value")
                else:
                    value = setting.value
                return int(value) if value else 7
        except Exception as e:
            logger.warning(f"Failed to get auto-close days setting: {e}")
        return 7  # Default value

    async def close_resolved_tickets(self) -> Dict[str, Any]:
        """
        Close tickets that have been resolved for longer than auto_close_days.

        Returns:
            Dictionary with statistics about closed tickets
        """
        auto_close_days = await self.get_auto_close_days()
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=auto_close_days)

        # Query tickets with status="resolved" and resolved_at before cutoff
        query = select(Ticket).where(
            and_(
                Ticket.status == TicketStatus.RESOLVED.value,
                Ticket.resolved_at.isnot(None),
                Ticket.resolved_at <= cutoff_date,
                Ticket.deleted_at.is_(None),  # Exclude soft-deleted tickets
            )
        )

        result = await self.db.execute(query)
        tickets_to_close = result.scalars().all()

        closed_count = 0
        errors = []

        for ticket in tickets_to_close:
            try:
                # Update ticket status to closed
                ticket.status = TicketStatus.CLOSED.value
                ticket.closed_at = datetime.now(timezone.utc)
                ticket.updated_at = datetime.now(timezone.utc)
                ticket.status_reason = f"Automatically closed after {auto_close_days} days in resolved status"

                closed_count += 1

                # Log the auto-close action
                logger.info(
                    f"Auto-closed ticket {ticket.id} (resolved on {ticket.resolved_at}, "
                    f"auto-close threshold: {auto_close_days} days)"
                )

            except Exception as e:
                error_msg = f"Failed to close ticket {ticket.id}: {e}"
                logger.error(error_msg)
                errors.append(error_msg)

        # Commit all changes
        if closed_count > 0:
            await self.db.commit()

        return {
            "closed_count": closed_count,
            "errors": errors,
            "auto_close_days": auto_close_days,
            "cutoff_date": cutoff_date.isoformat(),
        }

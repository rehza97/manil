"""Watcher service for managing ticket watchers."""
import logging
from typing import Optional
from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from app.modules.tickets.models import TicketWatcher, Ticket
from app.modules.tickets.schemas import (
    WatcherCreate,
    WatcherResponse,
    WatcherNotificationPreferences,
    TicketWatcherList,
)
from app.core.exceptions import NotFoundException, ConflictException

logger = logging.getLogger(__name__)


class WatcherService:
    """Service for managing ticket watchers."""

    @staticmethod
    def add_watcher(
        db: Session,
        ticket_id: str,
        watcher_data: WatcherCreate,
    ) -> WatcherResponse:
        """Add a watcher to a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID
            watcher_data: Watcher data including user_id and notification preferences

        Returns:
            WatcherResponse: Created watcher data

        Raises:
            NotFoundException: If ticket not found
            ConflictException: If user is already watching the ticket
        """
        # Verify ticket exists
        ticket = db.execute(
            select(Ticket).where(
                and_(Ticket.id == ticket_id, Ticket.deleted_at.is_(None))
            )
        ).first()

        if not ticket:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        # Check if already watching
        existing = db.execute(
            select(TicketWatcher).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == watcher_data.user_id,
                )
            )
        ).first()

        if existing:
            raise ConflictException(f"User is already watching this ticket")

        # Create watcher
        preferences = watcher_data.preferences or WatcherNotificationPreferences()

        watcher = TicketWatcher(
            id=str(uuid4()),
            ticket_id=ticket_id,
            user_id=watcher_data.user_id,
            notify_on_reply=preferences.notify_on_reply,
            notify_on_status_change=preferences.notify_on_status_change,
            notify_on_assignment=preferences.notify_on_assignment,
        )

        db.add(watcher)
        db.commit()
        db.refresh(watcher)

        logger.info(f"Watcher added: {watcher.id} for ticket {ticket_id}")
        return WatcherResponse.model_validate(watcher)

    @staticmethod
    def remove_watcher(db: Session, ticket_id: str, user_id: str) -> None:
        """Remove a watcher from a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID
            user_id: User ID

        Raises:
            NotFoundException: If watcher not found
        """
        watcher = db.execute(
            select(TicketWatcher).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == user_id,
                )
            )
        ).first()

        if not watcher:
            raise NotFoundException(f"User is not watching this ticket")

        db.delete(watcher[0])
        db.commit()

        logger.info(f"Watcher removed: ticket {ticket_id}, user {user_id}")

    @staticmethod
    def get_ticket_watchers(
        db: Session,
        ticket_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> TicketWatcherList:
        """Get all watchers for a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID
            skip: Number of items to skip
            limit: Maximum items to return

        Returns:
            TicketWatcherList: List of watchers
        """
        query = select(TicketWatcher).where(TicketWatcher.ticket_id == ticket_id)

        # Get total count
        total_count = db.execute(
            select(func.count()).select_from(TicketWatcher).where(
                TicketWatcher.ticket_id == ticket_id
            )
        ).scalar()

        # Get paginated results
        watchers = db.execute(
            query.order_by(TicketWatcher.created_at.desc()).offset(skip).limit(limit)
        ).scalars().all()

        return TicketWatcherList(
            data=[WatcherResponse.model_validate(watcher) for watcher in watchers],
            total_count=total_count,
        )

    @staticmethod
    def update_watcher_preferences(
        db: Session,
        ticket_id: str,
        user_id: str,
        preferences: WatcherNotificationPreferences,
    ) -> WatcherResponse:
        """Update watcher notification preferences.

        Args:
            db: Database session
            ticket_id: Ticket ID
            user_id: User ID
            preferences: New notification preferences

        Returns:
            WatcherResponse: Updated watcher data

        Raises:
            NotFoundException: If watcher not found
        """
        watcher = db.execute(
            select(TicketWatcher).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == user_id,
                )
            )
        ).first()

        if not watcher:
            raise NotFoundException(f"User is not watching this ticket")

        watcher = watcher[0]
        watcher.notify_on_reply = preferences.notify_on_reply
        watcher.notify_on_status_change = preferences.notify_on_status_change
        watcher.notify_on_assignment = preferences.notify_on_assignment

        db.commit()
        db.refresh(watcher)

        logger.info(f"Watcher preferences updated: ticket {ticket_id}, user {user_id}")
        return WatcherResponse.model_validate(watcher)

    @staticmethod
    def is_watching(db: Session, ticket_id: str, user_id: str) -> bool:
        """Check if user is watching a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID
            user_id: User ID

        Returns:
            True if user is watching the ticket
        """
        watcher = db.execute(
            select(TicketWatcher).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == user_id,
                )
            )
        ).first()

        return watcher is not None

    @staticmethod
    def get_watchers_to_notify(
        db: Session,
        ticket_id: str,
        notify_type: str,  # "reply", "status_change", "assignment"
    ) -> list[str]:
        """Get user IDs of watchers to notify based on event type.

        Args:
            db: Database session
            ticket_id: Ticket ID
            notify_type: Type of notification event

        Returns:
            List of user IDs to notify
        """
        if notify_type == "reply":
            watchers = db.execute(
                select(TicketWatcher.user_id).where(
                    and_(
                        TicketWatcher.ticket_id == ticket_id,
                        TicketWatcher.notify_on_reply.is_(True),
                    )
                )
            ).scalars().all()
        elif notify_type == "status_change":
            watchers = db.execute(
                select(TicketWatcher.user_id).where(
                    and_(
                        TicketWatcher.ticket_id == ticket_id,
                        TicketWatcher.notify_on_status_change.is_(True),
                    )
                )
            ).scalars().all()
        elif notify_type == "assignment":
            watchers = db.execute(
                select(TicketWatcher.user_id).where(
                    and_(
                        TicketWatcher.ticket_id == ticket_id,
                        TicketWatcher.notify_on_assignment.is_(True),
                    )
                )
            ).scalars().all()
        else:
            watchers = []

        return list(watchers)

    @staticmethod
    def get_user_watched_tickets(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[str], int]:
        """Get all ticket IDs watched by a user.

        Args:
            db: Database session
            user_id: User ID
            skip: Number of items to skip
            limit: Maximum items to return

        Returns:
            Tuple of ticket IDs and total count
        """
        query = select(TicketWatcher.ticket_id).where(
            TicketWatcher.user_id == user_id
        )

        # Get total count
        total_count = db.execute(
            select(func.count()).select_from(TicketWatcher).where(
                TicketWatcher.user_id == user_id
            )
        ).scalar()

        # Get paginated results
        ticket_ids = db.execute(
            query.order_by(TicketWatcher.created_at.desc()).offset(skip).limit(limit)
        ).scalars().all()

        return list(ticket_ids), total_count

    @staticmethod
    def remove_watcher_from_all_tickets(db: Session, user_id: str) -> None:
        """Remove a user as watcher from all tickets (e.g., when user is deleted).

        Args:
            db: Database session
            user_id: User ID
        """
        db.execute(
            select(TicketWatcher).where(TicketWatcher.user_id == user_id)
        )
        db.commit()

        logger.info(f"Removed user {user_id} as watcher from all tickets")

    @staticmethod
    def get_watcher_statistics(db: Session, ticket_id: str) -> dict:
        """Get statistics about watchers for a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID

        Returns:
            Dictionary with watcher statistics
        """
        total_watchers = db.execute(
            select(func.count(TicketWatcher.id)).where(
                TicketWatcher.ticket_id == ticket_id
            )
        ).scalar()

        notify_reply = db.execute(
            select(func.count(TicketWatcher.id)).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.notify_on_reply.is_(True),
                )
            )
        ).scalar()

        notify_status = db.execute(
            select(func.count(TicketWatcher.id)).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.notify_on_status_change.is_(True),
                )
            )
        ).scalar()

        notify_assignment = db.execute(
            select(func.count(TicketWatcher.id)).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.notify_on_assignment.is_(True),
                )
            )
        ).scalar()

        return {
            "total_watchers": total_watchers,
            "notify_on_reply": notify_reply,
            "notify_on_status_change": notify_status,
            "notify_on_assignment": notify_assignment,
        }

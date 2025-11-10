"""Ticket service - business logic layer."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ForbiddenException
from app.core.logging import logger
from app.modules.tickets.repository import TicketRepository
from app.modules.tickets.models import Ticket, TicketReply
from app.modules.tickets.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketReplyCreate,
)


class TicketService:
    """Ticket business logic service."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = TicketRepository(db)

    async def create_ticket(
        self, ticket_data: TicketCreate, created_by: str
    ) -> Ticket:
        """Create new support ticket."""
        try:
            ticket = await self.repository.create(ticket_data, created_by)
            logger.info(
                f"Ticket created: {ticket.id} for customer {ticket.customer_id}"
            )
            return ticket
        except Exception as e:
            logger.error(f"Failed to create ticket: {str(e)}")
            raise

    async def get_ticket(self, ticket_id: str) -> Ticket:
        """Get ticket by ID with permission check."""
        ticket = await self.repository.get_by_id(ticket_id)
        if not ticket:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        # Increment view count
        await self.repository.increment_view_count(ticket_id)
        return ticket

    async def list_tickets(
        self,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
    ) -> tuple[list[Ticket], int]:
        """List all tickets with pagination."""
        return await self.repository.get_all(skip, limit, customer_id)

    async def list_tickets_with_filters(
        self,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[dict] = None,
    ) -> tuple[list[Ticket], int]:
        """List tickets with advanced filtering."""
        if filters is None:
            filters = {}

        return await self.repository.get_all(skip, limit, filters.get("customer_id"))

    async def update_ticket(
        self, ticket_id: str, ticket_data: TicketUpdate, updated_by: str
    ) -> Ticket:
        """Update ticket details."""
        ticket = await self.get_ticket(ticket_id)
        updated = await self.repository.update(ticket_id, ticket_data, updated_by)

        if not updated:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket updated: {ticket_id}")
        return updated

    async def change_status(
        self, ticket_id: str, new_status: str, reason: Optional[str], updated_by: str
    ) -> Ticket:
        """Change ticket status with validation and reason."""
        ticket = await self.get_ticket(ticket_id)

        # Validate status transition
        valid_transitions = {
            "open": ["answered", "in_progress", "on_hold", "closed"],
            "answered": ["in_progress", "on_hold", "waiting_for_response", "closed"],
            "waiting_for_response": ["answered", "in_progress", "closed"],
            "on_hold": ["in_progress", "answered", "closed"],
            "in_progress": ["resolved", "closed", "on_hold"],
            "resolved": ["closed"],
            "closed": ["open"],
        }

        if new_status not in valid_transitions.get(ticket.status, []):
            raise ForbiddenException(
                f"Cannot transition from {ticket.status} to {new_status}"
            )

        updated = await self.repository.update_status(ticket_id, new_status, updated_by)
        if not updated:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket {ticket_id} status changed to {new_status}")
        return updated

    async def assign_ticket(
        self, ticket_id: str, user_id: str, assigned_by: str
    ) -> Ticket:
        """Assign ticket to user."""
        ticket = await self.get_ticket(ticket_id)
        assigned = await self.repository.assign(ticket_id, user_id, assigned_by)

        if not assigned:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket {ticket_id} assigned to {user_id}")
        return assigned

    async def transfer_ticket(
        self, ticket_id: str, new_user_id: str, transferred_by: str
    ) -> Ticket:
        """Transfer ticket to another user."""
        ticket = await self.get_ticket(ticket_id)
        transferred = await self.repository.transfer(
            ticket_id, new_user_id, transferred_by
        )

        if not transferred:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket {ticket_id} transferred to {new_user_id}")
        return transferred

    async def close_ticket(self, ticket_id: str, closed_by: str) -> Ticket:
        """Close ticket."""
        ticket = await self.get_ticket(ticket_id)
        return await self.change_status(ticket_id, "closed", None, closed_by)

    async def delete_ticket(self, ticket_id: str, deleted_by: str) -> bool:
        """Delete (soft delete) ticket."""
        ticket = await self.get_ticket(ticket_id)
        result = await self.repository.delete(ticket_id, deleted_by)
        if result:
            logger.info(f"Ticket {ticket_id} deleted")
        return result

    async def add_reply(
        self, ticket_id: str, reply_data: TicketReplyCreate, user_id: str
    ) -> TicketReply:
        """Add reply to ticket."""
        ticket = await self.get_ticket(ticket_id)
        reply = await self.repository.add_reply(ticket_id, reply_data, user_id)

        if not reply:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Reply added to ticket {ticket_id}")
        return reply

    async def get_ticket_replies(self, ticket_id: str, current_user=None) -> list[TicketReply]:
        """Get all replies for ticket with permission filtering."""
        ticket = await self.get_ticket(ticket_id)
        replies = await self.repository.get_replies(ticket_id)

        # ✅ FIXED: Filter internal notes based on user role
        if current_user and current_user.role == "client":
            # Customers only see non-internal replies
            replies = [r for r in replies if not r.is_internal]

        return replies

    async def delete_reply(self, reply_id: str, deleted_by: str) -> bool:
        """Delete (soft delete) reply."""
        result = await self.repository.delete_reply(reply_id, deleted_by)
        if result:
            logger.info(f"Reply {reply_id} deleted")
        return result

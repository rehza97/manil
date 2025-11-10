"""Ticket repository - data access layer."""
import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import Ticket, TicketReply
from app.modules.tickets.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketReplyCreate,
)


class TicketRepository:
    """Ticket data access layer."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(self, ticket_data: TicketCreate, created_by: str) -> Ticket:
        """Create new ticket with transaction safety."""
        try:
            ticket = Ticket(
                id=str(uuid.uuid4()),
                **ticket_data.model_dump(exclude={"customer_id"}),
                customer_id=ticket_data.customer_id,
                created_by=created_by,
            )
            self.db.add(ticket)
            await self.db.commit()
            await self.db.refresh(ticket)
            return ticket
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_by_id(self, ticket_id: str) -> Optional[Ticket]:
        """Get ticket by ID."""
        query = select(Ticket).where(
            and_(Ticket.id == ticket_id, Ticket.deleted_at.is_(None))
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self, skip: int = 0, limit: int = 20, customer_id: Optional[str] = None
    ) -> tuple[list[Ticket], int]:
        """Get all tickets with pagination (efficient count)."""
        conditions = [Ticket.deleted_at.is_(None)]
        if customer_id:
            conditions.append(Ticket.customer_id == customer_id)

        # Efficient count query using func.count()
        count_query = select(func.count()).select_from(Ticket).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Get paginated results
        query = (
            select(Ticket)
            .where(and_(*conditions))
            .order_by(Ticket.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_status(self, status: str) -> list[Ticket]:
        """Get tickets by status."""
        query = select(Ticket).where(
            and_(Ticket.status == status, Ticket.deleted_at.is_(None))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_assigned_to_user(self, user_id: str) -> list[Ticket]:
        """Get tickets assigned to user."""
        query = select(Ticket).where(
            and_(Ticket.assigned_to == user_id, Ticket.deleted_at.is_(None))
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(
        self, ticket_id: str, ticket_data: TicketUpdate, updated_by: str
    ) -> Optional[Ticket]:
        """Update ticket."""
        ticket = await self.get_by_id(ticket_id)
        if not ticket:
            return None

        update_data = ticket_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(ticket, field, value)

        ticket.updated_by = updated_by
        ticket.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def update_status(
        self, ticket_id: str, status: str, updated_by: str
    ) -> Optional[Ticket]:
        """Update ticket status."""
        ticket = await self.get_by_id(ticket_id)
        if not ticket:
            return None

        ticket.status = status
        ticket.updated_by = updated_by
        ticket.updated_at = datetime.now(timezone.utc)

        # Track resolution timestamp
        if status == "resolved":
            ticket.resolved_at = datetime.now(timezone.utc)
        elif status == "closed":
            ticket.closed_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def assign(
        self, ticket_id: str, user_id: str, updated_by: str
    ) -> Optional[Ticket]:
        """Assign ticket to user."""
        ticket = await self.get_by_id(ticket_id)
        if not ticket:
            return None

        ticket.assigned_to = user_id
        ticket.updated_by = updated_by
        ticket.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

    async def transfer(
        self, ticket_id: str, new_user_id: str, updated_by: str
    ) -> Optional[Ticket]:
        """Transfer ticket to another user."""
        return await self.assign(ticket_id, new_user_id, updated_by)

    async def delete(self, ticket_id: str, deleted_by: str) -> bool:
        """Soft delete ticket."""
        ticket = await self.get_by_id(ticket_id)
        if not ticket:
            return False

        ticket.deleted_at = datetime.now(timezone.utc)
        ticket.deleted_by = deleted_by

        await self.db.commit()
        return True

    async def add_reply(
        self, ticket_id: str, reply_data: TicketReplyCreate, user_id: str
    ) -> Optional[TicketReply]:
        """Add reply to ticket with validation."""
        try:
            ticket = await self.get_by_id(ticket_id)
            if not ticket:
                return None

            # Prevent replies to closed tickets
            if ticket.status == "closed":
                from app.core.exceptions import ForbiddenException
                raise ForbiddenException("Cannot add replies to closed tickets")

            reply = TicketReply(
                id=str(uuid.uuid4()),
                ticket_id=ticket_id,
                user_id=user_id,
                **reply_data.model_dump(),
                created_by=user_id,
            )
            self.db.add(reply)

            # Update first response timestamp if needed
            # First response is when staff responds
            if not ticket.first_response_at and user_id != ticket.customer_id:
                ticket.first_response_at = datetime.now(timezone.utc)

            await self.db.commit()
            await self.db.refresh(reply)
            return reply
        except Exception as e:
            await self.db.rollback()
            raise

    async def get_replies(self, ticket_id: str) -> list[TicketReply]:
        """Get all replies for ticket."""
        query = (
            select(TicketReply)
            .where(
                and_(
                    TicketReply.ticket_id == ticket_id,
                    TicketReply.deleted_at.is_(None),
                )
            )
            .order_by(TicketReply.created_at.asc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def delete_reply(self, reply_id: str, deleted_by: str) -> bool:
        """Soft delete reply."""
        query = select(TicketReply).where(TicketReply.id == reply_id)
        result = await self.db.execute(query)
        reply = result.scalar_one_or_none()

        if not reply:
            return False

        reply.deleted_at = datetime.now(timezone.utc)
        reply.deleted_by = deleted_by

        await self.db.commit()
        return True

    async def increment_view_count(self, ticket_id: str) -> Optional[Ticket]:
        """Increment ticket view count."""
        ticket = await self.get_by_id(ticket_id)
        if not ticket:
            return None

        ticket.view_count += 1
        await self.db.commit()
        await self.db.refresh(ticket)
        return ticket

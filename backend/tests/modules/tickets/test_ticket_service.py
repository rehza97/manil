"""Ticket service tests."""
import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.service import TicketService
from app.modules.tickets.models import Ticket, TicketReply
from app.modules.tickets.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketReplyCreate,
    TicketPriority,
)
from app.core.exceptions import NotFoundException, ForbiddenException


@pytest.mark.asyncio
async def test_create_ticket(db_session: AsyncSession):
    """Test creating a ticket."""
    service = TicketService(db_session)

    ticket_data = TicketCreate(
        title="Cannot login",
        description="I cannot access my account with my credentials",
        priority=TicketPriority.HIGH,
        customer_id=str(uuid.uuid4()),
    )

    ticket = await service.create_ticket(ticket_data, "user_123")

    assert ticket.id is not None
    assert ticket.title == "Cannot login"
    assert ticket.priority == "high"
    assert ticket.status == "open"
    assert ticket.created_by == "user_123"


@pytest.mark.asyncio
async def test_get_ticket(db_session: AsyncSession):
    """Test retrieving a ticket."""
    service = TicketService(db_session)

    # Create ticket first
    ticket_data = TicketCreate(
        title="Test ticket",
        description="Test description",
        customer_id=str(uuid.uuid4()),
    )
    created_ticket = await service.create_ticket(ticket_data, "user_123")

    # Get the ticket
    retrieved_ticket = await service.get_ticket(created_ticket.id)

    assert retrieved_ticket.id == created_ticket.id
    assert retrieved_ticket.title == "Test ticket"


@pytest.mark.asyncio
async def test_get_non_existent_ticket(db_session: AsyncSession):
    """Test retrieving non-existent ticket raises NotFoundException."""
    service = TicketService(db_session)

    with pytest.raises(NotFoundException):
        await service.get_ticket("non_existent_id")


@pytest.mark.asyncio
async def test_list_tickets(db_session: AsyncSession):
    """Test listing tickets."""
    service = TicketService(db_session)
    customer_id = str(uuid.uuid4())

    # Create multiple tickets
    for i in range(3):
        ticket_data = TicketCreate(
            title=f"Ticket {i}",
            description=f"Description {i}",
            customer_id=customer_id,
        )
        await service.create_ticket(ticket_data, "user_123")

    # List tickets
    tickets, total = await service.list_tickets(skip=0, limit=20, customer_id=customer_id)

    assert len(tickets) == 3
    assert total == 3


@pytest.mark.asyncio
async def test_update_ticket(db_session: AsyncSession):
    """Test updating ticket details."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Original title",
        description="Original description",
        customer_id=str(uuid.uuid4()),
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Update ticket
    update_data = TicketUpdate(
        title="Updated title",
        priority=TicketPriority.URGENT,
    )
    updated_ticket = await service.update_ticket(ticket.id, update_data, "user_456")

    assert updated_ticket.title == "Updated title"
    assert updated_ticket.priority == "urgent"
    assert updated_ticket.updated_by == "user_456"


@pytest.mark.asyncio
async def test_change_ticket_status_valid_transition(db_session: AsyncSession):
    """Test valid ticket status transition."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Change status from open to in_progress
    updated_ticket = await service.change_status(ticket.id, "in_progress", "user_456")

    assert updated_ticket.status == "in_progress"


@pytest.mark.asyncio
async def test_change_ticket_status_invalid_transition(db_session: AsyncSession):
    """Test invalid ticket status transition raises ForbiddenException."""
    service = TicketService(db_session)

    # Create ticket in open status
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Try invalid transition: open -> resolved
    with pytest.raises(ForbiddenException):
        await service.change_status(ticket.id, "resolved", "user_456")


@pytest.mark.asyncio
async def test_assign_ticket(db_session: AsyncSession):
    """Test assigning ticket to user."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Assign ticket
    assigned_ticket = await service.assign_ticket(ticket.id, "agent_789", "user_123")

    assert assigned_ticket.assigned_to == "agent_789"


@pytest.mark.asyncio
async def test_transfer_ticket(db_session: AsyncSession):
    """Test transferring ticket to another user."""
    service = TicketService(db_session)

    # Create and assign ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")
    ticket = await service.assign_ticket(ticket.id, "agent_1", "user_123")

    # Transfer ticket
    transferred_ticket = await service.transfer_ticket(
        ticket.id, "agent_2", "user_123"
    )

    assert transferred_ticket.assigned_to == "agent_2"


@pytest.mark.asyncio
async def test_close_ticket(db_session: AsyncSession):
    """Test closing a ticket."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Close ticket (should transition to in_progress first, then resolved)
    ticket = await service.change_status(ticket.id, "in_progress", "user_123")
    closed_ticket = await service.close_ticket(ticket.id, "user_456")

    assert closed_ticket.status == "closed"


@pytest.mark.asyncio
async def test_delete_ticket(db_session: AsyncSession):
    """Test soft deleting a ticket."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Delete ticket
    result = await service.delete_ticket(ticket.id, "user_456")

    assert result is True

    # Should not be able to retrieve deleted ticket
    with pytest.raises(NotFoundException):
        await service.get_ticket(ticket.id)


@pytest.mark.asyncio
async def test_add_reply(db_session: AsyncSession):
    """Test adding reply to ticket."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Add reply
    reply_data = TicketReplyCreate(
        message="This is a test reply", is_internal=False
    )
    reply = await service.add_reply(ticket.id, reply_data, "agent_456")

    assert reply.message == "This is a test reply"
    assert reply.ticket_id == ticket.id
    assert reply.user_id == "agent_456"


@pytest.mark.asyncio
async def test_get_ticket_replies(db_session: AsyncSession):
    """Test retrieving ticket replies."""
    service = TicketService(db_session)

    # Create ticket
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    # Add multiple replies
    for i in range(3):
        reply_data = TicketReplyCreate(message=f"Reply {i}")
        await service.add_reply(ticket.id, reply_data, f"user_{i}")

    # Get replies
    replies = await service.get_ticket_replies(ticket.id)

    assert len(replies) == 3


@pytest.mark.asyncio
async def test_delete_reply(db_session: AsyncSession):
    """Test deleting a reply."""
    service = TicketService(db_session)

    # Create ticket and reply
    ticket_data = TicketCreate(
        title="Test", description="Test", customer_id=str(uuid.uuid4())
    )
    ticket = await service.create_ticket(ticket_data, "user_123")

    reply_data = TicketReplyCreate(message="Test reply")
    reply = await service.add_reply(ticket.id, reply_data, "user_456")

    # Delete reply
    result = await service.delete_reply(reply.id, "user_789")

    assert result is True

"""Ticket router API endpoint tests."""
import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.tickets.schemas import TicketPriority


@pytest.mark.asyncio
async def test_create_ticket_endpoint(async_client: AsyncClient, auth_headers: dict):
    """Test creating ticket via API endpoint."""
    payload = {
        "title": "API Test Ticket",
        "description": "This is a test ticket created via API",
        "priority": "high",
        "customer_id": str(uuid.uuid4()),
    }

    response = await async_client.post(
        "/api/v1/tickets",
        json=payload,
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "API Test Ticket"
    assert data["status"] == "open"


@pytest.mark.asyncio
async def test_list_tickets_endpoint(async_client: AsyncClient, auth_headers: dict):
    """Test listing tickets via API endpoint."""
    response = await async_client.get(
        "/api/v1/tickets",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "pagination" in data


@pytest.mark.asyncio
async def test_get_ticket_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test getting single ticket via API endpoint."""
    response = await async_client.get(
        f"/api/v1/tickets/{created_ticket['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created_ticket["id"]
    assert data["title"] == created_ticket["title"]


@pytest.mark.asyncio
async def test_update_ticket_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test updating ticket via API endpoint."""
    payload = {
        "title": "Updated Title",
        "priority": "urgent",
    }

    response = await async_client.put(
        f"/api/v1/tickets/{created_ticket['id']}",
        json=payload,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["priority"] == "urgent"


@pytest.mark.asyncio
async def test_update_ticket_status_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test updating ticket status via API endpoint."""
    payload = {
        "status": "in_progress",
        "reason": "Started working on this issue",
    }

    response = await async_client.put(
        f"/api/v1/tickets/{created_ticket['id']}/status",
        json=payload,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"


@pytest.mark.asyncio
async def test_assign_ticket_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test assigning ticket via API endpoint."""
    payload = {
        "assigned_to": str(uuid.uuid4()),
    }

    response = await async_client.post(
        f"/api/v1/tickets/{created_ticket['id']}/assign",
        json=payload,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["assigned_to"] is not None


@pytest.mark.asyncio
async def test_close_ticket_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test closing ticket via API endpoint."""
    # First transition to in_progress
    await async_client.put(
        f"/api/v1/tickets/{created_ticket['id']}/status",
        json={"status": "in_progress"},
        headers=auth_headers,
    )

    # Then close
    response = await async_client.post(
        f"/api/v1/tickets/{created_ticket['id']}/close",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "closed"


@pytest.mark.asyncio
async def test_add_reply_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test adding reply to ticket via API endpoint."""
    payload = {
        "message": "This is a reply to the ticket",
        "is_internal": False,
    }

    response = await async_client.post(
        f"/api/v1/tickets/{created_ticket['id']}/replies",
        json=payload,
        headers=auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "This is a reply to the ticket"
    assert data["ticket_id"] == created_ticket["id"]


@pytest.mark.asyncio
async def test_get_ticket_replies_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test getting ticket replies via API endpoint."""
    # Add a reply first
    await async_client.post(
        f"/api/v1/tickets/{created_ticket['id']}/replies",
        json={"message": "Test reply"},
        headers=auth_headers,
    )

    # Get replies
    response = await async_client.get(
        f"/api/v1/tickets/{created_ticket['id']}/replies",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_delete_ticket_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test deleting ticket via API endpoint."""
    response = await async_client.delete(
        f"/api/v1/tickets/{created_ticket['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_unauthorized_ticket_access(async_client: AsyncClient):
    """Test accessing tickets without authentication."""
    response = await async_client.get("/api/v1/tickets")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_transfer_ticket_endpoint(
    async_client: AsyncClient, auth_headers: dict, created_ticket: dict
):
    """Test transferring ticket via API endpoint."""
    new_assignee_id = str(uuid.uuid4())
    payload = {
        "new_assigned_to": new_assignee_id,
        "reason": "Transferring to another agent",
    }

    response = await async_client.post(
        f"/api/v1/tickets/{created_ticket['id']}/transfer",
        json=payload,
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["assigned_to"] == new_assignee_id

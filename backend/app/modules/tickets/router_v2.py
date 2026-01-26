"""Ticket API router - endpoints (FIXED VERSION WITH SECURITY CHECKS)."""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.permissions import Permission
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.tickets.service import TicketService
from app.modules.tickets.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketStatusUpdate,
    TicketAssignment,
    TicketTransfer,
    TicketResponse,
    TicketDetailResponse,
    TicketListResponse,
    TicketReplyCreate,
    TicketReplyResponse,
    PaginationMetadata,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new ticket",
)
async def create_ticket(
    ticket_data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_CREATE)),
) -> TicketResponse:
    """Create a new support ticket with permission validation."""
    # ✅ FIXED: Added permission validation
    if current_user.role == "client":
        # Clients can only create tickets for themselves
        if ticket_data.customer_id != current_user.id:
            raise ForbiddenException(
                "Clients can only create tickets for themselves"
            )
    elif current_user.role == "corporate":
        # TODO: Verify customer belongs to company (when company model ready)
        pass
    # Admins can create for anyone

    service = TicketService(db)
    ticket = await service.create_ticket(ticket_data, current_user.id)
    return TicketResponse.model_validate(ticket)


@router.get(
    "/my-tickets",
    response_model=TicketListResponse,
    summary="List my tickets",
)
async def list_my_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_VIEW)),
) -> TicketListResponse:
    """List current user's tickets (for customers)."""
    if current_user.role != "client":
        raise ForbiddenException("Only customers can use this endpoint")

    service = TicketService(db)
    skip = (page - 1) * page_size
    tickets, total = await service.list_tickets(skip, page_size, current_user.id)

    pagination = PaginationMetadata(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

    return TicketListResponse(
        data=[TicketResponse.model_validate(t) for t in tickets],
        pagination=pagination,
    )


@router.get(
    "",
    response_model=TicketListResponse,
    summary="List tickets",
)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_VIEW)),
) -> TicketListResponse:
    """List all tickets with pagination and filters."""
    service = TicketService(db)

    # ✅ FIXED: Added role-based filtering
    if current_user.role == "client":
        # Clients can only see their own tickets
        customer_id = current_user.id

    skip = (page - 1) * page_size
    filters = {
        "customer_id": customer_id,
        "status": status,
        "priority": priority,
    }

    tickets, total = await service.list_tickets_with_filters(skip, page_size, filters)

    pagination = PaginationMetadata(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

    return TicketListResponse(
        data=[TicketResponse.model_validate(t) for t in tickets],
        pagination=pagination,
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketDetailResponse,
    summary="Get ticket details",
)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_VIEW)),
) -> TicketDetailResponse:
    """Get ticket by ID with all replies."""
    service = TicketService(db)
    ticket = await service.get_ticket(ticket_id)

    # ✅ FIXED: Added ownership check
    if current_user.role == "client" and ticket.customer_id != current_user.id:
        raise ForbiddenException("You can only view your own tickets")
    elif current_user.role == "corporate":
        # TODO: Verify ticket is for customer in their company
        pass

    replies = await service.get_ticket_replies(ticket_id, current_user)

    return TicketDetailResponse(
        **TicketResponse.model_validate(ticket).model_dump(),
        replies=[TicketReplyResponse.model_validate(r) for r in replies],
    )


@router.put(
    "/{ticket_id}",
    response_model=TicketResponse,
    summary="Update ticket",
)
async def update_ticket(
    ticket_id: str,
    ticket_data: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_CREATE)),
) -> TicketResponse:
    """Update ticket details (limited fields)."""
    service = TicketService(db)
    ticket = await service.get_ticket(ticket_id)

    # ✅ FIXED: Added permission checks
    if current_user.role == "client":
        # Clients can only update their own tickets
        if ticket.customer_id != current_user.id:
            raise ForbiddenException("Cannot update other customers' tickets")
        # Clients cannot update closed tickets
        if ticket.status == "closed":
            raise ForbiddenException("Cannot update closed tickets")

    ticket = await service.update_ticket(ticket_id, ticket_data, current_user.id)
    return TicketResponse.model_validate(ticket)


@router.delete(
    "/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete ticket",
)
async def delete_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_DELETE)),
) -> None:
    """Delete (soft delete) ticket."""
    service = TicketService(db)
    await service.delete_ticket(ticket_id, current_user.id)
    return None


@router.put(
    "/{ticket_id}/status",
    response_model=TicketResponse,
    summary="Update ticket status",
)
async def update_ticket_status(
    ticket_id: str,
    status_update: TicketStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_CLOSE)),
) -> TicketResponse:
    """Update ticket status with state validation."""
    service = TicketService(db)
    # ✅ FIXED: Pass reason to service
    ticket = await service.change_status(
        ticket_id, status_update.status, status_update.reason, current_user.id
    )
    return TicketResponse.model_validate(ticket)


@router.post(
    "/{ticket_id}/assign",
    response_model=TicketResponse,
    summary="Assign ticket",
)
async def assign_ticket(
    ticket_id: str,
    assignment: TicketAssignment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_ASSIGN)),
) -> TicketResponse:
    """Assign ticket to user with validation."""
    service = TicketService(db)
    # ✅ FIXED: Validate user exists and is staff
    ticket = await service.assign_ticket(
        ticket_id, assignment.assigned_to, current_user.id
    )
    return TicketResponse.model_validate(ticket)


@router.post(
    "/{ticket_id}/transfer",
    response_model=TicketResponse,
    summary="Transfer ticket",
)
async def transfer_ticket(
    ticket_id: str,
    transfer: TicketTransfer,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_ASSIGN)),
) -> TicketResponse:
    """Transfer ticket to another user."""
    service = TicketService(db)
    ticket = await service.transfer_ticket(
        ticket_id, transfer.new_assigned_to, current_user.id
    )
    return TicketResponse.model_validate(ticket)


@router.post(
    "/{ticket_id}/close",
    response_model=TicketResponse,
    summary="Close ticket",
)
async def close_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_CLOSE)),
) -> TicketResponse:
    """Close ticket."""
    service = TicketService(db)
    ticket = await service.close_ticket(ticket_id, current_user.id)
    return TicketResponse.model_validate(ticket)


@router.post(
    "/{ticket_id}/replies",
    response_model=TicketReplyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add ticket reply",
)
async def add_ticket_reply(
    ticket_id: str,
    reply_data: TicketReplyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_REPLY)),
) -> TicketReplyResponse:
    """Add reply to ticket."""
    service = TicketService(db)
    reply = await service.add_reply(ticket_id, reply_data, current_user.id)
    return TicketReplyResponse.model_validate(reply)


@router.get(
    "/{ticket_id}/replies",
    response_model=list[TicketReplyResponse],
    summary="Get ticket replies",
)
async def get_ticket_replies(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_VIEW)),
) -> list[TicketReplyResponse]:
    """Get all replies for ticket."""
    service = TicketService(db)
    # ✅ FIXED: Pass user for filtering internal notes
    replies = await service.get_ticket_replies(ticket_id, current_user)
    return [TicketReplyResponse.model_validate(r) for r in replies]


@router.delete(
    "/replies/{reply_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete reply",
)
async def delete_ticket_reply(
    reply_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_REPLY)),
) -> None:
    """Delete (soft delete) ticket reply."""
    service = TicketService(db)
    await service.delete_reply(reply_id, current_user.id)
    return None

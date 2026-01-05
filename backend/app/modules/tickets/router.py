"""Ticket API router - endpoints."""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
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
from app.modules.tickets.routes.email_routes import router as email_router
from app.modules.tickets.routes.tag_routes import router as tag_router
from app.modules.tickets.routes.ticket_tag_routes import router as ticket_tag_router
from app.modules.tickets.routes.watcher_routes import router as watcher_router
from app.modules.tickets.routes.sla_routes import router as sla_router

router = APIRouter(prefix="/tickets", tags=["tickets"])

# Include email routes as sub-router
router.include_router(email_router, prefix="/email", tags=["email"])

# Include tag management routes
router.include_router(tag_router, tags=["tags"])

# Include ticket tag assignment routes
router.include_router(ticket_tag_router, tags=["ticket-tags"])

# Include watcher routes
router.include_router(watcher_router, tags=["watchers"])

# Include SLA and metrics routes
router.include_router(sla_router, tags=["sla-metrics"])



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
):
    """Create a new support ticket."""
    from app.modules.customers.repository import CustomerRepository
    from app.modules.customers.schemas import CustomerCreate, CustomerType
    from sqlalchemy import select
    from app.modules.customers.models import Customer
    
    # For client users, automatically find or create customer by email
    customer_id = ticket_data.customer_id
    if current_user.role == "client":
        customer_repo = CustomerRepository(db)
        
        # Try to find customer by email
        result = await db.execute(
            select(Customer).where(
                Customer.email == current_user.email,
                Customer.deleted_at.is_(None)
            )
        )
        customer = result.scalar_one_or_none()
        
        # Auto-create customer if doesn't exist
        if not customer:
            from app.modules.customers.service import CustomerService
            customer_service = CustomerService(db)
            customer_data = CustomerCreate(
                name=current_user.full_name,
                email=current_user.email,
                phone="+0000000000",  # Placeholder - should be updated by user
                customer_type=CustomerType.INDIVIDUAL,
            )
            try:
                customer = await customer_service.create(customer_data, created_by=current_user.id)
                await db.flush()  # Ensure customer ID is available
            except Exception as e:
                logger.error(f"Failed to auto-create customer: {str(e)}")
                # Try to fetch again in case it was created concurrently
                result = await db.execute(
                    select(Customer).where(
                        Customer.email == current_user.email,
                        Customer.deleted_at.is_(None)
                    )
                )
                customer = result.scalar_one_or_none()
        
        if customer:
            # Use the found/created customer ID
            customer_id = customer.id
            # Create new ticket data with the correct customer_id
            ticket_data = TicketCreate(
                **ticket_data.model_dump(exclude={"customer_id"}),
                customer_id=customer_id
            )
    
    service = TicketService(db)
    ticket = await service.create_ticket(ticket_data, current_user.id)
    return ticket


@router.get(
    "",
    response_model=TicketListResponse,
    summary="List tickets",
)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """List all tickets with pagination and filters."""
    service = TicketService(db)

    # Filter by customer if provided
    if customer_id and current_user.role == "client":
        customer_id = current_user.id

    skip = (page - 1) * page_size
    tickets, total = await service.list_tickets(skip, page_size, customer_id)

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
):
    """Get ticket by ID with all replies."""
    service = TicketService(db)
    ticket = await service.get_ticket(ticket_id)
    replies = await service.get_ticket_replies(ticket_id)

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
):
    """Update ticket details (limited fields)."""
    service = TicketService(db)
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
):
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
):
    """Update ticket status with state validation."""
    service = TicketService(db)
    ticket = await service.change_status(ticket_id, status_update.status, current_user.id)
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
):
    """Assign ticket to user."""
    service = TicketService(db)
    ticket = await service.assign_ticket(ticket_id, assignment.assigned_to, current_user.id)
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
):
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
):
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
):
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
):
    """Get all replies for ticket."""
    service = TicketService(db)
    replies = await service.get_ticket_replies(ticket_id)
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
):
    """Delete (soft delete) ticket reply."""
    service = TicketService(db)
    await service.delete_reply(reply_id, current_user.id)
    return None

"""
Quote API routes.

Endpoints for quote management, approval workflow, and versioning.
"""
from typing import Optional
from math import ceil

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission, require_any_permission
from app.core.permissions import Permission
from app.core.exceptions import ForbiddenException
from app.modules.auth.models import User
from app.modules.quotes.models import QuoteStatus
from app.modules.quotes.service import QuoteService
from app.modules.quotes.service_workflow import QuoteWorkflowService
from app.modules.quotes.pdf_service import QuotePDFService
from app.modules.quotes.schemas import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteListResponse,
    QuoteApprovalRequest,
    QuoteVersionRequest,
    QuoteSendRequest,
    QuoteAcceptRequest,
    QuoteTimelineResponse
)

router = APIRouter(prefix="/api/v1/quotes", tags=["quotes"])


# ============================================================================
# Quote CRUD Endpoints
# ============================================================================

@router.get("", response_model=QuoteListResponse)
async def get_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    customer_id: Optional[str] = None,
    status: Optional[QuoteStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Get all quotes with pagination and filters.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only view their own quotes
    - Admin/corporate can view all quotes
    """
    service = QuoteService(db)

    # SECURITY: Role-based filtering
    if current_user.role.value == "client":
        # Clients can only see their own quotes
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        customer_id = str(current_user.customer_id)
    # Admin and corporate can see all quotes (no filtering override)

    quotes, total = await service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        status=status
    )

    page = (skip // limit) + 1
    total_pages = ceil(total / limit) if total > 0 else 0

    return QuoteListResponse(
        quotes=quotes,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Get quote by ID.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only view their own quotes
    - Admin/corporate can view all quotes
    """
    service = QuoteService(db)
    quote = await service.get_by_id(quote_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(quote.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own quotes")

    return quote


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote_data: QuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT]))
):
    """Create a new quote.

    Security:
    - Requires admin or corporate role (sales staff only)
    - Prices will be validated against product catalog
    """
    service = QuoteService(db)
    return await service.create(quote_data, created_by_id=current_user.id)


@router.put("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: str,
    quote_data: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT]))
):
    """Update a quote.

    Security:
    - Requires admin or corporate role (sales staff only)
    - Cannot update accepted quotes
    """
    service = QuoteService(db)
    quote = await service.get_by_id(quote_id)

    # SECURITY: Cannot update accepted quotes
    if quote.status == QuoteStatus.ACCEPTED:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot update accepted quotes")

    return await service.update(quote_id, quote_data, updated_by_id=current_user.id)


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_DELETE))
):
    """Delete a quote (soft delete).

    Security:
    - Requires admin role only
    - Cannot delete accepted quotes
    """
    service = QuoteService(db)
    quote = await service.get_by_id(quote_id)

    # SECURITY: Cannot delete accepted quotes
    if quote.status == QuoteStatus.ACCEPTED:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot delete accepted quotes")

    await service.delete(quote_id)


# ============================================================================
# Quote Workflow Endpoints
# ============================================================================

@router.post("/{quote_id}/submit-for-approval", response_model=QuoteResponse)
async def submit_for_approval(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT]))
):
    """Submit quote for approval.

    Security:
    - Requires admin or corporate role
    """
    service = QuoteWorkflowService(db)
    return await service.submit_for_approval(quote_id, submitted_by_id=current_user.id)


@router.post("/{quote_id}/approve", response_model=QuoteResponse)
async def approve_quote(
    quote_id: str,
    approval_data: QuoteApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT]))
):
    """Approve or reject a quote.

    Security:
    - Requires admin or corporate role (manager level)
    """
    service = QuoteWorkflowService(db)
    return await service.approve_quote(quote_id, approval_data, approved_by_id=current_user.id)


@router.post("/{quote_id}/send", response_model=QuoteResponse)
async def send_quote(
    quote_id: str,
    send_data: QuoteSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT]))
):
    """Send quote to customer.

    Security:
    - Requires admin or corporate role
    """
    service = QuoteWorkflowService(db)
    return await service.send_quote(quote_id, send_data, sent_by_id=current_user.id)


@router.post("/{quote_id}/accept", response_model=QuoteResponse)
async def accept_quote(
    quote_id: str,
    accept_data: QuoteAcceptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Customer accepts a quote.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only accept their own quotes
    - Admin/corporate can accept on behalf of customer
    """
    service = QuoteWorkflowService(db)
    quote = await QuoteService(db).get_by_id(quote_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(quote.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only accept your own quotes")

    return await service.accept_quote(quote_id, accepted_by_id=current_user.id)


@router.post("/{quote_id}/decline", response_model=QuoteResponse)
async def decline_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Customer declines a quote.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only decline their own quotes
    - Admin/corporate can decline on behalf of customer
    """
    service = QuoteWorkflowService(db)
    quote = await QuoteService(db).get_by_id(quote_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(quote.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only decline your own quotes")

    return await service.decline_quote(quote_id, declined_by_id=current_user.id)


# ============================================================================
# Quote Versioning Endpoints
# ============================================================================

@router.post("/{quote_id}/create-version", response_model=QuoteResponse)
async def create_new_version(
    quote_id: str,
    version_data: QuoteVersionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT]))
):
    """Create a new version of a quote.

    Security:
    - Requires admin or corporate role
    """
    service = QuoteWorkflowService(db)
    return await service.create_new_version(quote_id, version_data, created_by_id=current_user.id)


@router.get("/{quote_id}/versions", response_model=list[QuoteResponse])
async def get_quote_versions(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Get all versions of a quote.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only view versions of their own quotes
    """
    service = QuoteWorkflowService(db)

    # Get the main quote to check ownership
    quote = await QuoteService(db).get_by_id(quote_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(quote.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own quote versions")

    return await service.get_quote_versions(quote_id)


# ============================================================================
# Quote Timeline Endpoints
# ============================================================================

@router.get("/{quote_id}/timeline", response_model=list[QuoteTimelineResponse])
async def get_quote_timeline(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Get quote timeline/history.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only view their own quote timeline
    """
    service = QuoteService(db)
    quote = await service.get_by_id(quote_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(quote.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own quote timeline")

    return quote.timeline_events


# ============================================================================
# PDF Generation Endpoints
# ============================================================================

@router.get("/{quote_id}/pdf", response_class=FileResponse)
async def generate_quote_pdf(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_VIEW))
):
    """Generate and download quote PDF.

    Security:
    - Requires QUOTES_VIEW permission
    - Clients can only download their own quotes
    - Filename is sanitized to prevent path traversal
    """
    import re
    # Get quote with items and customer
    service = QuoteService(db)
    quote = await service.get_by_id(quote_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(quote.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only download your own quotes")

    # Get customer data
    customer_data = {
        'name': quote.customer.name if quote.customer else 'N/A',
        'email': quote.customer.email if quote.customer else 'N/A',
        'phone': quote.customer.phone if quote.customer else 'N/A',
        'address': quote.customer.address if quote.customer else 'N/A',
        'city': quote.customer.city if quote.customer else 'N/A',
    }

    # Generate PDF
    pdf_service = QuotePDFService()
    pdf_path = pdf_service.generate_quote_pdf(quote, customer_data)

    # SECURITY: Sanitize filename to prevent path traversal
    safe_quote_number = re.sub(r'[^a-zA-Z0-9_-]', '', quote.quote_number)

    # Return as file download
    return FileResponse(
        path=pdf_path,
        filename=f"quote_{safe_quote_number}_v{quote.version}.pdf",
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=quote_{safe_quote_number}_v{quote.version}.pdf",
            "X-Content-Type-Options": "nosniff"
        }
    )


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.post("/expire-old-quotes")
async def expire_old_quotes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.QUOTES_DELETE))
):
    """Expire old quotes.

    Security:
    - Requires admin role only
    - Should ideally be a scheduled background job
    """
    service = QuoteWorkflowService(db)
    count = await service.expire_old_quotes()
    return {"message": f"Expired {count} quotes"}

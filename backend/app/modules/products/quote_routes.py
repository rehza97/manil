"""Quote request and service request API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_sync_db
from app.core.dependencies import require_any_permission
from app.core.permissions import Permission
from app.core.exceptions import NotFoundException
from app.modules.auth.models import User
from app.modules.products.quote_service import QuoteRequestService, ServiceRequestService
from app.modules.products.quote_schemas import (
    QuoteRequestCreate,
    QuoteRequestUpdate,
    QuoteRequestResponse,
    QuoteRequestListResponse,
    QuoteStatus,
    QuotePriority,
    ServiceRequestCreate,
    ServiceRequestUpdate,
    ServiceRequestResponse,
    ServiceRequestListResponse,
)
from app.modules.products.quote_notifications import QuoteNotificationService
from app.core.logging import logger

router = APIRouter(prefix="/quote-requests", tags=["quote-requests"])


# ============================================================================
# QUOTE REQUEST ENDPOINTS
# ============================================================================


@router.post("", response_model=QuoteRequestResponse, status_code=status.HTTP_201_CREATED)
def create_quote_request(
    quote_data: QuoteRequestCreate,
    db: Session = Depends(get_sync_db),
):
    """Create a new quote request."""
    try:
        quote = QuoteRequestService.create_quote_request(db, quote_data)

        # Send confirmation notification (email + SMS) to customer
        if quote.customer_email:
            # Use async notification with preference checks
            import asyncio
            from app.config.database import AsyncSessionLocal
            async def send_notification():
                async with AsyncSessionLocal() as async_db:
                    await QuoteNotificationService.send_quote_creation_notification(async_db, quote)
            try:
                asyncio.run(send_notification())
            except Exception as e:
                logger.warning(f"Failed to send quote creation notification: {e}")
                # Fallback to email only
                QuoteNotificationService.send_quote_creation_email(quote)

        return QuoteRequestResponse.model_validate(quote)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=QuoteRequestListResponse)
def list_quote_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str = Query(None),
    status: QuoteStatus = Query(None),
    priority: QuotePriority = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """List quote requests with filtering."""
    skip = (page - 1) * page_size

    quotes, total = QuoteRequestService.list_quote_requests(
        db,
        skip=skip,
        limit=page_size,
        customer_id=customer_id,
        status=status,
        priority=priority,
        search=search,
    )

    return QuoteRequestListResponse(
        data=[QuoteRequestResponse.model_validate(q) for q in quotes],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{quote_id}", response_model=QuoteRequestResponse)
def get_quote_request(
    quote_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Get a quote request by ID."""
    try:
        quote = QuoteRequestService.get_quote_request(db, quote_id)
        return QuoteRequestResponse.model_validate(quote)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{quote_id}", response_model=QuoteRequestResponse)
def update_quote_request(
    quote_id: str,
    quote_data: QuoteRequestUpdate,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Update a quote request."""
    try:
        quote = QuoteRequestService.update_quote_request(db, quote_id, quote_data)
        return QuoteRequestResponse.model_validate(quote)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote_request(
    quote_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Delete a quote request."""
    try:
        QuoteRequestService.delete_quote_request(db, quote_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{quote_id}/approve", response_model=QuoteRequestResponse)
def approve_quote_request(
    quote_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Approve a quote request and set status to QUOTED."""
    try:
        quote_data = QuoteRequestUpdate(status=QuoteStatus.QUOTED)
        quote = QuoteRequestService.update_quote_request(db, quote_id, quote_data)

        # Send approved notification (email + SMS) to customer
        if quote.customer_email:
            import asyncio
            from app.config.database import AsyncSessionLocal
            async def send_notification():
                async with AsyncSessionLocal() as async_db:
                    await QuoteNotificationService.send_quote_approved_notification(async_db, quote)
            try:
                asyncio.run(send_notification())
            except Exception as e:
                logger.warning(f"Failed to send quote approved notification: {e}")
                QuoteNotificationService.send_quote_approved_email(quote)

        return QuoteRequestResponse.model_validate(quote)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{quote_id}/accept", response_model=QuoteRequestResponse)
def accept_quote_request(
    quote_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Accept a quote request and set status to ACCEPTED."""
    try:
        quote_data = QuoteRequestUpdate(status=QuoteStatus.ACCEPTED)
        quote = QuoteRequestService.update_quote_request(db, quote_id, quote_data)

        # Send acceptance notification to customer and corporate
        if quote.customer_email:
            QuoteNotificationService.send_quote_accepted_email(quote)

        return QuoteRequestResponse.model_validate(quote)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{quote_id}/reject", response_model=QuoteRequestResponse)
def reject_quote_request(
    quote_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Reject a quote request and set status to REJECTED."""
    try:
        quote_data = QuoteRequestUpdate(status=QuoteStatus.REJECTED)
        quote = QuoteRequestService.update_quote_request(db, quote_id, quote_data)

        # Send rejection notification (email + SMS) to customer and corporate
        if quote.customer_email:
            import asyncio
            from app.config.database import AsyncSessionLocal
            async def send_notification():
                async with AsyncSessionLocal() as async_db:
                    await QuoteNotificationService.send_quote_rejected_notification(async_db, quote)
            try:
                asyncio.run(send_notification())
            except Exception as e:
                logger.warning(f"Failed to send quote rejected notification: {e}")
                QuoteNotificationService.send_quote_rejected_email(quote)

        return QuoteRequestResponse.model_validate(quote)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# SERVICE REQUEST ENDPOINTS
# ============================================================================


@router.post("/services", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_service_request(
    service_data: ServiceRequestCreate,
    db: Session = Depends(get_sync_db),
):
    """Create a new service request."""
    try:
        service = ServiceRequestService.create_service_request(db, service_data)

        # Send confirmation email to customer
        if service.customer_email:
            QuoteNotificationService.send_service_request_email(service)

        return ServiceRequestResponse.model_validate(service)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/services", response_model=ServiceRequestListResponse)
def list_service_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str = Query(None),
    status: QuoteStatus = Query(None),
    service_type: str = Query(None),
    db: Session = Depends(get_sync_db),
):
    """List service requests with filtering."""
    skip = (page - 1) * page_size

    services, total = ServiceRequestService.list_service_requests(
        db,
        skip=skip,
        limit=page_size,
        customer_id=customer_id,
        status=status,
        service_type=service_type,
    )

    return ServiceRequestListResponse(
        data=[ServiceRequestResponse.model_validate(s) for s in services],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/services/{service_id}", response_model=ServiceRequestResponse)
def get_service_request(
    service_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Get a service request by ID."""
    try:
        service = ServiceRequestService.get_service_request(db, service_id)
        return ServiceRequestResponse.model_validate(service)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/services/{service_id}", response_model=ServiceRequestResponse)
def update_service_request(
    service_id: str,
    service_data: ServiceRequestUpdate,
    db: Session = Depends(get_sync_db),
):
    """Update a service request."""
    try:
        service = ServiceRequestService.update_service_request(db, service_id, service_data)
        return ServiceRequestResponse.model_validate(service)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_request(
    service_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.QUOTES_CREATE, Permission.QUOTES_EDIT])),
):
    """Delete a service request."""
    try:
        ServiceRequestService.delete_service_request(db, service_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))

"""
Invoice API routes.

Endpoints for invoice management, quote conversion, and payment tracking.
"""
from typing import Optional
from math import ceil

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission, require_role
from app.core.permissions import Permission
from app.core.exceptions import ForbiddenException
from app.modules.auth.models import User
from app.modules.invoices.models import InvoiceStatus
from app.modules.invoices.service import InvoiceService
from app.modules.invoices.service_workflow import InvoiceWorkflowService
from app.modules.invoices.pdf_service import InvoicePDFService
from app.modules.invoices.schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    InvoicePaymentRequest,
    InvoiceConvertFromQuoteRequest,
    InvoiceTimelineResponse,
    InvoiceStatistics,
)

router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])


# ============================================================================
# Invoice CRUD Endpoints
# ============================================================================

@router.get("", response_model=InvoiceListResponse)
async def get_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    customer_id: Optional[str] = None,
    status: Optional[InvoiceStatus] = None,
    quote_id: Optional[str] = None,
    overdue_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.INVOICES_VIEW))
):
    """Get all invoices with pagination and filters.

    Security:
    - Requires INVOICES_VIEW permission
    - Clients can only view their own invoices
    - Admin/corporate can view all invoices
    """
    service = InvoiceService(db)

    # SECURITY: Role-based filtering
    if current_user.role.value == "client":
        # Clients can only see their own invoices
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        customer_id = str(current_user.customer_id)
    # Admin and corporate can see all invoices (no filtering override)

    invoices, total = await service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        status=status,
        quote_id=quote_id,
        overdue_only=overdue_only,
    )

    return InvoiceListResponse(
        invoices=invoices,
        total=total,
        page=skip // limit + 1,
        page_size=limit,
        total_pages=ceil(total / limit) if total > 0 else 0
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.INVOICES_VIEW))
):
    """Get invoice by ID.

    Security:
    - Requires INVOICES_VIEW permission
    - Clients can only view their own invoices
    - Admin/corporate can view all invoices
    """
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(invoice.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own invoices")

    return invoice


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))
):
    """Create a new invoice.

    Security:
    - Requires admin or corporate role (billing staff only)
    - Prices will be validated against product catalog
    """
    service = InvoiceService(db)
    return await service.create(invoice_data, created_by_id=current_user.id)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))
):
    """Update an existing invoice.

    Security:
    - Requires admin or corporate role (billing staff only)
    - Cannot update paid invoices
    """
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

    # SECURITY: Cannot update paid invoices
    if invoice.status == InvoiceStatus.PAID:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot update paid invoices")

    return await service.update(invoice_id, invoice_data)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete an invoice (soft delete).

    Security:
    - Requires admin role only
    - Cannot delete paid invoices
    """
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

    # SECURITY: Cannot delete paid invoices
    if invoice.status == InvoiceStatus.PAID:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot delete paid invoices")

    await service.delete(invoice_id)


# ============================================================================
# Invoice Workflow Endpoints
# ============================================================================

@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
async def issue_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))
):
    """Issue a draft invoice.

    Security:
    - Requires admin or corporate role (billing staff only)
    """
    service = InvoiceWorkflowService(db)
    return await service.issue_invoice(invoice_id, issued_by_id=current_user.id)


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))
):
    """Send invoice to customer.

    Security:
    - Requires admin or corporate role (billing staff only)
    """
    service = InvoiceWorkflowService(db)
    return await service.send_invoice(invoice_id, sent_by_id=current_user.id)


@router.post("/{invoice_id}/payment", response_model=InvoiceResponse)
async def record_payment(
    invoice_id: str,
    payment_data: InvoicePaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Record a payment for an invoice.

    Security:
    - Requires admin role ONLY (most sensitive financial operation)
    - Payment verification will be performed
    - Payment is recorded with idempotency to prevent duplicates
    """
    service = InvoiceWorkflowService(db)
    return await service.record_payment(invoice_id, payment_data, recorded_by_id=current_user.id)


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))
):
    """Cancel an invoice.

    Security:
    - Requires admin or corporate role
    """
    service = InvoiceWorkflowService(db)
    return await service.cancel_invoice(invoice_id, cancelled_by_id=current_user.id)


# ============================================================================
# Quote Conversion Endpoint
# ============================================================================

@router.post("/convert-from-quote", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def convert_quote_to_invoice(
    conversion_data: InvoiceConvertFromQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "corporate"]))
):
    """Convert an accepted quote to an invoice.

    Security:
    - Requires admin or corporate role (billing staff only)
    """
    service = InvoiceWorkflowService(db)
    return await service.convert_quote_to_invoice(conversion_data, created_by_id=current_user.id)


# ============================================================================
# Invoice Timeline Endpoint
# ============================================================================

@router.get("/{invoice_id}/timeline", response_model=list[InvoiceTimelineResponse])
async def get_invoice_timeline(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.INVOICES_VIEW))
):
    """Get invoice timeline/history.

    Security:
    - Requires INVOICES_VIEW permission
    - Clients can only view their own invoice timeline
    """
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(invoice.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own invoice timeline")

    return invoice.timeline_events


# ============================================================================
# PDF Generation Endpoint
# ============================================================================

@router.get("/{invoice_id}/pdf", response_class=FileResponse)
async def generate_invoice_pdf(
    invoice_id: str,
    include_qr: bool = Query(True, description="Include QR code for payment"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.INVOICES_VIEW))
):
    """Generate and download invoice PDF with payment details.

    Security:
    - Requires INVOICES_VIEW permission
    - Clients can only download their own invoices
    - Filename is sanitized to prevent path traversal
    """
    import re
    # Get invoice with items and customer
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

    # SECURITY: Check ownership for client role
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        if str(invoice.customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only download your own invoices")

    # Get customer data
    customer_data = {
        'name': invoice.customer.name if invoice.customer else 'N/A',
        'email': invoice.customer.email if invoice.customer else 'N/A',
        'phone': invoice.customer.phone if invoice.customer else 'N/A',
        'address': invoice.customer.address if invoice.customer else 'N/A',
        'city': invoice.customer.city if invoice.customer else 'N/A',
    }

    # Generate PDF
    pdf_service = InvoicePDFService()
    pdf_path = pdf_service.generate_invoice_pdf(invoice, customer_data, include_qr=include_qr)

    # SECURITY: Sanitize filename to prevent path traversal
    safe_invoice_number = re.sub(r'[^a-zA-Z0-9_-]', '', invoice.invoice_number)

    # Return as file download
    return FileResponse(
        path=pdf_path,
        filename=f"invoice_{safe_invoice_number}.pdf",
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=invoice_{safe_invoice_number}.pdf",
            "X-Content-Type-Options": "nosniff"
        }
    )


# ============================================================================
# Statistics Endpoint
# ============================================================================

@router.get("/statistics/overview", response_model=InvoiceStatistics)
async def get_invoice_statistics(
    customer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.INVOICES_VIEW))
):
    """Get invoice statistics.

    Security:
    - Requires INVOICES_VIEW permission
    - Clients can only see their own statistics
    - Admin/corporate can see all or filter by customer_id
    """
    from app.modules.invoices.repository import InvoiceRepository
    from decimal import Decimal

    # SECURITY: Role-based filtering
    if current_user.role.value == "client":
        # Clients can only see their own statistics
        if not hasattr(current_user, 'customer_id'):
            raise ForbiddenException("Client account not properly configured")
        customer_id = str(current_user.customer_id)
    # Admin and corporate can see all statistics or filter by customer_id

    repository = InvoiceRepository(db)
    stats = await repository.get_statistics(customer_id)

    return InvoiceStatistics(
        total_invoices=stats['total_invoices'],
        draft_count=stats['draft_count'],
        issued_count=stats['issued_count'],
        sent_count=stats['sent_count'],
        paid_count=stats['paid_count'],
        overdue_count=stats['overdue_count'],
        total_revenue=Decimal(str(stats['total_revenue'])),
        total_outstanding=Decimal(str(stats['total_outstanding'])),
        total_overdue=Decimal("0.00"),  # Calculated separately if needed
    )


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.post("/update-overdue")
async def update_overdue_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Update status of overdue invoices.

    Security:
    - Requires admin role only
    - Should ideally be a scheduled background job
    """
    service = InvoiceWorkflowService(db)
    count = await service.update_overdue_invoices()
    return {"message": f"Updated {count} overdue invoices"}

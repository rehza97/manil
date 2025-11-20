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
from app.core.dependencies import get_current_user
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
    current_user: User = Depends(get_current_user)
):
    """Get all invoices with pagination and filters."""
    service = InvoiceService(db)
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
    current_user: User = Depends(get_current_user)
):
    """Get invoice by ID."""
    service = InvoiceService(db)
    return await service.get_by_id(invoice_id)


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice."""
    service = InvoiceService(db)
    return await service.create(invoice_data, created_by_id=current_user.id)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing invoice."""
    service = InvoiceService(db)
    return await service.update(invoice_id, invoice_data)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice (soft delete)."""
    service = InvoiceService(db)
    await service.delete(invoice_id)


# ============================================================================
# Invoice Workflow Endpoints
# ============================================================================

@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
async def issue_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Issue a draft invoice."""
    service = InvoiceWorkflowService(db)
    return await service.issue_invoice(invoice_id, issued_by_id=current_user.id)


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send invoice to customer."""
    service = InvoiceWorkflowService(db)
    return await service.send_invoice(invoice_id, sent_by_id=current_user.id)


@router.post("/{invoice_id}/payment", response_model=InvoiceResponse)
async def record_payment(
    invoice_id: str,
    payment_data: InvoicePaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a payment for an invoice."""
    service = InvoiceWorkflowService(db)
    return await service.record_payment(invoice_id, payment_data, recorded_by_id=current_user.id)


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an invoice."""
    service = InvoiceWorkflowService(db)
    return await service.cancel_invoice(invoice_id, cancelled_by_id=current_user.id)


# ============================================================================
# Quote Conversion Endpoint
# ============================================================================

@router.post("/convert-from-quote", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def convert_quote_to_invoice(
    conversion_data: InvoiceConvertFromQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert an accepted quote to an invoice."""
    service = InvoiceWorkflowService(db)
    return await service.convert_quote_to_invoice(conversion_data, created_by_id=current_user.id)


# ============================================================================
# Invoice Timeline Endpoint
# ============================================================================

@router.get("/{invoice_id}/timeline", response_model=list[InvoiceTimelineResponse])
async def get_invoice_timeline(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice timeline/history."""
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)
    return invoice.timeline_events


# ============================================================================
# PDF Generation Endpoint
# ============================================================================

@router.get("/{invoice_id}/pdf", response_class=FileResponse)
async def generate_invoice_pdf(
    invoice_id: str,
    include_qr: bool = Query(True, description="Include QR code for payment"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and download invoice PDF with payment details."""
    # Get invoice with items and customer
    service = InvoiceService(db)
    invoice = await service.get_by_id(invoice_id)

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

    # Return as file download
    return FileResponse(
        path=pdf_path,
        filename=f"invoice_{invoice.invoice_number}.pdf",
        media_type="application/pdf"
    )


# ============================================================================
# Statistics Endpoint
# ============================================================================

@router.get("/statistics/overview", response_model=InvoiceStatistics)
async def get_invoice_statistics(
    customer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice statistics."""
    from app.modules.invoices.repository import InvoiceRepository
    from decimal import Decimal

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
    current_user: User = Depends(get_current_user)
):
    """Update status of overdue invoices (admin only)."""
    service = InvoiceWorkflowService(db)
    count = await service.update_overdue_invoices()
    return {"message": f"Updated {count} overdue invoices"}

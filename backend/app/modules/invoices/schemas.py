"""
Invoice Pydantic schemas.

Request/response schemas for invoice management operations.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.modules.invoices.models import InvoiceStatus, PaymentMethod


# ============================================================================
# Base Schemas
# ============================================================================

class InvoiceItemBase(BaseModel):
    """Base schema for invoice items."""
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    product_id: Optional[str] = None


class InvoiceItemCreate(InvoiceItemBase):
    """Schema for creating invoice items."""
    pass


class InvoiceItemResponse(InvoiceItemBase):
    """Schema for invoice item responses."""
    id: str
    invoice_id: str
    line_total: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    """Base schema for invoices."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tax_rate: Decimal = Field(default=Decimal("19.00"), ge=0, le=100)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None


# ============================================================================
# Create/Update Schemas
# ============================================================================

class InvoiceCreate(InvoiceBase):
    """Schema for creating invoices."""
    customer_id: str
    quote_id: Optional[str] = None
    vps_subscription_id: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(..., min_length=1)
    issue_date: datetime
    due_date: datetime


class InvoiceUpdate(BaseModel):
    """Schema for updating invoices."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None
    due_date: Optional[datetime] = None


# ============================================================================
# Action Schemas
# ============================================================================

class InvoiceIssueRequest(BaseModel):
    """Schema for issuing an invoice."""
    send_email: bool = Field(default=True)
    email_message: Optional[str] = None


class InvoicePaymentRequest(BaseModel):
    """Schema for recording a payment."""
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    payment_date: datetime
    payment_notes: Optional[str] = None


class InvoiceConvertFromQuoteRequest(BaseModel):
    """Schema for converting quote to invoice."""
    quote_id: str
    issue_date: datetime
    due_date: datetime
    notes: Optional[str] = None


# ============================================================================
# Response Schemas
# ============================================================================

class InvoiceResponse(InvoiceBase):
    """Schema for invoice responses."""
    id: str
    invoice_number: str
    quote_id: Optional[str]
    customer_id: str
    status: InvoiceStatus

    # Financial fields
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    payment_method: Optional[PaymentMethod]

    # Dates
    issue_date: datetime
    due_date: datetime
    sent_at: Optional[datetime]
    paid_at: Optional[datetime]

    # Items
    items: List[InvoiceItemResponse]

    # Audit fields
    created_by_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list responses."""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InvoiceTimelineResponse(BaseModel):
    """Schema for invoice timeline events."""
    id: str
    invoice_id: str
    event_type: str
    description: str
    user_id: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceStatistics(BaseModel):
    """Schema for invoice statistics."""
    total_invoices: int
    draft_count: int
    issued_count: int
    sent_count: int
    paid_count: int
    overdue_count: int
    total_revenue: Decimal
    total_outstanding: Decimal
    total_overdue: Decimal


# ============================================================================
# Filter Schemas
# ============================================================================

class InvoiceFilters(BaseModel):
    """Schema for invoice filtering."""
    customer_id: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    quote_id: Optional[str] = None
    overdue_only: Optional[bool] = False
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=100)

"""
Quote Pydantic schemas.

Request and response schemas for quote management.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.modules.quotes.models import QuoteStatus


# ============================================================================
# Quote Item Schemas
# ============================================================================

class QuoteItemBase(BaseModel):
    """Base quote item schema."""
    product_id: Optional[str] = None
    item_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    discount_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    sort_order: int = Field(default=0, ge=0)


class QuoteItemCreate(QuoteItemBase):
    """Schema for creating a quote item."""
    pass


class QuoteItemUpdate(BaseModel):
    """Schema for updating a quote item."""
    product_id: Optional[str] = None
    item_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: Optional[int] = Field(None, gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    sort_order: Optional[int] = Field(None, ge=0)


class QuoteItemResponse(QuoteItemBase):
    """Schema for quote item response."""
    id: str
    quote_id: str
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Quote Schemas
# ============================================================================

class QuoteBase(BaseModel):
    """Base quote schema."""
    customer_id: str
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tax_rate: Decimal = Field(default=Decimal("19.00"), ge=0, le=100)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    valid_from: datetime
    valid_until: datetime
    approval_required: bool = Field(default=False)
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None

    @field_validator('valid_until')
    @classmethod
    def validate_valid_until(cls, v: datetime, info) -> datetime:
        """Ensure valid_until is after valid_from."""
        if 'valid_from' in info.data and v <= info.data['valid_from']:
            raise ValueError('valid_until must be after valid_from')
        return v


class QuoteCreate(QuoteBase):
    """Schema for creating a quote."""
    items: List[QuoteItemCreate] = Field(..., min_length=1)


class QuoteUpdate(BaseModel):
    """Schema for updating a quote."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    items: Optional[List[QuoteItemCreate]] = None


class QuoteResponse(QuoteBase):
    """Schema for quote response."""
    id: str
    quote_number: str
    version: int
    parent_quote_id: Optional[str]
    is_latest_version: bool
    status: QuoteStatus
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    sent_at: Optional[datetime]
    accepted_at: Optional[datetime]
    declined_at: Optional[datetime]
    approved_by_id: Optional[str]
    approved_at: Optional[datetime]
    approval_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by_id: str
    updated_by_id: Optional[str]
    deleted_at: Optional[datetime]
    items: List[QuoteItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class QuoteListResponse(BaseModel):
    """Schema for paginated quote list response."""
    quotes: List[QuoteResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Quote Action Schemas
# ============================================================================

class QuoteStatusUpdate(BaseModel):
    """Schema for updating quote status."""
    status: QuoteStatus
    notes: Optional[str] = None


class QuoteApprovalRequest(BaseModel):
    """Schema for approving/rejecting a quote."""
    approved: bool
    notes: Optional[str] = None


class QuoteSendRequest(BaseModel):
    """Schema for sending a quote to customer."""
    send_email: bool = Field(default=True)
    email_subject: Optional[str] = None
    email_message: Optional[str] = None


class QuoteAcceptRequest(BaseModel):
    """Schema for customer accepting a quote."""
    notes: Optional[str] = None


class QuoteVersionRequest(BaseModel):
    """Schema for creating a new quote version."""
    changes_description: str = Field(..., min_length=1)


# ============================================================================
# Quote Timeline Schemas
# ============================================================================

class QuoteTimelineResponse(BaseModel):
    """Schema for quote timeline event response."""
    id: str
    quote_id: str
    event_type: str
    event_description: str
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: datetime
    created_by_id: str

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Quote Statistics Schemas
# ============================================================================

class QuoteStatistics(BaseModel):
    """Schema for quote statistics."""
    total_quotes: int
    draft_quotes: int
    pending_approval_quotes: int
    approved_quotes: int
    sent_quotes: int
    accepted_quotes: int
    declined_quotes: int
    expired_quotes: int
    total_value: Decimal
    average_value: Decimal
    conversion_rate: float  # Percentage of quotes converted to orders

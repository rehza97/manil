"""Pydantic schemas for quote requests and service requests."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from enum import Enum


class QuoteStatus(str, Enum):
    """Quote status enum."""
    PENDING = "pending"
    REVIEWED = "reviewed"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class QuotePriority(str, Enum):
    """Quote priority enum."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# ============================================================================
# QUOTE LINE ITEMS
# ============================================================================

class QuoteLineItemBase(BaseModel):
    """Base quote line item schema."""
    product_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(..., gt=0)
    discount_percentage: float = Field(0, ge=0, le=100)


class QuoteLineItemCreate(QuoteLineItemBase):
    """Schema for creating a quote line item."""
    product_id: Optional[str] = None


class QuoteLineItemResponse(QuoteLineItemBase):
    """Schema for quote line item response."""
    id: str
    quote_id: str
    product_id: Optional[str]
    total_price: float
    discount_amount: float
    final_price: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# QUOTE REQUESTS
# ============================================================================

class QuoteRequestBase(BaseModel):
    """Base quote request schema."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    quantity: int = Field(1, ge=1)
    priority: QuotePriority = Field(QuotePriority.MEDIUM)


class QuoteRequestCreate(QuoteRequestBase):
    """Schema for creating a quote request."""
    product_id: Optional[str] = None
    customer_name: Optional[str] = Field(None, max_length=255)
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = Field(None, max_length=20)
    company_name: Optional[str] = Field(None, max_length=255)
    customer_notes: Optional[str] = Field(None, max_length=5000)
    line_items: Optional[List[QuoteLineItemCreate]] = None


class QuoteRequestUpdate(BaseModel):
    """Schema for updating a quote request."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    status: Optional[QuoteStatus] = None
    priority: Optional[QuotePriority] = None
    estimated_price: Optional[float] = Field(None, gt=0)
    final_price: Optional[float] = Field(None, gt=0)
    internal_notes: Optional[str] = Field(None, max_length=5000)
    customer_notes: Optional[str] = Field(None, max_length=5000)
    expires_at: Optional[datetime] = None


class QuoteRequestResponse(QuoteRequestBase):
    """Schema for quote request response."""
    id: str
    customer_id: Optional[str]
    product_id: Optional[str]
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    company_name: Optional[str]
    status: QuoteStatus
    estimated_price: Optional[float]
    final_price: Optional[float]
    internal_notes: Optional[str]
    customer_notes: Optional[str]
    requested_at: datetime
    reviewed_at: Optional[datetime]
    quoted_at: Optional[datetime]
    expires_at: Optional[datetime]
    accepted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    line_items: List[QuoteLineItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class QuoteRequestListResponse(BaseModel):
    """Schema for quote request list response."""
    data: List[QuoteRequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# SERVICE REQUESTS
# ============================================================================

class ServiceRequestBase(BaseModel):
    """Base service request schema."""
    service_type: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=5000)
    priority: QuotePriority = Field(QuotePriority.MEDIUM)


class ServiceRequestCreate(ServiceRequestBase):
    """Schema for creating a service request."""
    customer_name: Optional[str] = Field(None, max_length=255)
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = Field(None, max_length=20)
    company_name: Optional[str] = Field(None, max_length=255)
    requested_date: Optional[datetime] = None
    preferred_time: Optional[str] = Field(None, max_length=50)
    duration_hours: Optional[float] = Field(None, gt=0)
    customer_notes: Optional[str] = Field(None, max_length=5000)


class ServiceRequestUpdate(BaseModel):
    """Schema for updating a service request."""
    service_type: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    status: Optional[QuoteStatus] = None
    priority: Optional[QuotePriority] = None
    requested_date: Optional[datetime] = None
    preferred_time: Optional[str] = Field(None, max_length=50)
    duration_hours: Optional[float] = Field(None, gt=0)
    internal_notes: Optional[str] = Field(None, max_length=5000)
    customer_notes: Optional[str] = Field(None, max_length=5000)


class ServiceRequestResponse(ServiceRequestBase):
    """Schema for service request response."""
    id: str
    customer_id: Optional[str]
    quote_request_id: Optional[str]
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    company_name: Optional[str]
    status: QuoteStatus
    requested_date: Optional[datetime]
    preferred_time: Optional[str]
    duration_hours: Optional[float]
    internal_notes: Optional[str]
    customer_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceRequestListResponse(BaseModel):
    """Schema for service request list response."""
    data: List[ServiceRequestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

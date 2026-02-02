"""
Order management Pydantic schemas.
Validation schemas for order CRUD operations.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class OrderStatus(str, Enum):
    """Order status enumeration."""
    REQUEST = "request"
    PENDING_COMMERCIAL = "pending_commercial"
    COMMERCIAL_APPROVED = "commercial_approved"
    COMMERCIAL_REJECTED = "commercial_rejected"
    PENDING_TECHNICAL = "pending_technical"
    TECHNICAL_APPROVED = "technical_approved"
    TECHNICAL_REJECTED = "technical_rejected"
    VALIDATED = "validated"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# ============================================================================
# ORDER ITEM SCHEMAS
# ============================================================================


class OrderItemBase(BaseModel):
    """Base order item schema."""

    product_id: Optional[str] = Field(None, description="Product ID (optional for fee/custom lines)")
    quantity: int = Field(..., ge=1, description="Quantity")
    unit_price: float = Field(..., gt=0, description="Unit price")
    discount_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    variant_sku: Optional[str] = None
    notes: Optional[str] = None


class OrderItemCreate(OrderItemBase):
    """Schema for creating order item."""

    pass


class OrderItemResponse(OrderItemBase):
    """Response schema for order item."""

    id: str
    order_id: str
    discount_amount: float
    total_price: float
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_short_description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ORDER SCHEMAS
# ============================================================================


class OrderBase(BaseModel):
    """Base order schema."""

    status: OrderStatus = Field(default=OrderStatus.REQUEST)
    customer_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_contact: Optional[str] = None


class OrderCreate(BaseModel):
    """Schema for creating a new order."""

    customer_id: str = Field(..., description="Customer ID")
    quote_id: Optional[str] = None
    customer_notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_contact: Optional[str] = None
    validation_required: bool = Field(default=True, description="Whether order requires commercial/technical validation")
    items: list[OrderItemCreate] = Field(..., min_items=1, description="Order items")


class OrderUpdate(BaseModel):
    """Schema for updating an order."""

    status: Optional[OrderStatus] = None
    customer_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_contact: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status."""

    status: OrderStatus = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Notes for status change")


class OrderResponse(OrderBase):
    """Response schema for order."""

    id: str
    order_number: str
    customer_id: str
    quote_id: Optional[str]
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    items: list[OrderItemResponse]

    # Validation workflow
    validation_required: bool
    commercial_validated_by: Optional[str]
    commercial_validated_at: Optional[datetime]
    commercial_validation_notes: Optional[str]
    commercial_approved: Optional[bool]
    technical_validated_by: Optional[str]
    technical_validated_at: Optional[datetime]
    technical_validation_notes: Optional[str]
    technical_approved: Optional[bool]

    # Status timestamps
    validated_at: Optional[datetime]
    in_progress_at: Optional[datetime]
    delivered_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderListResponse(BaseModel):
    """Paginated list of orders."""

    data: list[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# ORDER TIMELINE SCHEMAS
# ============================================================================


class OrderTimelineEntry(BaseModel):
    """Schema for order timeline entry."""

    id: str
    order_id: str
    previous_status: Optional[OrderStatus]
    new_status: OrderStatus
    action_type: str
    description: Optional[str]
    performed_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderTimelineListResponse(BaseModel):
    """List of timeline entries for an order."""

    data: list[OrderTimelineEntry]
    total: int


# ============================================================================
# VALIDATION WORKFLOW SCHEMAS
# ============================================================================


class SubmitForValidationRequest(BaseModel):
    """Schema for submitting order for validation."""

    notes: Optional[str] = Field(None, description="Notes for submission")


class CommercialValidationRequest(BaseModel):
    """Schema for commercial validation decision."""

    approved: bool = Field(..., description="Whether commercial validation is approved")
    notes: Optional[str] = Field(None, description="Notes explaining the decision")


class TechnicalValidationRequest(BaseModel):
    """Schema for technical validation decision."""

    approved: bool = Field(..., description="Whether technical validation is approved")
    notes: Optional[str] = Field(None, description="Notes explaining the decision")


class ResubmitValidationRequest(BaseModel):
    """Schema for resubmitting order after rejection."""

    notes: Optional[str] = Field(None, description="Notes explaining changes made")


class SkipValidationRequest(BaseModel):
    """Schema for skipping validation workflow."""

    notes: Optional[str] = Field(None, description="Reason for skipping validation")


class ValidationSummary(BaseModel):
    """Summary of order validation status."""

    validation_required: bool
    commercial_validation: Optional[dict] = None
    technical_validation: Optional[dict] = None
    fully_validated: bool
    validated_at: Optional[str] = None


class AllowedTransitionsResponse(BaseModel):
    """Response for allowed status transitions."""

    current_status: OrderStatus
    allowed_transitions: list[OrderStatus]
    validation_required: bool


# ============================================================================
# QUOTE CONVERSION SCHEMAS
# ============================================================================


class OrderConvertFromQuoteRequest(BaseModel):
    """Schema for converting a quote to an order."""

    quote_id: str = Field(..., description="Quote ID to convert")
    customer_notes: Optional[str] = Field(None, description="Additional customer notes for the order")
    delivery_address: Optional[str] = Field(None, description="Delivery address")
    delivery_contact: Optional[str] = Field(None, description="Delivery contact person")
    validation_required: bool = Field(default=True, description="Whether order requires validation workflow")

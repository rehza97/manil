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
    VALIDATED = "validated"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# ============================================================================
# ORDER ITEM SCHEMAS
# ============================================================================


class OrderItemBase(BaseModel):
    """Base order item schema."""

    product_id: str = Field(..., description="Product ID")
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

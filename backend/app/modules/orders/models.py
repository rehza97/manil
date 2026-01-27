"""
Order management database models.
Handles orders, items, timeline, and state management.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import String, DateTime, Numeric, Integer, Boolean, ForeignKey, Text, Enum as SQLEnum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


class OrderStatus(str, Enum):
    """Order status enumeration."""
    REQUEST = "request"  # Initial request submitted
    PENDING_COMMERCIAL = "pending_commercial"  # Awaiting commercial validation
    COMMERCIAL_APPROVED = "commercial_approved"  # Commercial validation passed
    COMMERCIAL_REJECTED = "commercial_rejected"  # Commercial validation rejected
    PENDING_TECHNICAL = "pending_technical"  # Awaiting technical validation
    TECHNICAL_APPROVED = "technical_approved"  # Technical validation passed
    TECHNICAL_REJECTED = "technical_rejected"  # Technical validation rejected
    VALIDATED = "validated"  # Fully validated (both commercial & technical)
    IN_PROGRESS = "in_progress"  # Order being processed/prepared
    DELIVERED = "delivered"  # Order delivered to customer
    CANCELLED = "cancelled"  # Order cancelled


class Order(Base):
    """
    Order record for customer purchases.
    Links to customers, products, and quotes.
    """

    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique order identifier",
    )

    # Customer Reference
    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Reference to customer",
    )

    # Quote Reference (optional)
    quote_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("quotes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Reference to quote if order originated from quote",
    )

    # Order Status
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum", native_enum=True, values_callable=lambda x: [e.value for e in x]),
        default=OrderStatus.REQUEST,
        nullable=False,
        index=True,
        doc="Current order status",
    )

    # Order Pricing
    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0.0,
        doc="Order subtotal before tax and discounts",
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0.0,
        doc="Tax amount calculated",
    )
    discount_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0.0,
        doc="Total discount amount",
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        doc="Final order total (subtotal + tax - discount)",
    )

    # Order Details
    order_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        doc="Human-readable order number",
    )
    customer_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Notes from customer",
    )
    internal_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Internal notes for corporate team",
    )

    # Delivery Information
    delivery_address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Delivery address",
    )
    delivery_contact: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Contact person for delivery",
    )

    # Validation Workflow
    validation_required: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether order requires commercial/technical validation",
    )

    # Commercial Validation
    commercial_validated_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who performed commercial validation",
    )
    commercial_validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When commercial validation was performed",
    )
    commercial_validation_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Notes from commercial validation",
    )
    commercial_approved: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
        doc="Whether commercial validation was approved",
    )

    # Technical Validation
    technical_validated_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who performed technical validation",
    )
    technical_validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When technical validation was performed",
    )
    technical_validation_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Notes from technical validation",
    )
    technical_approved: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
        doc="Whether technical validation was approved",
    )

    # Status Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="When order was created",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Last update timestamp",
    )
    validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When order was fully validated",
    )
    in_progress_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When order entered In Progress state",
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When order was delivered",
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="When order was cancelled",
    )

    # Audit
    created_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        doc="User who created the order",
    )
    updated_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who last updated the order",
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        doc="Soft delete timestamp",
    )

    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    timeline = relationship("OrderTimeline", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Order {self.order_number} ({self.status})>"


class OrderItem(Base):
    """
    Individual items in an order.
    Links orders to products with quantity and pricing.
    """

    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique order item identifier",
    )

    # Order Reference
    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to order",
    )

    # Product Reference
    product_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Reference to product",
    )

    # Item Pricing
    unit_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Unit price at time of order",
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        doc="Quantity ordered",
    )
    discount_percentage: Mapped[float] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=0.0,
        doc="Discount percentage for this item",
    )
    discount_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0.0,
        doc="Discount amount for this item",
    )
    total_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        doc="Total price for this item (quantity * unit_price - discount)",
    )

    # Item Details
    variant_sku: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="SKU of specific variant if applicable",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Special notes for this item",
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    order = relationship("Order", back_populates="items")

    def __repr__(self) -> str:
        return f"<OrderItem {self.product_id} x{self.quantity}>"


class OrderTimeline(Base):
    """
    Timeline of order status changes.
    Tracks all state transitions and their timestamps.
    """

    __tablename__ = "order_timeline"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique timeline entry identifier",
    )

    # Order Reference
    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to order",
    )

    # Status Change
    previous_status: Mapped[Optional[OrderStatus]] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum", native_enum=True, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
        doc="Previous status",
    )
    new_status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum", native_enum=True, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        doc="New status",
    )

    # Action Details
    action_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Type of action (e.g., 'status_change', 'note_added', 'item_modified')",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Description of the action",
    )

    # Who Made the Change
    performed_by: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        doc="User who performed the action",
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
        doc="When this action occurred",
    )

    # Relationships
    order = relationship("Order", back_populates="timeline")

    def __repr__(self) -> str:
        return f"<OrderTimeline {self.order_id}: {self.action_type}>"

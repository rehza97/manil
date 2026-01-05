"""
Invoice database models.

Handles invoice creation, quote conversion, payment tracking, and status management.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from decimal import Decimal

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, Numeric, Integer, ForeignKey, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


class InvoiceStatus(str, PyEnum):
    """Invoice status enumeration."""
    DRAFT = "draft"
    ISSUED = "issued"
    SENT = "sent"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentMethod(str, PyEnum):
    """Payment method enumeration."""
    BANK_TRANSFER = "bank_transfer"
    CHECK = "check"
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    MOBILE_PAYMENT = "mobile_payment"
    OTHER = "other"


class Invoice(Base):
    """Invoice database model."""

    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Link to quote (optional - invoice can be created without quote)
    quote_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("quotes.id"), nullable=True, index=True)

    # Link to VPS subscription (optional - invoice can be created without VPS subscription)
    vps_subscription_id: Mapped[str | None] = mapped_column(
        String(36), 
        ForeignKey("vps_subscriptions.id"), 
        nullable=True, 
        index=True
    )

    # Customer information
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id"), nullable=False, index=True)

    # Invoice details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status
    status: Mapped[InvoiceStatus] = mapped_column(
        SQLEnum(InvoiceStatus),
        default=InvoiceStatus.DRAFT,
        nullable=False,
        index=True
    )

    # Financial information
    subtotal_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        default=Decimal("19.00"),
        nullable=False
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )

    # Payment tracking
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=12, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        SQLEnum(PaymentMethod),
        nullable=True
    )

    # Dates
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Audit fields
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    quote = relationship("Quote", foreign_keys=[quote_id])
    vps_subscription = relationship("VPSSubscription", foreign_keys=[vps_subscription_id])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    timeline_events = relationship("InvoiceTimeline", back_populates="invoice", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])


class InvoiceItem(Base):
    """Invoice line item model."""

    __tablename__ = "invoice_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), nullable=False, index=True)

    # Item details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)

    # Optional product link
    product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("products.id"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", foreign_keys=[product_id])


class InvoiceTimeline(Base):
    """Invoice timeline/history model."""

    __tablename__ = "invoice_timeline"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), nullable=False, index=True)

    # Event details
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # created, issued, sent, paid, etc.
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Actor
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="timeline_events")
    user = relationship("User", foreign_keys=[user_id])

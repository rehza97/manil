"""
Quote database models.

Handles quote creation, versioning, approval workflow, and expiration.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from decimal import Decimal

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, Numeric, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


class QuoteStatus(str, PyEnum):
    """Quote status enumeration."""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    CONVERTED = "converted"  # Converted to order


class Quote(Base):
    """Quote database model."""

    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    # Version control
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_quote_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("quotes.id"), nullable=True)
    is_latest_version: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Customer information
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id"), nullable=False, index=True)

    # Quote details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status and workflow
    status: Mapped[QuoteStatus] = mapped_column(
        SQLEnum(QuoteStatus),
        default=QuoteStatus.DRAFT,
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

    # Dates
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    declined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Approval workflow
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Additional information
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Audit fields
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
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="quotes", foreign_keys=[customer_id])
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    parent_quote = relationship("Quote", remote_side=[id], backref="versions")
    timeline_events = relationship("QuoteTimeline", back_populates="quote", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Quote {self.quote_number} v{self.version} - {self.status}>"


class QuoteItem(Base):
    """Quote line item model."""

    __tablename__ = "quote_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    quote_id: Mapped[str] = mapped_column(String(36), ForeignKey("quotes.id"), nullable=False, index=True)
    product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("products.id"), nullable=True)

    # Item details
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)
    discount_percentage: Mapped[Decimal] = mapped_column(
        Numeric(precision=5, scale=2),
        default=Decimal("0.00"),
        nullable=False
    )
    line_total: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)

    # Sorting
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    quote = relationship("Quote", back_populates="items")
    product = relationship("Product")

    def __repr__(self) -> str:
        return f"<QuoteItem {self.item_name} x{self.quantity}>"


class QuoteTimeline(Base):
    """Quote timeline/history tracking."""

    __tablename__ = "quote_timeline"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    quote_id: Mapped[str] = mapped_column(String(36), ForeignKey("quotes.id"), nullable=False, index=True)

    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_description: Mapped[str] = mapped_column(Text, nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    # Relationships
    quote = relationship("Quote", back_populates="timeline_events")
    created_by = relationship("User")

    def __repr__(self) -> str:
        return f"<QuoteTimeline {self.event_type} at {self.created_at}>"

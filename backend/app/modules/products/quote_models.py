"""Quote request models for the product catalogue."""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from uuid import uuid4

from app.config.database import Base


class QuoteStatus(str, enum.Enum):
    """Quote request status."""
    PENDING = "pending"
    REVIEWED = "reviewed"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class QuotePriority(str, enum.Enum):
    """Quote priority level."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class QuoteRequest(Base):
    """Quote request model."""
    __tablename__ = "quote_requests"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))

    # Foreign keys
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    # Request details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)

    # Customer info (for non-registered users)
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    company_name = Column(String(255), nullable=True)

    # Quote details
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.PENDING, nullable=False)
    priority = Column(SQLEnum(QuotePriority), default=QuotePriority.MEDIUM, nullable=False)
    estimated_price = Column(Float, nullable=True)
    final_price = Column(Float, nullable=True)

    # Notes
    internal_notes = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)

    # Dates
    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    quoted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Metadata
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    customer = relationship("Customer", foreign_keys=[customer_id])
    product = relationship("Product", foreign_keys=[product_id])


class QuoteLineItem(Base):
    """Quote line item model."""
    __tablename__ = "quote_line_items"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))

    # Foreign key
    quote_id = Column(String(36), ForeignKey("quote_requests.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    # Item details
    product_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    # Discount
    discount_percentage = Column(Float, default=0, nullable=False)
    discount_amount = Column(Float, default=0, nullable=False)
    final_price = Column(Float, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    quote = relationship("QuoteRequest", backref="line_items")
    product = relationship("Product", foreign_keys=[product_id])


class ServiceRequest(Base):
    """Service request model (extension of quote requests)."""
    __tablename__ = "service_requests"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))

    # Foreign keys
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=True)
    quote_request_id = Column(String(36), ForeignKey("quote_requests.id", ondelete="CASCADE"), nullable=True)

    # Service details
    service_type = Column(String(255), nullable=False)  # e.g., "Installation", "Consulting", "Training"
    description = Column(Text, nullable=False)

    # Customer info
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    company_name = Column(String(255), nullable=True)

    # Service schedule
    requested_date = Column(DateTime, nullable=True)
    preferred_time = Column(String(50), nullable=True)
    duration_hours = Column(Float, nullable=True)

    # Status
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.PENDING, nullable=False)
    priority = Column(SQLEnum(QuotePriority), default=QuotePriority.MEDIUM, nullable=False)

    # Notes
    internal_notes = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)

    # Soft delete
    deleted_at = Column(DateTime, nullable=True)

    # Metadata
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    customer = relationship("Customer", foreign_keys=[customer_id])
    quote_request = relationship("QuoteRequest", foreign_keys=[quote_request_id])

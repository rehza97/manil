"""Customer database model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.modules.customers.schemas import CustomerStatus, CustomerType




class Customer(Base):
    """Customer database model for storing customer information."""

    __tablename__ = "customers"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique customer identifier (UUID)",
    )

    # Basic Information
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        doc="Customer full name",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        doc="Customer email address (unique)",
    )
    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        doc="Customer phone number",
    )

    # Customer Classification
    customer_type: Mapped[CustomerType] = mapped_column(
        SQLEnum(CustomerType, name="customer_type_enum", native_enum=True, values_callable=lambda x: [e.value for e in x]),
        default=CustomerType.INDIVIDUAL,
        nullable=False,
        index=True,
        doc="Type of customer (individual/corporate)",
    )
    status: Mapped[CustomerStatus] = mapped_column(
        SQLEnum(CustomerStatus, name="customer_status_enum", native_enum=True, values_callable=lambda x: [e.value for e in x]),
        default=CustomerStatus.PENDING,
        nullable=False,
        index=True,
        doc="Customer account status",
    )

    # Corporate Information (Optional)
    company_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Company name for corporate customers",
    )
    tax_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        doc="Tax identification number",
    )

    # Address Information (Optional)
    address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Customer street address",
    )
    city: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="City",
    )
    state: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="State/Province",
    )
    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Country",
    )
    postal_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Postal/ZIP code",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        nullable=False,
        doc="Timestamp when customer was created",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
        doc="Timestamp when customer was last updated",
    )
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        doc="ID of user who created this customer",
    )
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="ID of user who last updated this customer",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        doc="Soft delete timestamp (NULL if not deleted)",
    )
    deleted_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="ID of user who deleted this customer",
    )

    # Relationships
    tickets = relationship("Ticket", back_populates="customer")
    quotes = relationship("Quote", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")

    def __repr__(self) -> str:
        """String representation of Customer model."""
        return f"<Customer {self.name} ({self.email})>"

    def __str__(self) -> str:
        """Human-readable string representation."""
        return f"{self.name} - {self.email} ({self.status.value})"

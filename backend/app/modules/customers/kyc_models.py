"""KYC (Know Your Customer) database models."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base


class KYCDocumentType(str, PyEnum):
    """Types of KYC documents."""

    NATIONAL_ID = "national_id"
    PASSPORT = "passport"
    DRIVER_LICENSE = "driver_license"
    BUSINESS_REGISTRATION = "business_registration"
    TAX_CERTIFICATE = "tax_certificate"
    PROOF_OF_ADDRESS = "proof_of_address"
    OTHER = "other"


class KYCStatus(str, PyEnum):
    """KYC verification status."""

    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class KYCDocument(Base):
    """KYC document model for customer verification."""

    __tablename__ = "kyc_documents"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique document identifier",
    )

    # Foreign Keys
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Customer this document belongs to",
    )

    # Document Information
    document_type: Mapped[KYCDocumentType] = mapped_column(
        SQLEnum(KYCDocumentType, name="kyc_document_type_enum"),
        nullable=False,
        index=True,
        doc="Type of KYC document",
    )
    document_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="Document number (e.g., ID number, passport number)",
    )
    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Path to uploaded document file",
    )
    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Original filename",
    )
    file_size: Mapped[int] = mapped_column(
        nullable=False,
        doc="File size in bytes",
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="File MIME type",
    )

    # Verification Status
    status: Mapped[KYCStatus] = mapped_column(
        SQLEnum(KYCStatus, name="kyc_status_enum"),
        default=KYCStatus.PENDING,
        nullable=False,
        index=True,
        doc="Verification status",
    )

    # Verification Details
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        doc="When document was verified",
    )
    verified_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who verified the document",
    )
    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Reason for rejection if status is REJECTED",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Internal notes about the document",
    )

    # Expiry (for documents with expiration dates)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        doc="Document expiration date",
    )

    # Audit Fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        nullable=False,
        doc="When document was uploaded",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
        doc="Last update timestamp",
    )
    created_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        doc="User who uploaded the document",
    )
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who last updated the document",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        doc="Soft delete timestamp",
    )
    deleted_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who deleted the document",
    )

    def __repr__(self) -> str:
        return f"<KYCDocument {self.document_type} for customer {self.customer_id}>"

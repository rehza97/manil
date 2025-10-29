"""Customer notes and documents database models."""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base


class NoteType(str, PyEnum):
    """Types of customer notes."""

    GENERAL = "general"
    CALL = "call"
    MEETING = "meeting"
    EMAIL = "email"
    ISSUE = "issue"
    FOLLOWUP = "followup"
    INTERNAL = "internal"


class DocumentCategory(str, PyEnum):
    """Categories for customer documents."""

    CONTRACT = "contract"
    INVOICE = "invoice"
    PROPOSAL = "proposal"
    AGREEMENT = "agreement"
    CORRESPONDENCE = "correspondence"
    REPORT = "report"
    OTHER = "other"


class CustomerNote(Base):
    """Customer internal notes model."""

    __tablename__ = "customer_notes"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique note identifier",
    )

    # Foreign Keys
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Customer this note belongs to",
    )

    # Note Information
    note_type: Mapped[NoteType] = mapped_column(
        SQLEnum(NoteType, name="note_type_enum"),
        default=NoteType.GENERAL,
        nullable=False,
        index=True,
        doc="Type of note",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Note title/subject",
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Note content/body",
    )
    is_pinned: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        doc="Whether note is pinned to top",
    )

    # Audit Fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        nullable=False,
        doc="When note was created",
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
        doc="User who created the note",
    )
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who last updated the note",
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
        doc="User who deleted the note",
    )

    def __repr__(self) -> str:
        return f"<CustomerNote {self.title} for customer {self.customer_id}>"


class CustomerDocument(Base):
    """Customer general documents model (non-KYC)."""

    __tablename__ = "customer_documents"

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
    category: Mapped[DocumentCategory] = mapped_column(
        SQLEnum(DocumentCategory, name="document_category_enum"),
        default=DocumentCategory.OTHER,
        nullable=False,
        index=True,
        doc="Document category",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Document title",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Document description",
    )
    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Path to document file",
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

    # Audit Fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="When document was uploaded",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
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
        return f"<CustomerDocument {self.title} for customer {self.customer_id}>"

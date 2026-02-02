"""
Export database models.

Tracks all export jobs for audit and history purposes.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, Enum as SQLEnum, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


class ExportFormat(str, PyEnum):
    """Export format enumeration."""
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"


class ExportType(str, PyEnum):
    """Export type enumeration."""
    TICKETS = "tickets"
    CUSTOMERS = "customers"
    ORDERS = "orders"
    INVOICES = "invoices"
    QUOTES = "quotes"
    VPS = "vps"
    PRODUCTS = "products"
    USERS = "users"
    AUDIT_LOGS = "audit_logs"
    CUSTOM = "custom"


class ExportStatus(str, PyEnum):
    """Export status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class Export(Base):
    """Export tracking model for all export operations."""

    __tablename__ = "exports"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Export identification
    export_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False)

    # Export details
    export_type: Mapped[ExportType] = mapped_column(
        SQLEnum(ExportType),
        nullable=False,
        index=True
    )
    export_format: Mapped[ExportFormat] = mapped_column(
        SQLEnum(ExportFormat),
        nullable=False
    )
    status: Mapped[ExportStatus] = mapped_column(
        SQLEnum(ExportStatus),
        default=ExportStatus.PENDING,
        nullable=False,
        index=True
    )

    # File information
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(
        Integer, nullable=True)  # in bytes
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Export metadata
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    filters: Mapped[dict | None] = mapped_column(
        JSON, nullable=True)  # Store applied filters
    parameters: Mapped[dict | None] = mapped_column(
        JSON, nullable=True)  # Additional parameters

    # Statistics
    total_records: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Error tracking
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # Download tracking
    download_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False)
    last_downloaded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # User who requested the export
    requested_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True)

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

    # Relationships
    requested_by = relationship("User", foreign_keys=[requested_by_id])

    @staticmethod
    def generate_export_number() -> str:
        """Generate unique export number."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"EXP-{timestamp}-{unique_id}"

    def mark_processing(self) -> None:
        """Mark export as processing."""
        self.status = ExportStatus.PROCESSING
        self.started_at = datetime.now(timezone.utc)

    def mark_completed(self, file_name: str, file_path: str, file_size: int, total_records: int) -> None:
        """Mark export as completed with file info."""
        self.status = ExportStatus.COMPLETED
        self.file_name = file_name
        self.file_path = file_path
        self.file_size = file_size
        self.total_records = total_records
        self.completed_at = datetime.now(timezone.utc)

    def mark_failed(self, error_message: str) -> None:
        """Mark export as failed with error."""
        self.status = ExportStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now(timezone.utc)

    def record_download(self) -> None:
        """Record a download of this export."""
        self.download_count += 1
        self.last_downloaded_at = datetime.now(timezone.utc)


class ReportHistory(Base):
    """Tracks advanced report generation for audit."""

    __tablename__ = "report_history"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    report_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True)
    report_name: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(20), nullable=False)
    parameters: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    generated_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    download_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default="completed", nullable=False)

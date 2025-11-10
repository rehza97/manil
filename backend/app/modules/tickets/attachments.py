"""Ticket attachment models, schemas, and business logic."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import Base


class FileType(str, Enum):
    """Allowed file types for attachments."""

    PDF = "pdf"
    IMAGE = "image"  # jpg, png, gif, webp
    DOCUMENT = "document"  # docx, xlsx, txt
    ARCHIVE = "archive"  # zip, rar, 7z
    VIDEO = "video"  # mp4, mov, avi


class TicketAttachment(Base):
    """Ticket attachment model for files in ticket communication."""

    __tablename__ = "ticket_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reply_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("ticket_replies.id", ondelete="CASCADE"), nullable=True
    )

    # File information
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # In bytes
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)

    # Metadata
    uploaded_by: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    virus_scanned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_infected: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    def __repr__(self) -> str:
        return f"<TicketAttachment {self.id} - {self.original_filename}>"


# Pydantic Schemas


class AttachmentUploadRequest(BaseModel):
    """Schema for file upload (metadata)."""

    filename: str = Field(..., min_length=1, max_length=255)
    mime_type: str = Field(..., min_length=1, max_length=100)
    file_size: int = Field(..., gt=0)


class AttachmentResponse(BaseModel):
    """Schema for attachment response."""

    id: str
    ticket_id: str
    reply_id: Optional[str]
    filename: str
    original_filename: str
    file_type: str
    mime_type: str
    file_size: int
    uploaded_by: str
    download_count: int
    created_at: datetime
    virus_scanned: bool
    is_infected: bool

    class Config:
        from_attributes = True


class AttachmentDownloadResponse(BaseModel):
    """Schema for attachment download response."""

    id: str
    filename: str
    mime_type: str
    file_size: int
    download_count: int


# Configuration


class AttachmentConfig:
    """Configuration for file attachments."""

    # File size limits (in bytes)
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
    MAX_TOTAL_SIZE_PER_TICKET = 100 * 1024 * 1024  # 100MB per ticket
    MAX_ATTACHMENTS_PER_REPLY = 10  # Max files per reply

    # Allowed file types (by extension)
    ALLOWED_EXTENSIONS = {
        # Images
        ".jpg": "image",
        ".jpeg": "image",
        ".png": "image",
        ".gif": "image",
        ".webp": "image",
        ".svg": "image",
        # Documents
        ".pdf": "pdf",
        ".docx": "document",
        ".doc": "document",
        ".xlsx": "document",
        ".xls": "document",
        ".pptx": "document",
        ".txt": "document",
        ".rtf": "document",
        # Archives
        ".zip": "archive",
        ".rar": "archive",
        ".7z": "archive",
        ".tar": "archive",
        ".gz": "archive",
        # Video
        ".mp4": "video",
        ".mov": "video",
        ".avi": "video",
        ".mkv": "video",
        ".webm": "video",
    }

    # MIME type mapping
    MIME_TYPES = {
        "image/jpeg": "image",
        "image/png": "image",
        "image/gif": "image",
        "image/webp": "image",
        "image/svg+xml": "image",
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
        "application/msword": "document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
        "application/vnd.ms-excel": "document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "document",
        "text/plain": "document",
        "text/rtf": "document",
        "application/zip": "archive",
        "application/x-rar-compressed": "archive",
        "application/x-7z-compressed": "archive",
        "application/x-tar": "archive",
        "application/gzip": "archive",
        "video/mp4": "video",
        "video/quicktime": "video",
        "video/x-msvideo": "video",
        "video/x-matroska": "video",
        "video/webm": "video",
    }

    # Blocked MIME types (executable, scripts, etc.)
    BLOCKED_MIME_TYPES = {
        "application/x-executable",
        "application/x-msdownload",
        "application/x-msdos-program",
        "application/x-sh",
        "text/x-shellscript",
        "application/x-python",
        "text/x-python",
    }

    # Blocked extensions
    BLOCKED_EXTENSIONS = {
        ".exe",
        ".bat",
        ".cmd",
        ".sh",
        ".py",
        ".js",
        ".html",
        ".htm",
        ".php",
        ".asp",
        ".aspx",
        ".jar",
        ".class",
        ".dll",
        ".so",
        ".dylib",
    }

"""Ticket attachment schemas and business logic."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

# Import the model from models.py to avoid circular imports
from app.modules.tickets.models import TicketAttachment, FileType


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

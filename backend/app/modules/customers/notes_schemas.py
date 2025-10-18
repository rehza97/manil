"""Pydantic schemas for customer notes and documents."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.modules.customers.notes_models import NoteType, DocumentCategory


# ============================================================================
# Customer Notes Schemas
# ============================================================================

class CustomerNoteCreate(BaseModel):
    """Schema for creating a customer note."""

    note_type: NoteType = Field(default=NoteType.GENERAL, description="Type of note")
    title: str = Field(..., min_length=1, max_length=255, description="Note title")
    content: str = Field(..., min_length=1, description="Note content")
    is_pinned: bool = Field(default=False, description="Pin note to top")


class CustomerNoteUpdate(BaseModel):
    """Schema for updating a customer note."""

    note_type: Optional[NoteType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    is_pinned: Optional[bool] = None


class CustomerNoteResponse(BaseModel):
    """Schema for customer note response."""

    id: str
    customer_id: str
    note_type: NoteType
    title: str
    content: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: Optional[str]

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Customer Documents Schemas
# ============================================================================

class CustomerDocumentUpload(BaseModel):
    """Schema for document upload metadata."""

    category: DocumentCategory = Field(default=DocumentCategory.OTHER, description="Document category")
    title: str = Field(..., min_length=1, max_length=255, description="Document title")
    description: Optional[str] = Field(None, description="Document description")


class CustomerDocumentUpdate(BaseModel):
    """Schema for updating document metadata."""

    category: Optional[DocumentCategory] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class CustomerDocumentResponse(BaseModel):
    """Schema for customer document response."""

    id: str
    customer_id: str
    category: DocumentCategory
    title: str
    description: Optional[str]
    file_name: str
    file_size: int
    mime_type: str
    created_at: datetime
    updated_at: datetime
    created_by: str
    updated_by: Optional[str]

    model_config = ConfigDict(from_attributes=True)

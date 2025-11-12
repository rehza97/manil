"""Response templates (canned replies) models, schemas, and business logic."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import Base


class ResponseTemplate(Base):
    """Response template (canned reply) model."""

    __tablename__ = "response_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Audit fields
    created_by: Mapped[str] = mapped_column(String(36), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    def __repr__(self) -> str:
        return f"<ResponseTemplate {self.id} - {self.title}>"


class TicketCategory(Base):
    """Ticket category model for categorizing support tickets."""

    __tablename__ = "ticket_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # Hex color
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<TicketCategory {self.id} - {self.name}>"


# Pydantic Schemas


class ResponseTemplateCreate(BaseModel):
    """Schema for creating response template."""

    title: str = Field(..., min_length=5, max_length=255)
    category: str = Field(..., min_length=1, max_length=50)
    content: str = Field(..., min_length=10, max_length=5000)
    description: Optional[str] = Field(None, max_length=1000)
    is_default: bool = False


class ResponseTemplateUpdate(BaseModel):
    """Schema for updating response template."""

    title: Optional[str] = Field(None, min_length=5, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    content: Optional[str] = Field(None, min_length=10, max_length=5000)
    description: Optional[str] = Field(None, max_length=1000)
    is_default: Optional[bool] = None


class ResponseTemplateResponse(BaseModel):
    """Schema for response template response."""

    id: str
    title: str
    category: str
    content: str
    description: Optional[str]
    is_default: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TicketCategoryCreate(BaseModel):
    """Schema for creating ticket category."""

    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")  # Hex color


class TicketCategoryUpdate(BaseModel):
    """Schema for updating ticket category."""

    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None


class TicketCategoryResponse(BaseModel):
    """Schema for ticket category response."""

    id: str
    name: str
    description: Optional[str]
    color: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

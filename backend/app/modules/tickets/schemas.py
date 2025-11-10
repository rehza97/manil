"""Ticket request/response schemas."""
from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class TicketStatus(str, Enum):
    """Ticket status enum."""

    OPEN = "open"
    ANSWERED = "answered"
    WAITING_FOR_RESPONSE = "waiting_for_response"
    ON_HOLD = "on_hold"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    """Ticket priority enum."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketReplyBase(BaseModel):
    """Base ticket reply schema."""

    message: str = Field(..., min_length=1, max_length=10000)
    is_internal: bool = False


class TicketReplyCreate(TicketReplyBase):
    """Schema for creating ticket reply."""

    pass


class TicketReplyResponse(TicketReplyBase):
    """Schema for ticket reply response."""

    id: str
    ticket_id: str
    user_id: str
    is_solution: bool
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class TicketBase(BaseModel):
    """Base ticket schema."""

    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10, max_length=5000)
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketCreate(TicketBase):
    """Schema for creating ticket."""

    customer_id: str


class TicketUpdate(BaseModel):
    """Schema for updating ticket."""

    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    priority: Optional[TicketPriority] = None


class TicketStatusUpdate(BaseModel):
    """Schema for updating ticket status."""

    status: TicketStatus
    reason: Optional[str] = None


class TicketAssignment(BaseModel):
    """Schema for ticket assignment."""

    assigned_to: str = Field(..., min_length=1)


class TicketTransfer(BaseModel):
    """Schema for ticket transfer."""

    new_assigned_to: str = Field(..., min_length=1)
    reason: Optional[str] = None


class TicketResponse(TicketBase):
    """Schema for ticket response."""

    id: str
    status: TicketStatus
    customer_id: str
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: str
    first_response_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    view_count: int

    model_config = ConfigDict(from_attributes=True)


class TicketDetailResponse(TicketResponse):
    """Ticket detail response with replies."""

    replies: list[TicketReplyResponse] = []


class PaginationMetadata(BaseModel):
    """Pagination metadata."""

    total: int
    page: int
    page_size: int
    total_pages: int


class TicketListResponse(BaseModel):
    """Schema for ticket list response."""

    data: list[TicketResponse]
    pagination: PaginationMetadata

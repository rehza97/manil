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

    customer_id: str = Field(..., alias="customerId")
    
    model_config = ConfigDict(populate_by_name=True)


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


class TagCreate(BaseModel):
    """Schema for creating a tag."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: str = Field("#3B82F6", pattern=r"^#[0-9A-F]{6}$")


class TagUpdate(BaseModel):
    """Schema for updating a tag."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-F]{6}$")


class TagResponse(BaseModel):
    """Schema for tag response."""

    id: str
    name: str
    description: Optional[str]
    color: str
    usage_count: int
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class TicketTagAssignment(BaseModel):
    """Schema for assigning tags to a ticket."""

    tag_ids: list[str] = Field(..., min_length=1)


class WatcherNotificationPreferences(BaseModel):
    """Schema for watcher notification preferences."""

    notify_on_reply: bool = True
    notify_on_status_change: bool = True
    notify_on_assignment: bool = True


class WatcherCreate(BaseModel):
    """Schema for adding a watcher to a ticket."""

    user_id: str = Field(..., min_length=1)
    preferences: Optional[WatcherNotificationPreferences] = None


class WatcherResponse(BaseModel):
    """Schema for watcher response."""

    id: str
    ticket_id: str
    user_id: str
    notify_on_reply: bool
    notify_on_status_change: bool
    notify_on_assignment: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketWatcherList(BaseModel):
    """Schema for ticket watcher list response."""

    data: list[WatcherResponse]
    total_count: int

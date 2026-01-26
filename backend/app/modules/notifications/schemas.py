"""Notification schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    type: str
    title: str
    body: str | None
    link: str | None
    read_at: datetime | None
    created_at: datetime


class NotificationListResponse(BaseModel):
    data: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnreadCountResponse(BaseModel):
    count: int


class EmailSendHistoryResponse(BaseModel):
    """Email send history response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    template_name: str
    recipient_email: str
    recipient_user_id: str | None
    subject: str
    status: str
    error_message: str | None
    provider: str | None
    message_id: str | None
    sent_at: datetime | None
    created_at: datetime


class EmailSendHistoryListResponse(BaseModel):
    """Email send history list response schema."""
    items: list[EmailSendHistoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class EmailSendHistoryFilter(BaseModel):
    """Email send history filter schema."""
    recipient_email: str | None = None
    template_name: str | None = None
    status: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None


class TemplateStatsResponse(BaseModel):
    """Template statistics response schema."""
    template_name: str
    period_days: int
    total: int
    sent: int
    failed: int
    success_rate: float


class NotificationGroupCreate(BaseModel):
    """Notification group creation schema."""
    name: str
    description: str | None = None
    target_type: str
    target_criteria: dict | None = None
    is_active: bool = True


class NotificationGroupUpdate(BaseModel):
    """Notification group update schema."""
    name: str | None = None
    description: str | None = None
    target_type: str | None = None
    target_criteria: dict | None = None
    is_active: bool | None = None


class NotificationGroupResponse(BaseModel):
    """Notification group response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    target_type: str
    target_criteria: dict | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class NotificationGroupListResponse(BaseModel):
    """Notification group list response schema."""
    items: list[NotificationGroupResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class NotificationGroupTestResponse(BaseModel):
    """Notification group test targeting response schema."""
    group_id: str
    member_count: int

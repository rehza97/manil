"""
Audit log Pydantic schemas for validation.
Defines data transfer objects for audit logging operations.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from app.modules.audit.models import AuditAction


class AuditLogBase(BaseModel):
    """Base audit log schema."""

    action: AuditAction = Field(..., description="Type of action performed")
    resource_type: str = Field(..., min_length=1, max_length=100)
    resource_id: Optional[str] = Field(None, max_length=36)
    description: str = Field(..., min_length=1)


class AuditLogCreate(AuditLogBase):
    """Schema for creating an audit log entry."""

    user_id: Optional[str] = Field(None, max_length=36)
    user_email: Optional[str] = Field(None, max_length=255)
    user_role: Optional[str] = Field(None, max_length=50)
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = None
    request_method: Optional[str] = Field(None, max_length=10)
    request_path: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    extra_data: Optional[dict] = None
    success: bool = True
    error_message: Optional[str] = None


class AuditLogResponse(AuditLogBase):
    """Schema for audit log response."""

    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    user_role: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_method: Optional[str]
    request_path: Optional[str]
    old_values: Optional[dict]
    new_values: Optional[dict]
    extra_data: Optional[dict]
    success: bool
    error_message: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs."""

    action: Optional[AuditAction] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    success: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    ip_address: Optional[str] = None


class AuditLogListResponse(BaseModel):
    """Schema for audit log list response with pagination."""

    data: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = ConfigDict(from_attributes=True)

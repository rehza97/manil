"""
User Management schemas for admin operations.
Separate from authentication schemas to handle admin-specific user management.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.modules.auth.schemas import UserRole


class UserListFilter(BaseModel):
    """Filters for user listing."""

    role: Optional[str] = None
    is_active: Optional[bool] = None
    search: Optional[str] = Field(None, description="Search in name and email")


class UserDetailResponse(BaseModel):
    """Detailed user response for admin."""

    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    is_2fa_enabled: bool
    failed_login_attempts: int
    locked_until: Optional[datetime] = None
    last_failed_login: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated user list response."""

    users: list[UserDetailResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminUserCreate(BaseModel):
    """Schema for admin creating a user."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole = Field(default=UserRole.CLIENT)
    is_active: bool = Field(default=True)


class AdminUserUpdate(BaseModel):
    """Schema for admin updating a user."""

    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserStatusUpdate(BaseModel):
    """Schema for updating user status."""

    is_active: bool


class RoleAssignment(BaseModel):
    """Schema for assigning roles to user."""

    role: UserRole


class UserStats(BaseModel):
    """User statistics response."""

    total_logins: int = 0
    failed_logins: int = 0
    last_login: Optional[datetime] = None
    active_sessions: int = 0
    total_actions: int = 0
    account_age_days: int = 0


class UserSession(BaseModel):
    """User session information."""

    id: str
    user_id: str
    ip_address: str
    user_agent: str
    device_type: str
    browser: str
    os: str
    location: Optional[str] = None
    is_current: bool
    created_at: datetime
    last_activity: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSessionListResponse(BaseModel):
    """List of user sessions response."""

    data: list[UserSession]
    total: int


class UserActivity(BaseModel):
    """User activity log entry."""

    id: str
    user_id: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    description: str
    ip_address: str
    user_agent: str
    success: bool
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserActivityListResponse(BaseModel):
    """Paginated user activity response."""

    data: list[UserActivity]
    total: int
    page: int
    page_size: int

"""
Authentication schemas for request/response validation.
Uses Pydantic V2 for data validation.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRole(str, Enum):
    """User role enumeration."""

    ADMIN = "admin"
    CORPORATE = "corporate"
    CLIENT = "client"


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")


class LoginResponse(BaseModel):
    """Schema for login response."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str = Field(..., description="JWT refresh token")


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = Field(default=UserRole.CLIENT)


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    full_name: str | None = Field(None, min_length=2, max_length=255)
    is_active: bool | None = None


class UserResponse(UserBase):
    """Schema for user response."""

    id: str
    is_active: bool
    is_2fa_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Enable2FAResponse(BaseModel):
    """Schema for 2FA setup response."""

    secret: str = Field(..., description="TOTP secret key")
    qr_code_url: str = Field(..., description="QR code data URL")
    backup_codes: list[str] = Field(..., description="Backup recovery codes")


class Verify2FARequest(BaseModel):
    """Schema for 2FA verification request."""

    code: str = Field(..., min_length=6, max_length=6, description="TOTP code")


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""

    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""

    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")


class PasswordResetResponse(BaseModel):
    """Response schema for password reset request."""

    message: str = Field(..., description="Status message")
    email: str = Field(..., description="User email")


# Rebuild models to resolve forward references
LoginResponse.model_rebuild()

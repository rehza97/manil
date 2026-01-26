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

    access_token: str = Field(..., description="JWT access token (empty when requires_2fa)")
    refresh_token: str = Field(..., description="JWT refresh token (empty when requires_2fa)")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse"
    requires_2fa: bool = Field(default=False, description="True if 2FA code must be submitted to complete login")
    pending_2fa_token: str | None = Field(default=None, description="Short-lived token for 2FA complete-login (when requires_2fa)")


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


class CompleteLogin2FARequest(BaseModel):
    """Schema for completing login after 2FA verification."""

    pending_2fa_token: str = Field(..., description="Token from login response when requires_2fa")
    code: str = Field(..., min_length=6, max_length=6, description="TOTP code")


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""

    email: EmailStr = Field(..., description="User email address")
    method: str = Field(default="email", description="Reset method: 'email' or 'sms'")


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""

    token: str | None = Field(None, description="Password reset token (for email method)")
    code: str | None = Field(None, description="Password reset code (for SMS method, 6 digits)")
    email: EmailStr | None = Field(None, description="User email (required when using code)")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")


class PasswordResetResponse(BaseModel):
    """Response schema for password reset request."""

    message: str = Field(..., description="Status message")
    email: str = Field(..., description="User email")


class ChangePasswordRequest(BaseModel):
    """Schema for password change request."""

    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password")


class SetupRequired2FARequest(BaseModel):
    """Schema for setting up 2FA when required (unauthenticated)."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")


class VerifySetupRequired2FARequest(BaseModel):
    """Schema for verifying 2FA setup when required (unauthenticated)."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    code: str = Field(..., min_length=6, max_length=6, description="TOTP code")


class VerifySetupRequired2FAResponse(BaseModel):
    """Schema for verify setup required 2FA response."""

    success: bool = Field(..., description="Whether verification was successful")
    message: str = Field(..., description="Status message")


# Rebuild models to resolve forward references
LoginResponse.model_rebuild()

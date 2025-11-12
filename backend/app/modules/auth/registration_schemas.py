"""
Registration and email verification schemas.
Pydantic schemas for user registration workflows.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegistrationStatus(str, Enum):
    """Status of a registration request."""
    PENDING = "pending"
    EMAIL_VERIFIED = "email_verified"
    ACTIVATED = "activated"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class RegistrationRequest(BaseModel):
    """Schema for initiating user registration."""

    email: EmailStr = Field(..., description="Email address for new account")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name")
    password: str = Field(..., min_length=8, max_length=100, description="Account password")
    phone: str | None = Field(None, max_length=20, description="Phone number (optional)")
    company_name: str | None = Field(None, max_length=255, description="Company name (optional)")


class RegistrationResponse(BaseModel):
    """Response after registration initiated."""

    id: str = Field(..., description="Registration request ID")
    email: str = Field(..., description="Email address")
    full_name: str = Field(..., description="Full name")
    status: RegistrationStatus = Field(..., description="Current registration status")
    email_verified: bool = Field(..., description="Whether email is verified")
    account_activated: bool = Field(..., description="Whether account is activated")
    created_at: datetime = Field(..., description="When registration was initiated")
    expires_at: datetime = Field(..., description="When registration request expires")

    model_config = ConfigDict(from_attributes=True)


class VerifyEmailRequest(BaseModel):
    """Schema for email verification."""

    registration_id: str = Field(..., description="Registration request ID")
    token: str = Field(..., description="Email verification token")


class VerifyEmailResponse(BaseModel):
    """Response after email verification."""

    id: str = Field(..., description="Registration request ID")
    email: str = Field(..., description="Email address")
    status: RegistrationStatus = Field(..., description="Updated registration status")
    email_verified: bool = Field(..., description="Email verified status")
    email_verified_at: datetime | None = Field(..., description="When email was verified")
    message: str = Field(..., description="Status message")

    model_config = ConfigDict(from_attributes=True)


class ActivateAccountRequest(BaseModel):
    """Schema for account activation."""

    registration_id: str = Field(..., description="Registration request ID")


class ActivateAccountResponse(BaseModel):
    """Response after account activation."""

    id: str = Field(..., description="Registration request ID")
    user_id: str = Field(..., description="Created User ID")
    customer_id: str = Field(..., description="Created Customer ID")
    status: RegistrationStatus = Field(..., description="Updated registration status")
    account_activated: bool = Field(..., description="Account activation status")
    activated_at: datetime | None = Field(..., description="When account was activated")
    message: str = Field(..., description="Status message")

    model_config = ConfigDict(from_attributes=True)


class RegistrationListResponse(BaseModel):
    """Paginated list of registration requests."""

    data: list[RegistrationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ResendVerificationEmailRequest(BaseModel):
    """Schema for resending verification email."""

    registration_id: str = Field(..., description="Registration request ID")


class ResendVerificationEmailResponse(BaseModel):
    """Response after resending verification email."""

    message: str = Field(..., description="Status message")
    registration_id: str = Field(..., description="Registration request ID")
    email: str = Field(..., description="Email address where token was sent")

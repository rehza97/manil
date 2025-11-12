"""
Account registration and email verification models.
Handles new user registration workflows and email verification tokens.
"""
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum

from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


class RegistrationStatus(str, Enum):
    """Status of a registration request."""
    PENDING = "pending"  # Registration started, email not verified
    EMAIL_VERIFIED = "email_verified"  # Email verified, awaiting activation
    ACTIVATED = "activated"  # Account activated and user is active
    EXPIRED = "expired"  # Registration token expired
    CANCELLED = "cancelled"  # Registration cancelled by user


class RegistrationRequest(Base):
    """
    Tracks new user registration workflows.
    Links temporary registration data with email verification tokens.
    """

    __tablename__ = "registration_requests"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique registration request identifier",
    )

    # Registration Data
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        doc="Email address for registration",
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Full name of registering user",
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Hashed password for the account",
    )
    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Phone number (optional)",
    )
    company_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        doc="Company name (optional, for corporate customers)",
    )

    # Status Tracking
    status: Mapped[RegistrationStatus] = mapped_column(
        SQLEnum(RegistrationStatus, name="registration_status_enum"),
        default=RegistrationStatus.PENDING,
        nullable=False,
        index=True,
        doc="Current status of registration",
    )

    # Email Verification
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether email has been verified",
    )
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        doc="Timestamp when email was verified",
    )

    # Account Activation
    account_activated: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether account has been activated",
    )
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        doc="Timestamp when account was activated",
    )

    # Links to Created Accounts
    user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="ID of created User account (set after email verification)",
    )
    customer_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        doc="ID of created Customer record (set after account activation)",
    )

    # Audit Fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        nullable=False,
        doc="Timestamp when registration was initiated",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
        doc="Timestamp of last update",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow() + timedelta(days=7),
        nullable=False,
        index=True,
        doc="When this registration request expires (7 days by default)",
    )

    def __repr__(self) -> str:
        return f"<RegistrationRequest {self.email} ({self.status})>"

    def is_expired(self) -> bool:
        """Check if registration request has expired."""
        return datetime.utcnow() > self.expires_at

    def mark_email_verified(self) -> None:
        """Mark email as verified."""
        self.email_verified = True
        self.email_verified_at = datetime.utcnow()
        self.status = RegistrationStatus.EMAIL_VERIFIED

    def mark_activated(self) -> None:
        """Mark account as activated."""
        self.account_activated = True
        self.activated_at = datetime.utcnow()
        self.status = RegistrationStatus.ACTIVATED


class EmailVerificationToken(Base):
    """
    Temporary tokens for email verification in registration.
    One-time use tokens sent via email links.
    """

    __tablename__ = "email_verification_tokens"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        doc="Unique token identifier",
    )

    # Token Data
    token: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        unique=True,
        index=True,
        doc="The actual verification token (hashed in production)",
    )
    registration_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("registration_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Reference to registration request",
    )

    # Token Status
    used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether token has been used",
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        doc="When token was used",
    )

    # Expiration
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow() + timedelta(hours=24),
        nullable=False,
        index=True,
        doc="Token expiration time (24 hours by default)",
    )

    # Audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        nullable=False,
    )

    def is_expired(self) -> bool:
        """Check if token has expired."""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)."""
        return not self.used and not self.is_expired()

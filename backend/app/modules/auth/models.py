"""
Authentication database models.
Uses SQLAlchemy 2.0 async syntax.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base
from app.modules.auth.schemas import UserRole


class User(Base):
    """User database model."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role"),
        default=UserRole.CLIENT,
        nullable=False,
    )

    # Status flags
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False)
    is_2fa_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    totp_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Account lockout fields (SECURITY)
    failed_login_attempts: Mapped[int] = mapped_column(
        nullable=False, default=0,
        doc="Number of consecutive failed login attempts"
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True,
        doc="Account locked until this timestamp (NULL if not locked)"
    )
    last_failed_login: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True,
        doc="Timestamp of last failed login attempt"
    )

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
    )
    created_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        doc="ID of user who created this account (nullable for system/initial users)",
    )
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="ID of user who last updated this account",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        doc="Soft delete timestamp (NULL if not deleted)",
    )
    deleted_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="ID of user who deleted this account",
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"

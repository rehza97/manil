"""
Authentication database models.
Uses SQLAlchemy 2.0 async syntax.
"""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base

if TYPE_CHECKING:
    from app.modules.settings.models import Role


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
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
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

    role_rel: Mapped["Role"] = relationship(
        "Role",
        foreign_keys=[role_id],
        lazy="joined",
    )

    @property
    def role(self):
        """Alias for role_rel for schema serialization (UserDetailResponse.role)."""
        return self.role_rel

    @property
    def role_slug(self) -> str:
        """Role slug for permission checks and audit (e.g. admin, corporate, client)."""
        return self.role_rel.slug if self.role_rel else "client"

    def __repr__(self) -> str:
        return f"<User {self.email} (role_id={self.role_id})>"

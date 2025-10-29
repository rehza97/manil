"""
Audit log database models.
Tracks all user actions and system events for security and compliance.
"""
import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import String, DateTime, Text, JSON, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base


class AuditAction(str, Enum):
    """Enumeration of audit action types."""

    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    TWO_FA_ENABLED = "2fa_enabled"
    TWO_FA_DISABLED = "2fa_disabled"

    # CRUD Operations
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"

    # User Management
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_SUSPEND = "user_suspend"
    USER_ACTIVATE = "user_activate"

    # Access Control
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    ROLE_ASSIGN = "role_assign"
    ROLE_REMOVE = "role_remove"

    # System Events
    SYSTEM_ERROR = "system_error"
    SECURITY_ALERT = "security_alert"
    DATA_EXPORT = "data_export"
    CONFIG_CHANGE = "config_change"


class AuditLog(Base):
    """
    Audit log model for tracking all system activities.
    Provides comprehensive audit trail for security and compliance.
    """

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Action Information
    action: Mapped[AuditAction] = mapped_column(
        String(50), nullable=False, index=True
    )
    resource_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # User Information
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_role: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Request Information
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_method: Mapped[str | None] = mapped_column(
        String(10), nullable=True)
    request_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Additional Data
    old_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Status
    success: Mapped[bool] = mapped_column(default=True, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.utcnow(), nullable=False, index=True
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
        doc="System user who created this log entry",
    )
    updated_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who last updated this log entry",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        doc="Soft delete timestamp (NULL if not deleted, audit logs rarely deleted)",
    )
    deleted_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        doc="User who deleted this log entry",
    )

    __table_args__ = (
        Index("idx_audit_user_action", "user_id", "action"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
        Index("idx_audit_created", "created_at"),
    )

    def __repr__(self) -> str:
        """String representation of audit log."""
        return f"<AuditLog {self.action} by {self.user_email} at {self.created_at}>"

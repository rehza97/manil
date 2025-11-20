"""
Settings database models.

Models for role management, permissions, and system configuration.
"""
import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import Boolean, DateTime, String, Text, Integer, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base


# Association table for role-permission many-to-many relationship
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False),
)


class Role(Base):
    """Role model for RBAC."""
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Role hierarchy
    parent_role_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('roles.id', ondelete='SET NULL'),
        nullable=True
    )
    hierarchy_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # System role flag (cannot be deleted/modified)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Custom settings
    settings: Mapped[dict] = mapped_column(JSONB, nullable=True)

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    created_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Relationships
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="selectin"
    )
    parent_role: Mapped["Role | None"] = relationship(
        "Role",
        remote_side=[id],
        back_populates="child_roles",
        lazy="selectin"
    )
    child_roles: Mapped[List["Role"]] = relationship(
        "Role",
        back_populates="parent_role",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Role {self.name} (slug={self.slug})>"


class Permission(Base):
    """Permission model for RBAC."""
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Permission categorization
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # System permission flag (cannot be deleted)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    roles: Mapped[List[Role]] = relationship(
        "Role",
        secondary=role_permissions,
        back_populates="permissions",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Permission {self.name} ({self.resource}:{self.action})>"


class SystemSetting(Base):
    """System settings model."""
    __tablename__ = "system_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    def __repr__(self) -> str:
        return f"<SystemSetting {self.key} (category={self.category})>"

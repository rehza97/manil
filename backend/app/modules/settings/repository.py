"""
Settings repository layer.

Data access layer for roles, permissions, and settings.
"""
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.settings.models import (
    Role,
    Permission,
    SystemSetting,
    UserNotificationPreferences,
    role_permissions,
)


class PermissionRepository:
    """Repository for permission data access."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Permission], int]:
        """Get all permissions with filters."""
        query = select(Permission)

        # Apply filters
        if category:
            query = query.where(Permission.category == category)
        if is_active is not None:
            query = query.where(Permission.is_active == is_active)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Permission.category, Permission.name)

        result = await self.db.execute(query)
        permissions = list(result.scalars().all())

        return permissions, total or 0

    async def get_by_id(self, permission_id: UUID) -> Optional[Permission]:
        """Get permission by ID."""
        query = select(Permission).where(Permission.id == permission_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Permission]:
        """Get permission by slug."""
        query = select(Permission).where(Permission.slug == slug)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_category(self, category: str) -> List[Permission]:
        """Get all permissions in a category."""
        query = select(Permission).where(Permission.category == category).order_by(Permission.name)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, permission: Permission) -> Permission:
        """Create a new permission."""
        self.db.add(permission)
        await self.db.flush()
        await self.db.refresh(permission)
        return permission

    async def update(self, permission: Permission) -> Permission:
        """Update an existing permission."""
        await self.db.flush()
        await self.db.refresh(permission)
        return permission

    async def delete(self, permission: Permission) -> None:
        """Delete a permission."""
        await self.db.delete(permission)
        await self.db.flush()

    async def commit(self) -> None:
        """Commit transaction."""
        await self.db.commit()


class RoleRepository:
    """Repository for role data access."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        parent_role_id: Optional[UUID] = None,
    ) -> Tuple[List[Role], int]:
        """Get all roles with filters."""
        query = select(Role)

        # Apply filters
        if is_active is not None:
            query = query.where(Role.is_active == is_active)
        if parent_role_id:
            query = query.where(Role.parent_role_id == parent_role_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Role.hierarchy_level, Role.name)

        result = await self.db.execute(query)
        roles = list(result.scalars().all())

        return roles, total or 0

    async def get_by_id(self, role_id: UUID) -> Optional[Role]:
        """Get role by ID with permissions."""
        query = select(Role).where(Role.id == role_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Role]:
        """Get role by slug."""
        query = select(Role).where(Role.slug == slug)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, role: Role) -> Role:
        """Create a new role."""
        self.db.add(role)
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def update(self, role: Role) -> Role:
        """Update an existing role."""
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def delete(self, role: Role) -> None:
        """Delete a role."""
        await self.db.delete(role)
        await self.db.flush()

    async def update_permissions(self, role: Role, permissions: List[Permission]) -> Role:
        """Update role permissions."""
        role.permissions = permissions
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def get_role_permissions(self, role_id: UUID) -> List[Permission]:
        """Get all permissions for a role."""
        query = select(Permission).join(role_permissions).where(role_permissions.c.role_id == role_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        """Commit transaction."""
        await self.db.commit()


class SystemSettingRepository:
    """Repository for system settings data access."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        is_public: Optional[bool] = None,
    ) -> Tuple[List[SystemSetting], int]:
        """Get all settings with filters."""
        query = select(SystemSetting)

        # Apply filters
        if category:
            query = query.where(SystemSetting.category == category)
        if is_public is not None:
            query = query.where(SystemSetting.is_public == is_public)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(SystemSetting.category, SystemSetting.key)

        result = await self.db.execute(query)
        settings = list(result.scalars().all())

        return settings, total or 0

    async def get_by_id(self, setting_id: UUID) -> Optional[SystemSetting]:
        """Get setting by ID."""
        query = select(SystemSetting).where(SystemSetting.id == setting_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_key(self, key: str) -> Optional[SystemSetting]:
        """Get setting by key."""
        query = select(SystemSetting).where(SystemSetting.key == key)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, setting: SystemSetting) -> SystemSetting:
        """Create a new setting."""
        self.db.add(setting)
        await self.db.flush()
        await self.db.refresh(setting)
        return setting

    async def update(self, setting: SystemSetting) -> SystemSetting:
        """Update an existing setting."""
        await self.db.flush()
        await self.db.refresh(setting)
        return setting

    async def delete(self, setting: SystemSetting) -> None:
        """Delete a setting."""
        await self.db.delete(setting)
        await self.db.flush()

    async def commit(self) -> None:
        """Commit transaction."""
        await self.db.commit()


class UserNotificationPreferencesRepository:
    """Repository for user notification preferences."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: str) -> Optional[UserNotificationPreferences]:
        """Get preferences for user."""
        query = select(UserNotificationPreferences).where(
            UserNotificationPreferences.user_id == user_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def upsert(self, user_id: str, preferences: dict) -> UserNotificationPreferences:
        """Create or update preferences for user."""
        import uuid
        row = await self.get_by_user_id(user_id)
        if row:
            row.preferences = preferences
            await self.db.flush()
            await self.db.refresh(row)
            return row
        row = UserNotificationPreferences(
            id=uuid.uuid4(),
            user_id=user_id,
            preferences=preferences,
        )
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

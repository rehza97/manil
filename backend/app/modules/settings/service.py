"""
Settings service layer.

Business logic for roles, permissions, and system settings management.
"""
from typing import List, Tuple, Optional, Set
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.settings.models import Role, Permission, SystemSetting
from app.modules.settings.repository import RoleRepository, PermissionRepository, SystemSettingRepository
from app.modules.settings.schemas import (
    RoleCreate,
    RoleUpdate,
    RolePermissionUpdate,
    PermissionCreate,
    PermissionUpdate,
    SystemSettingCreate,
    SystemSettingUpdate,
)
from app.modules.settings.seed_data import SYSTEM_PERMISSIONS, SYSTEM_ROLES, SYSTEM_SETTINGS


class PermissionService:
    """Service for permission management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = PermissionRepository(db)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Permission], int]:
        """Get all permissions with filters."""
        return await self.repository.get_all(
            skip=skip,
            limit=limit,
            category=category,
            is_active=is_active,
        )

    async def get_by_id(self, permission_id: UUID) -> Permission:
        """Get permission by ID."""
        permission = await self.repository.get_by_id(permission_id)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission {permission_id} not found"
            )
        return permission

    async def get_by_category(self, category: str) -> List[Permission]:
        """Get all permissions in a category."""
        return await self.repository.get_by_category(category)

    async def create(self, permission_data: PermissionCreate) -> Permission:
        """Create a new permission."""
        # Check if permission with same slug exists
        existing = await self.repository.get_by_slug(permission_data.slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Permission with slug '{permission_data.slug}' already exists"
            )

        permission = Permission(
            name=permission_data.name,
            slug=permission_data.slug,
            description=permission_data.description,
            category=permission_data.category,
            resource=permission_data.resource,
            action=permission_data.action,
            is_system=permission_data.is_system,
        )

        permission = await self.repository.create(permission)
        await self.repository.commit()
        return permission

    async def update(self, permission_id: UUID, permission_data: PermissionUpdate) -> Permission:
        """Update a permission."""
        permission = await self.get_by_id(permission_id)

        # Check if system permission
        if permission.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify system permission"
            )

        # Update fields
        if permission_data.name is not None:
            permission.name = permission_data.name
        if permission_data.description is not None:
            permission.description = permission_data.description
        if permission_data.is_active is not None:
            permission.is_active = permission_data.is_active

        permission = await self.repository.update(permission)
        await self.repository.commit()
        return permission

    async def delete(self, permission_id: UUID) -> None:
        """Delete a permission."""
        permission = await self.get_by_id(permission_id)

        # Check if system permission
        if permission.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete system permission"
            )

        await self.repository.delete(permission)
        await self.repository.commit()


class RoleService:
    """Service for role management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = RoleRepository(db)
        self.permission_repository = PermissionRepository(db)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        parent_role_id: Optional[UUID] = None,
    ) -> Tuple[List[Role], int]:
        """Get all roles with filters."""
        return await self.repository.get_all(
            skip=skip,
            limit=limit,
            is_active=is_active,
            parent_role_id=parent_role_id,
        )

    async def get_by_id(self, role_id: UUID) -> Role:
        """Get role by ID."""
        role = await self.repository.get_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role {role_id} not found"
            )
        return role

    async def create(self, role_data: RoleCreate, created_by_id: str) -> Role:
        """Create a new role."""
        # Check if role with same slug exists
        existing = await self.repository.get_by_slug(role_data.slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with slug '{role_data.slug}' already exists"
            )

        # Calculate hierarchy level
        hierarchy_level = 0
        if role_data.parent_role_id:
            parent_role = await self.get_by_id(role_data.parent_role_id)
            hierarchy_level = parent_role.hierarchy_level + 1

        # Create role
        role = Role(
            name=role_data.name,
            slug=role_data.slug,
            description=role_data.description,
            parent_role_id=role_data.parent_role_id,
            hierarchy_level=hierarchy_level,
            is_system=role_data.is_system,
            settings=role_data.settings,
            created_by_id=created_by_id,
        )

        # Get and assign permissions
        if role_data.permission_ids:
            permissions = await self._get_permissions_by_ids(role_data.permission_ids)
            role.permissions = permissions

        role = await self.repository.create(role)
        await self.repository.commit()
        return role

    async def update(self, role_id: UUID, role_data: RoleUpdate, updated_by_id: str) -> Role:
        """Update a role."""
        role = await self.get_by_id(role_id)

        # Check if system role
        if role.is_system and not role_data.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate system role"
            )

        # Update fields
        if role_data.name is not None:
            role.name = role_data.name
        if role_data.description is not None:
            role.description = role_data.description
        if role_data.is_active is not None:
            role.is_active = role_data.is_active
        if role_data.settings is not None:
            role.settings = role_data.settings

        # Update parent and hierarchy level
        if role_data.parent_role_id is not None:
            # Check for circular reference
            if await self._would_create_cycle(role_id, role_data.parent_role_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot set parent role: would create circular reference"
                )

            parent_role = await self.get_by_id(role_data.parent_role_id)
            role.parent_role_id = role_data.parent_role_id
            role.hierarchy_level = parent_role.hierarchy_level + 1

        role.updated_by_id = updated_by_id
        role = await self.repository.update(role)
        await self.repository.commit()
        return role

    async def delete(self, role_id: UUID) -> None:
        """Delete a role."""
        role = await self.get_by_id(role_id)

        # Check if system role
        if role.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete system role"
            )

        # Check if role has child roles
        if role.child_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete role with child roles. Delete or reassign child roles first."
            )

        await self.repository.delete(role)
        await self.repository.commit()

    async def update_permissions(
        self,
        role_id: UUID,
        permission_update: RolePermissionUpdate,
        updated_by_id: str
    ) -> Role:
        """Update role permissions."""
        role = await self.get_by_id(role_id)

        # Get permissions
        permissions = await self._get_permissions_by_ids(permission_update.permission_ids)

        # Update role permissions
        role = await self.repository.update_permissions(role, permissions)
        role.updated_by_id = updated_by_id
        await self.repository.commit()
        return role

    async def get_role_permissions(self, role_id: UUID, include_inherited: bool = True) -> Set[str]:
        """
        Get all permission slugs for a role.

        Args:
            role_id: Role ID
            include_inherited: Include permissions from parent roles

        Returns:
            Set of permission slugs
        """
        role = await self.get_by_id(role_id)
        permission_slugs = {p.slug for p in role.permissions}

        # Include inherited permissions from parent roles
        if include_inherited and role.parent_role_id:
            parent_permissions = await self.get_role_permissions(role.parent_role_id, include_inherited=True)
            permission_slugs.update(parent_permissions)

        return permission_slugs

    async def _get_permissions_by_ids(self, permission_ids: List[UUID]) -> List[Permission]:
        """Get permissions by IDs."""
        permissions = []
        for perm_id in permission_ids:
            permission = await self.permission_repository.get_by_id(perm_id)
            if not permission:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Permission {perm_id} not found"
                )
            permissions.append(permission)
        return permissions

    async def _would_create_cycle(self, role_id: UUID, parent_role_id: UUID) -> bool:
        """Check if setting parent would create a circular reference."""
        current_id = parent_role_id
        visited = {role_id}

        while current_id:
            if current_id in visited:
                return True
            visited.add(current_id)

            role = await self.repository.get_by_id(current_id)
            if not role:
                break
            current_id = role.parent_role_id

        return False


class SystemSettingService:
    """Service for system settings management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = SystemSettingRepository(db)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        is_public: Optional[bool] = None,
    ) -> Tuple[List[SystemSetting], int]:
        """Get all settings with filters."""
        return await self.repository.get_all(
            skip=skip,
            limit=limit,
            category=category,
            is_public=is_public,
        )

    async def get_by_key(self, key: str) -> SystemSetting:
        """Get setting by key."""
        setting = await self.repository.get_by_key(key)
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting '{key}' not found"
            )
        return setting

    async def create(self, setting_data: SystemSettingCreate, created_by_id: str) -> SystemSetting:
        """Create a new setting."""
        # Check if setting with same key exists
        existing = await self.repository.get_by_key(setting_data.key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Setting with key '{setting_data.key}' already exists"
            )

        setting = SystemSetting(
            key=setting_data.key,
            value=setting_data.value,
            category=setting_data.category,
            description=setting_data.description,
            is_public=setting_data.is_public,
            updated_by_id=created_by_id,
        )

        setting = await self.repository.create(setting)
        await self.repository.commit()
        return setting

    async def update(self, key: str, setting_data: SystemSettingUpdate, updated_by_id: str) -> SystemSetting:
        """Update a setting."""
        setting = await self.get_by_key(key)

        # Update fields
        if setting_data.value is not None:
            setting.value = setting_data.value
        if setting_data.description is not None:
            setting.description = setting_data.description
        if setting_data.is_public is not None:
            setting.is_public = setting_data.is_public

        setting.updated_by_id = updated_by_id
        setting = await self.repository.update(setting)
        await self.repository.commit()
        return setting

    async def delete(self, key: str) -> None:
        """Delete a setting."""
        setting = await self.get_by_key(key)
        await self.repository.delete(setting)
        await self.repository.commit()


async def seed_permissions_and_roles(db: AsyncSession) -> bool:
    """
    Seed database with default permissions and roles.

    This function is idempotent - it will skip creating permissions/roles
    that already exist (based on slug).

    Args:
        db: Database session

    Returns:
        True if seeding was successful, False otherwise
    """
    try:
        permission_repo = PermissionRepository(db)
        role_repo = RoleRepository(db)

        # Step 1: Create permissions
        permission_map = {}  # slug -> Permission object
        for perm_data in SYSTEM_PERMISSIONS:
            # Check if permission already exists
            existing = await permission_repo.get_by_slug(perm_data["slug"])
            if existing:
                permission_map[perm_data["slug"]] = existing
                continue

            # Create new permission
            permission = Permission(
                name=perm_data["name"],
                slug=perm_data["slug"],
                description=perm_data["description"],
                category=perm_data["category"],
                resource=perm_data["resource"],
                action=perm_data["action"],
                is_system=True,  # System permissions cannot be deleted
            )
            permission = await permission_repo.create(permission)
            permission_map[perm_data["slug"]] = permission

        await db.commit()

        # Step 2: Create roles
        role_map = {}  # slug -> Role object
        for role_data in SYSTEM_ROLES:
            # Check if role already exists
            existing = await role_repo.get_by_slug(role_data["slug"])
            if existing:
                role_map[role_data["slug"]] = existing
                continue

            # Create new role
            role = Role(
                name=role_data["name"],
                slug=role_data["slug"],
                description=role_data["description"],
                is_system=role_data["is_system"],
                hierarchy_level=role_data["hierarchy_level"],
            )

            # Assign permissions to role
            role_permissions = [
                permission_map[perm_slug]
                for perm_slug in role_data["permissions"]
                if perm_slug in permission_map
            ]
            role.permissions = role_permissions

            role = await role_repo.create(role)
            role_map[role_data["slug"]] = role

        await db.commit()
        print(f"✅ Seeded {len(permission_map)} permissions and {len(role_map)} roles")
        return True

    except Exception as e:
        print(f"❌ Error seeding permissions and roles: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return False


async def seed_system_settings(db: AsyncSession) -> bool:
    """
    Seed database with default system settings.

    This function is idempotent - it will skip creating settings
    that already exist (based on key).

    Args:
        db: Database session

    Returns:
        True if seeding was successful, False otherwise
    """
    try:
        setting_repo = SystemSettingRepository(db)

        settings_created = 0
        settings_skipped = 0

        for setting_data in SYSTEM_SETTINGS:
            # Check if setting already exists
            existing = await setting_repo.get_by_key(setting_data["key"])
            if existing:
                settings_skipped += 1
                continue

            # Create new setting
            setting = SystemSetting(
                key=setting_data["key"],
                value=setting_data["value"],
                category=setting_data["category"],
                description=setting_data["description"],
                is_public=setting_data["is_public"],
            )

            await setting_repo.create(setting)
            settings_created += 1

        await db.commit()
        print(f"✅ Seeded {settings_created} system settings (skipped {settings_skipped} existing)")
        return True

    except Exception as e:
        print(f"❌ Error seeding system settings: {e}")
        import traceback
        traceback.print_exc()
        await db.rollback()
        return False

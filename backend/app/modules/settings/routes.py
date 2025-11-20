"""
Settings API routes.

Endpoints for role management, permissions, and system settings.
"""
from typing import Optional
from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.modules.auth.models import User
from app.core.permissions import Permission as PermissionEnum
from app.modules.settings.service import RoleService, PermissionService, SystemSettingService
from app.modules.settings.schemas import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleListResponse,
    RolePermissionUpdate,
    PermissionCreate,
    PermissionUpdate,
    PermissionResponse,
    PermissionCategory,
    PermissionCategoryList,
    SystemSettingCreate,
    SystemSettingUpdate,
    SystemSettingResponse,
)

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


# ============================================================================
# Permission Endpoints
# ============================================================================

@router.get("/permissions", response_model=dict)
async def get_permissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_VIEW))
):
    """Get all permissions with filters."""
    service = PermissionService(db)
    permissions, total = await service.get_all(
        skip=skip,
        limit=limit,
        category=category,
        is_active=is_active,
    )

    return {
        "permissions": permissions,
        "total": total,
        "page": (skip // limit) + 1,
        "page_size": limit,
        "total_pages": ceil(total / limit) if total > 0 else 0,
    }


@router.get("/permissions/categories", response_model=PermissionCategoryList)
async def get_permissions_by_category(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_VIEW))
):
    """Get permissions grouped by category."""
    service = PermissionService(db)
    permissions, _ = await service.get_all(limit=1000)

    # Group by category
    categories_dict = {}
    for perm in permissions:
        if perm.category not in categories_dict:
            categories_dict[perm.category] = []
        categories_dict[perm.category].append(perm)

    categories = [
        PermissionCategory(category=cat, permissions=perms)
        for cat, perms in sorted(categories_dict.items())
    ]

    return PermissionCategoryList(categories=categories)


@router.get("/permissions/{permission_id}", response_model=PermissionResponse)
async def get_permission(
    permission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_VIEW))
):
    """Get permission by ID."""
    service = PermissionService(db)
    return await service.get_by_id(permission_id)


@router.post("/permissions", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(
    permission_data: PermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_CREATE))
):
    """Create a new permission."""
    service = PermissionService(db)
    return await service.create(permission_data)


@router.put("/permissions/{permission_id}", response_model=PermissionResponse)
async def update_permission(
    permission_id: UUID,
    permission_data: PermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_EDIT))
):
    """Update a permission."""
    service = PermissionService(db)
    return await service.update(permission_id, permission_data)


@router.delete("/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_permission(
    permission_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_DELETE))
):
    """Delete a permission."""
    service = PermissionService(db)
    await service.delete(permission_id)


# ============================================================================
# Role Endpoints
# ============================================================================

@router.get("/roles", response_model=RoleListResponse)
async def get_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    parent_role_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_VIEW))
):
    """Get all roles with filters."""
    service = RoleService(db)
    roles, total = await service.get_all(
        skip=skip,
        limit=limit,
        is_active=is_active,
        parent_role_id=parent_role_id,
    )

    return RoleListResponse(
        roles=roles,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=ceil(total / limit) if total > 0 else 0,
    )


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_VIEW))
):
    """Get role by ID."""
    service = RoleService(db)
    return await service.get_by_id(role_id)


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_CREATE))
):
    """Create a new role."""
    service = RoleService(db)
    return await service.create(role_data, created_by_id=current_user.id)


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    role_data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_EDIT))
):
    """Update a role."""
    service = RoleService(db)
    return await service.update(role_id, role_data, updated_by_id=current_user.id)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_DELETE))
):
    """Delete a role."""
    service = RoleService(db)
    await service.delete(role_id)


@router.put("/roles/{role_id}/permissions", response_model=RoleResponse)
async def update_role_permissions(
    role_id: UUID,
    permission_update: RolePermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_EDIT))
):
    """Update role permissions."""
    service = RoleService(db)
    return await service.update_permissions(role_id, permission_update, updated_by_id=current_user.id)


@router.get("/roles/{role_id}/permissions", response_model=dict)
async def get_role_permissions(
    role_id: UUID,
    include_inherited: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.ROLES_VIEW))
):
    """Get all permissions for a role."""
    service = RoleService(db)
    permission_slugs = await service.get_role_permissions(role_id, include_inherited=include_inherited)
    return {
        "role_id": str(role_id),
        "permissions": list(permission_slugs),
        "count": len(permission_slugs),
        "include_inherited": include_inherited,
    }


# ============================================================================
# System Settings Endpoints
# ============================================================================

@router.get("/system", response_model=dict)
async def get_system_settings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.SETTINGS_VIEW))
):
    """Get system settings with filters."""
    service = SystemSettingService(db)
    settings, total = await service.get_all(
        skip=skip,
        limit=limit,
        category=category,
        is_public=is_public,
    )

    return {
        "settings": settings,
        "total": total,
        "page": (skip // limit) + 1,
        "page_size": limit,
        "total_pages": ceil(total / limit) if total > 0 else 0,
    }


@router.get("/system/public", response_model=dict)
async def get_public_settings(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get public system settings (no authentication required)."""
    service = SystemSettingService(db)
    settings, _ = await service.get_all(
        limit=1000,
        category=category,
        is_public=True,
    )
    return {"settings": settings}


@router.get("/system/{key}", response_model=SystemSettingResponse)
async def get_system_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.SETTINGS_VIEW))
):
    """Get system setting by key."""
    service = SystemSettingService(db)
    return await service.get_by_key(key)


@router.post("/system", response_model=SystemSettingResponse, status_code=status.HTTP_201_CREATED)
async def create_system_setting(
    setting_data: SystemSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.SETTINGS_EDIT))
):
    """Create a new system setting."""
    service = SystemSettingService(db)
    return await service.create(setting_data, created_by_id=current_user.id)


@router.put("/system/{key}", response_model=SystemSettingResponse)
async def update_system_setting(
    key: str,
    setting_data: SystemSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.SETTINGS_EDIT))
):
    """Update a system setting."""
    service = SystemSettingService(db)
    return await service.update(key, setting_data, updated_by_id=current_user.id)


@router.delete("/system/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_system_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionEnum.SETTINGS_EDIT))
):
    """Delete a system setting."""
    service = SystemSettingService(db)
    await service.delete(key)

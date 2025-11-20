"""
Settings schemas.

Pydantic models for role management, permissions, and settings.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Permission Schemas
# ============================================================================

class PermissionBase(BaseModel):
    """Base permission schema."""
    name: str = Field(..., min_length=3, max_length=100)
    slug: str = Field(..., min_length=3, max_length=100, pattern=r'^[a-z_:]+$')
    description: Optional[str] = None
    category: str = Field(..., min_length=2, max_length=50)
    resource: str = Field(..., min_length=2, max_length=50)
    action: str = Field(..., min_length=2, max_length=50)


class PermissionCreate(PermissionBase):
    """Create permission schema."""
    is_system: bool = False


class PermissionUpdate(BaseModel):
    """Update permission schema."""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PermissionResponse(PermissionBase):
    """Permission response schema."""
    id: UUID
    is_system: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Role Schemas
# ============================================================================

class RoleBase(BaseModel):
    """Base role schema."""
    name: str = Field(..., min_length=3, max_length=100)
    slug: str = Field(..., min_length=3, max_length=100, pattern=r'^[a-z_]+$')
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Create role schema."""
    parent_role_id: Optional[UUID] = None
    permission_ids: List[UUID] = Field(default_factory=list)
    settings: Optional[Dict[str, Any]] = None
    is_system: bool = False


class RoleUpdate(BaseModel):
    """Update role schema."""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    parent_role_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class RolePermissionUpdate(BaseModel):
    """Update role permissions schema."""
    permission_ids: List[UUID]


class RoleResponse(RoleBase):
    """Role response schema."""
    id: UUID
    parent_role_id: Optional[UUID]
    hierarchy_level: int
    is_system: bool
    is_active: bool
    settings: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionResponse] = []

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    """Role list response schema."""
    roles: List[RoleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# System Settings Schemas
# ============================================================================

class SystemSettingBase(BaseModel):
    """Base system setting schema."""
    key: str = Field(..., min_length=3, max_length=100, pattern=r'^[a-z_\.]+$')
    value: Dict[str, Any]
    category: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_public: bool = False


class SystemSettingCreate(SystemSettingBase):
    """Create system setting schema."""
    pass


class SystemSettingUpdate(BaseModel):
    """Update system setting schema."""
    value: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class SystemSettingResponse(SystemSettingBase):
    """System setting response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    updated_by_id: Optional[str]

    class Config:
        from_attributes = True


# ============================================================================
# Permission Categories
# ============================================================================

class PermissionCategory(BaseModel):
    """Permission category schema."""
    category: str
    permissions: List[PermissionResponse]


class PermissionCategoryList(BaseModel):
    """Permission category list schema."""
    categories: List[PermissionCategory]

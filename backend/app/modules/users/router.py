"""
User Management API routes.
Admin-only endpoints for managing users.
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_active_user, require_permission
from app.core.permissions import Permission
from app.modules.users.service import UserManagementService
from app.modules.users.schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    UserDetailResponse,
    UserListResponse,
    UserStatusUpdate,
    RoleAssignment,
    UserStats,
    UserSessionListResponse,
    UserActivityListResponse,
)

router = APIRouter(prefix="/users", tags=["User Management"])

# Admin-only dependency - using USERS_VIEW as admin-only permission for user management
require_admin = require_permission(Permission.USERS_VIEW)


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in name and email"),
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    List all users (admin only).

    Supports pagination and filtering:
    - Filter by role (admin, corporate, client)
    - Filter by active status
    - Search by name or email

    Returns:
        Paginated list of users
    """
    service = UserManagementService(db)
    return await service.list_users(
        page=page,
        limit=limit,
        role=role,
        is_active=is_active,
        search=search,
    )


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get user details by ID (admin only).

    Args:
        user_id: User ID

    Returns:
        User details
    """
    service = UserManagementService(db)
    return await service.get_user(user_id)


@router.post("", response_model=UserDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: AdminUserCreate,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Create a new user (admin only).

    Args:
        user_data: User creation data

    Returns:
        Created user
    """
    service = UserManagementService(db)
    return await service.create_user(user_data, current_user.id)


@router.put("/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: str,
    user_data: AdminUserUpdate,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Update user information (admin only).

    Args:
        user_id: User ID
        user_data: Update data

    Returns:
        Updated user
    """
    service = UserManagementService(db)
    return await service.update_user(user_id, user_data, current_user.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Delete user (soft delete, admin only).

    Args:
        user_id: User ID

    Returns:
        No content
    """
    service = UserManagementService(db)
    await service.delete_user(user_id, current_user.id)


@router.patch("/{user_id}/status", response_model=UserDetailResponse)
async def update_user_status(
    user_id: str,
    status_data: UserStatusUpdate,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Activate or deactivate user account (admin only).

    Args:
        user_id: User ID
        status_data: Status update data

    Returns:
        Updated user
    """
    service = UserManagementService(db)
    if status_data.is_active:
        return await service.activate_user(user_id)
    else:
        return await service.deactivate_user(user_id)


@router.post("/{user_id}/unlock", response_model=UserDetailResponse)
async def unlock_user_account(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Unlock locked user account (admin only).

    Resets failed login attempts and removes account lock.

    Args:
        user_id: User ID

    Returns:
        Updated user
    """
    service = UserManagementService(db)
    return await service.unlock_account(user_id)


@router.put("/{user_id}/roles", response_model=UserDetailResponse)
async def assign_user_role(
    user_id: str,
    role_data: RoleAssignment,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Assign role to user (admin only).

    Args:
        user_id: User ID
        role_data: Role assignment data

    Returns:
        Updated user
    """
    service = UserManagementService(db)
    return await service.assign_role(user_id, role_data.role.value)


@router.post("/{user_id}/password-reset", status_code=status.HTTP_204_NO_CONTENT)
async def force_password_reset(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Force password reset for user (admin only).

    Sends password reset email to the user.

    Args:
        user_id: User ID

    Returns:
        No content
    """
    service = UserManagementService(db)
    await service.force_password_reset(user_id)


@router.get("/{user_id}/stats", response_model=UserStats)
async def get_user_statistics(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get user statistics (admin only).

    Returns various statistics about the user:
    - Total logins
    - Failed logins
    - Last login
    - Active sessions
    - Total actions
    - Account age

    Args:
        user_id: User ID

    Returns:
        User statistics
    """
    service = UserManagementService(db)
    return await service.get_user_stats(user_id)


@router.get("/{user_id}/sessions", response_model=UserSessionListResponse)
async def get_user_sessions(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get all active sessions for a user (admin only).

    Args:
        user_id: User ID

    Returns:
        List of user sessions
    """
    service = UserManagementService(db)
    return await service.get_user_sessions(user_id)


@router.delete("/{user_id}/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_user_session(
    user_id: str,
    session_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Revoke a specific user session (admin only).

    Args:
        user_id: User ID
        session_id: Session ID to revoke

    Returns:
        No content
    """
    service = UserManagementService(db)
    await service.revoke_session(user_id, session_id)


@router.delete("/{user_id}/sessions", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_all_user_sessions(
    user_id: str,
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Revoke all user sessions (admin only).

    Args:
        user_id: User ID

    Returns:
        No content
    """
    service = UserManagementService(db)
    await service.revoke_all_sessions(user_id)


@router.get("/{user_id}/activity", response_model=UserActivityListResponse)
async def get_user_activity(
    user_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user = Depends(require_admin),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get user activity logs (admin only).

    Returns paginated activity logs for the user.

    Args:
        user_id: User ID
        page: Page number
        limit: Items per page

    Returns:
        Paginated user activity
    """
    service = UserManagementService(db)
    return await service.get_user_activity(user_id, page, limit)

"""
FastAPI dependency injection utilities.
Includes authentication and authorization dependencies.
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.permissions import Permission, has_permission, has_any_permission

security = HTTPBearer()


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> str:
    """
    Get current user ID from JWT token.

    Args:
        credentials: HTTP Bearer credentials

    Returns:
        User ID from token

    Raises:
        UnauthorizedException: If token is invalid
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise UnauthorizedException("Invalid authentication credentials")

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException("Invalid token payload")

    return user_id


async def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get current authenticated user from database.

    Args:
        user_id: User ID from token
        db: Database session

    Returns:
        User object

    Raises:
        UnauthorizedException: If user not found
    """
    from app.modules.auth.models import User
    from app.modules.auth.repository import UserRepository

    repository = UserRepository(db)
    user = await repository.get_by_id(user_id)

    if not user:
        raise UnauthorizedException("User not found")

    return user


async def get_current_active_user(
    current_user: Annotated["User", Depends(get_current_user)],  # type: ignore
):
    """
    Get current active user.

    Args:
        current_user: Current user from get_current_user

    Returns:
        User object if active

    Raises:
        ForbiddenException: If user is not active
    """
    if not current_user.is_active:
        raise ForbiddenException("Inactive user")

    return current_user


def require_role(allowed_roles: list[str]):
    """
    Dependency factory to require specific roles.

    Args:
        allowed_roles: List of allowed role names

    Returns:
        Dependency function

    Example:
        @router.get("/admin")
        async def admin_route(
            user = Depends(require_role(["admin"]))
        ):
            return {"message": "Admin access"}
    """

    async def role_checker(
        current_user: Annotated["User", Depends(get_current_active_user)],  # type: ignore
    ):
        """Check if user has required role."""
        if current_user.role.value not in allowed_roles:
            raise ForbiddenException("Insufficient permissions")

        return current_user

    return role_checker


def require_permission(permission: Permission):
    """
    Dependency factory to require specific permission.

    Args:
        permission: Required permission

    Returns:
        Dependency function

    Example:
        @router.delete("/items/{id}")
        async def delete_item(
            user = Depends(require_permission(Permission.ITEMS_DELETE))
        ):
            return {"message": "Item deleted"}
    """

    async def permission_checker(
        current_user: Annotated["User", Depends(get_current_active_user)],  # type: ignore
    ):
        """Check if user has required permission."""
        if not has_permission(current_user.role.value, permission):
            raise ForbiddenException("Insufficient permissions")

        return current_user

    return permission_checker


def require_any_permission(permissions: list[Permission]):
    """
    Dependency factory to require any of the specified permissions.

    Args:
        permissions: List of permissions (user needs at least one)

    Returns:
        Dependency function
    """

    async def permission_checker(
        current_user: Annotated["User", Depends(get_current_active_user)],  # type: ignore
    ):
        """Check if user has any of the required permissions."""
        if not has_any_permission(current_user.role.value, permissions):
            raise ForbiddenException("Insufficient permissions")

        return current_user

    return permission_checker


def require_admin(user):
    """
    Check if user is an admin.

    Args:
        user: User object to check

    Raises:
        ForbiddenException: If user is not an admin
    """
    if user.role.value != "admin":
        raise ForbiddenException("Admin access required")

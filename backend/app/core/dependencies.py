"""
FastAPI dependency injection utilities.
Includes authentication and authorization dependencies.
"""
import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.permissions import Permission, has_permission, has_any_permission

logger = logging.getLogger(__name__)
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
        # type: ignore
        current_user: Annotated["User", Depends(get_current_active_user)],
    ):
        """Check if user has required role."""
        if current_user.role_slug not in allowed_roles:
            raise ForbiddenException("Insufficient permissions")

        return current_user

    return role_checker


def require_permission(permission: Permission):
    """
    Dependency factory to require specific permission.
    Uses DB-backed role permissions when available; falls back to ROLE_PERMISSIONS.
    """

    async def permission_checker(
        # type: ignore
        current_user: Annotated["User", Depends(get_current_active_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ):
        from app.modules.settings.utils import get_role_permission_slugs_by_id_cached, get_role_permission_slugs_cached

        user_info = f"user_id={current_user.id}, email={current_user.email}, role={current_user.role_slug}, role_id={current_user.role_id}"
        permission_source = None

        # Try to get permissions from DB by role_id
        slugs = await get_role_permission_slugs_by_id_cached(db, str(current_user.role_id))
        if slugs is not None:
            logger.info(f"[PERMISSION CHECK] Using DB permissions (by role_id) | {user_info} | permission={permission.value} | found {len(slugs)} permissions in DB")
            permission_source = "DB (by role_id)"

        # If not found, try by role_slug
        if slugs is None:
            slugs = await get_role_permission_slugs_cached(db, current_user.role_slug)
            if slugs is not None:
                logger.info(f"[PERMISSION CHECK] Using DB permissions (by role_slug) | {user_info} | permission={permission.value} | found {len(slugs)} permissions in DB")
                permission_source = "DB (by role_slug)"

        # Empty list means no permissions in DB
        if slugs is not None and len(slugs) == 0:
            logger.warning(f"[PERMISSION CHECK] DB returned empty permissions list | {user_info} | falling back to hardcoded")
            slugs = None

        # Check permission
        if slugs is not None:
            allowed = permission.value in slugs
            logger.info(f"[PERMISSION CHECK] DB check | {user_info} | permission={permission.value} | source={permission_source} | result={'GRANTED' if allowed else 'DENIED'}")
        else:
            # Fallback to hardcoded permissions
            allowed = has_permission(current_user.role_slug, permission)
            permission_source = "HARDCODED (ROLE_PERMISSIONS)"
            logger.info(f"[PERMISSION CHECK] Hardcoded fallback | {user_info} | permission={permission.value} | source={permission_source} | result={'GRANTED' if allowed else 'DENIED'}")

        if not allowed:
            logger.warning(f"[PERMISSION DENIED] {user_info} | permission={permission.value} | source={permission_source}")
            raise ForbiddenException("Insufficient permissions")

        return current_user

    return permission_checker


def require_any_permission(permissions: list[Permission]):
    """
    Dependency factory to require any of the specified permissions.
    Uses DB-backed role permissions when available; falls back to ROLE_PERMISSIONS.
    """

    async def permission_checker(
        # type: ignore
        current_user: Annotated["User", Depends(get_current_active_user)],
        db: Annotated[AsyncSession, Depends(get_db)],
    ):
        from app.modules.settings.utils import get_role_permission_slugs_by_id_cached, get_role_permission_slugs_cached

        user_info = f"user_id={current_user.id}, email={current_user.email}, role={current_user.role_slug}, role_id={current_user.role_id}"
        permission_list = [p.value for p in permissions]
        permission_source = None

        # Try to get permissions from DB by role_id
        slugs = await get_role_permission_slugs_by_id_cached(db, str(current_user.role_id))
        if slugs is not None:
            logger.info(f"[PERMISSION CHECK ANY] Using DB permissions (by role_id) | {user_info} | permissions={permission_list} | found {len(slugs)} permissions in DB")
            permission_source = "DB (by role_id)"

        # If not found, try by role_slug
        if slugs is None:
            slugs = await get_role_permission_slugs_cached(db, current_user.role_slug)
            if slugs is not None:
                logger.info(f"[PERMISSION CHECK ANY] Using DB permissions (by role_slug) | {user_info} | permissions={permission_list} | found {len(slugs)} permissions in DB")
                permission_source = "DB (by role_slug)"

        # Empty list means no permissions in DB
        if slugs is not None and len(slugs) == 0:
            logger.warning(f"[PERMISSION CHECK ANY] DB returned empty permissions list | {user_info} | falling back to hardcoded")
            slugs = None

        # Check permissions
        if slugs is not None:
            allowed = any(p.value in slugs for p in permissions)
            matched_perms = [p.value for p in permissions if p.value in slugs]
            logger.info(f"[PERMISSION CHECK ANY] DB check | {user_info} | permissions={permission_list} | matched={matched_perms} | source={permission_source} | result={'GRANTED' if allowed else 'DENIED'}")
        else:
            # Fallback to hardcoded permissions
            allowed = has_any_permission(current_user.role_slug, permissions)
            permission_source = "HARDCODED (ROLE_PERMISSIONS)"
            logger.info(f"[PERMISSION CHECK ANY] Hardcoded fallback | {user_info} | permissions={permission_list} | source={permission_source} | result={'GRANTED' if allowed else 'DENIED'}")

        if not allowed:
            logger.warning(f"[PERMISSION DENIED ANY] {user_info} | permissions={permission_list} | source={permission_source}")
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
    if user.role_slug != "admin":
        raise ForbiddenException("Admin access required")

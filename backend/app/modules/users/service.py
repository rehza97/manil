"""
User Management Service.
Business logic for admin user management operations.
"""
from datetime import datetime
from typing import Optional
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.modules.auth.repository import UserRepository
from app.modules.auth.models import User
from app.modules.users.schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    UserListResponse,
    UserDetailResponse,
    UserStats,
)


class UserManagementService:
    """Service for user management operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = UserRepository(db)

    async def list_users(
        self,
        page: int = 1,
        limit: int = 20,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> UserListResponse:
        """
        List users with pagination and filters.

        Args:
            page: Page number
            limit: Items per page
            role: Filter by role
            is_active: Filter by active status
            search: Search term

        Returns:
            Paginated user list
        """
        users, total = await self.repository.list_users(
            page=page,
            limit=limit,
            role=role,
            is_active=is_active,
            search=search,
        )

        total_pages = ceil(total / limit) if total > 0 else 0

        return UserListResponse(
            users=[UserDetailResponse.model_validate(user) for user in users],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    async def get_user(self, user_id: str) -> UserDetailResponse:
        """
        Get user by ID.

        Args:
            user_id: User ID

        Returns:
            User details

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return UserDetailResponse.model_validate(user)

    async def create_user(
        self, user_data: AdminUserCreate, created_by: str
    ) -> UserDetailResponse:
        """
        Create a new user (admin only).

        Args:
            user_data: User creation data
            created_by: ID of admin creating user

        Returns:
            Created user

        Raises:
            HTTPException: If email already exists
        """
        # Check if email already exists
        existing_user = await self.repository.get_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Hash password
        password_hash = get_password_hash(user_data.password)

        # Create user (we'll need to modify repository.create to accept more fields)
        from app.modules.auth.schemas import UserCreate

        basic_user_data = UserCreate(
            email=user_data.email,
            full_name=user_data.full_name,
            password=user_data.password,
            role=user_data.role,
        )

        user = await self.repository.create(basic_user_data, password_hash)

        # Set additional fields
        user.is_active = user_data.is_active
        user.created_by = created_by
        await self.db.commit()
        await self.db.refresh(user)

        return UserDetailResponse.model_validate(user)

    async def update_user(
        self, user_id: str, user_data: AdminUserUpdate, updated_by: str
    ) -> UserDetailResponse:
        """
        Update user information.

        Args:
            user_id: User ID
            user_data: Update data
            updated_by: ID of admin updating user

        Returns:
            Updated user

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Update fields
        update_dict = user_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(user, field, value)

        user.updated_by = updated_by
        await self.db.commit()
        await self.db.refresh(user)

        return UserDetailResponse.model_validate(user)

    async def delete_user(self, user_id: str, deleted_by: str) -> None:
        """
        Soft delete a user.

        Args:
            user_id: User ID
            deleted_by: ID of admin deleting user

        Raises:
            HTTPException: If user not found or trying to delete self
        """
        if user_id == deleted_by:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account",
            )

        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        await self.repository.soft_delete(user, deleted_by)

    async def activate_user(self, user_id: str) -> UserDetailResponse:
        """
        Activate user account.

        Args:
            user_id: User ID

        Returns:
            Updated user

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = await self.repository.activate_user(user)
        return UserDetailResponse.model_validate(user)

    async def deactivate_user(self, user_id: str) -> UserDetailResponse:
        """
        Deactivate user account.

        Args:
            user_id: User ID

        Returns:
            Updated user

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = await self.repository.deactivate_user(user)
        return UserDetailResponse.model_validate(user)

    async def unlock_account(self, user_id: str) -> UserDetailResponse:
        """
        Unlock locked user account.

        Args:
            user_id: User ID

        Returns:
            Updated user

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = await self.repository.unlock_account(user)
        return UserDetailResponse.model_validate(user)

    async def assign_role(self, user_id: str, role: str) -> UserDetailResponse:
        """
        Assign role to user.

        Args:
            user_id: User ID
            role: New role

        Returns:
            Updated user

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = await self.repository.assign_role(user, role)
        return UserDetailResponse.model_validate(user)

    async def force_password_reset(self, user_id: str) -> None:
        """
        Force password reset for user (sends email).

        Args:
            user_id: User ID

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # TODO: Generate password reset token and send email
        # For now, this is a placeholder
        # from app.modules.auth.service import AuthService
        # auth_service = AuthService(self.db)
        # await auth_service.request_password_reset(user.email)

    async def get_user_stats(self, user_id: str) -> UserStats:
        """
        Get user statistics.

        Args:
            user_id: User ID

        Returns:
            User statistics

        Raises:
            HTTPException: If user not found
        """
        from sqlalchemy import select, func
        from app.modules.audit.models import AuditLog
        from app.modules.auth.session import SessionData

        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Calculate account age
        account_age = (datetime.utcnow() - user.created_at).days

        # Count total actions from audit log
        total_actions_query = select(func.count()).where(
            AuditLog.user_id == user_id
        )
        total_actions_result = await self.db.execute(total_actions_query)
        total_actions = total_actions_result.scalar() or 0

        # TODO: Get session count from session storage (Redis)
        # For now, returning placeholder
        active_sessions = 0

        return UserStats(
            total_logins=0,  # TODO: Calculate from audit log
            failed_logins=user.failed_login_attempts,
            last_login=user.last_login_at,
            active_sessions=active_sessions,
            total_actions=total_actions,
            account_age_days=account_age,
        )

    async def get_user_sessions(self, user_id: str):
        """
        Get all active sessions for a user.

        Args:
            user_id: User ID

        Returns:
            UserSessionListResponse with list of sessions

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # TODO: Implement session tracking in Redis/database
        # For now, return empty list
        from app.modules.users.schemas import UserSessionListResponse
        return UserSessionListResponse(data=[], total=0)

    async def revoke_session(self, user_id: str, session_id: str):
        """
        Revoke a specific user session.

        Args:
            user_id: User ID
            session_id: Session ID to revoke

        Raises:
            HTTPException: If user or session not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # TODO: Implement session revocation in Redis/database
        # For now, this is a placeholder
        pass

    async def revoke_all_sessions(self, user_id: str):
        """
        Revoke all user sessions.

        Args:
            user_id: User ID

        Raises:
            HTTPException: If user not found
        """
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # TODO: Implement session revocation in Redis/database
        # For now, this is a placeholder
        pass

    async def get_user_activity(self, user_id: str, page: int = 1, limit: int = 20):
        """
        Get user activity logs.

        Args:
            user_id: User ID
            page: Page number
            limit: Items per page

        Returns:
            UserActivityListResponse with paginated activity logs

        Raises:
            HTTPException: If user not found
        """
        from sqlalchemy import select
        from app.modules.audit.models import AuditLog
        from app.modules.users.schemas import UserActivity, UserActivityListResponse

        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Query audit logs
        offset = (page - 1) * limit
        query = (
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(query)
        logs = result.scalars().all()

        # Count total
        from sqlalchemy import func
        count_query = select(func.count()).where(AuditLog.user_id == user_id)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Convert to UserActivity format
        activities = [
            UserActivity(
                id=log.id,
                user_id=log.user_id or user_id,
                action=log.action,
                resource_type=log.resource_type or "unknown",
                resource_id=log.resource_id,
                description=log.description or f"{log.action} on {log.resource_type}",
                ip_address=log.ip_address or "unknown",
                user_agent=log.user_agent or "unknown",
                success=log.success,
                error_message=log.error_message,
                created_at=log.created_at,
            )
            for log in logs
        ]

        return UserActivityListResponse(
            data=activities,
            total=total,
            page=page,
            page_size=limit,
        )

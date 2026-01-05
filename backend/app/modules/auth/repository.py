"""
Authentication data access layer.
Handles all database operations for users.
"""
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate, UserUpdate


class UserRepository:
    """User repository for database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """
        Get user by ID.

        Args:
            user_id: User ID

        Returns:
            User object or None
        """
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.

        Args:
            email: User email

        Returns:
            User object or None
        """
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_data: UserCreate, password_hash: str) -> User:
        """
        Create a new user.

        Args:
            user_data: User creation data
            password_hash: Hashed password

        Returns:
            Created user object
        """
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            password_hash=password_hash,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, user_data: UserUpdate) -> User:
        """
        Update user information.

        Args:
            user: User object to update
            user_data: Update data

        Returns:
            Updated user object
        """
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_2fa_secret(self, user: User, secret: str) -> User:
        """
        Update user's 2FA secret.

        Args:
            user: User object
            secret: TOTP secret

        Returns:
            Updated user object
        """
        user.totp_secret = secret
        user.is_2fa_enabled = True
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def disable_2fa(self, user: User) -> User:
        """
        Disable 2FA for user.

        Args:
            user: User object

        Returns:
            Updated user object
        """
        user.is_2fa_enabled = False
        user.totp_secret = None
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_password(self, user: User, password_hash: str) -> User:
        """
        Update user password.

        Args:
            user: User object
            password_hash: New hashed password

        Returns:
            Updated user object
        """
        user.password_hash = password_hash
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user: User) -> None:
        """
        Update user's last login timestamp.

        Args:
            user: User object
        """
        from datetime import datetime

        user.last_login_at = datetime.utcnow()
        await self.db.commit()

    async def list_users(
        self,
        page: int = 1,
        limit: int = 20,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[list[User], int]:
        """
        List users with pagination and filters.

        Args:
            page: Page number (1-indexed)
            limit: Number of items per page
            role: Filter by role
            is_active: Filter by active status
            search: Search in name and email

        Returns:
            Tuple of (users list, total count)
        """
        from sqlalchemy import func, or_

        # Base query - exclude soft deleted
        query = select(User).where(User.deleted_at == None)

        # Apply filters
        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    User.full_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit).order_by(User.created_at.desc())

        # Execute query
        result = await self.db.execute(query)
        users = result.scalars().all()

        return list(users), total

    async def soft_delete(self, user: User, deleted_by: str) -> User:
        """
        Soft delete a user.

        Args:
            user: User object to delete
            deleted_by: ID of user performing deletion

        Returns:
            Updated user object
        """
        from datetime import datetime

        user.deleted_at = datetime.utcnow()
        user.deleted_by = deleted_by
        user.is_active = False
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def activate_user(self, user: User) -> User:
        """
        Activate user account.

        Args:
            user: User object

        Returns:
            Updated user object
        """
        user.is_active = True
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def deactivate_user(self, user: User) -> User:
        """
        Deactivate user account.

        Args:
            user: User object

        Returns:
            Updated user object
        """
        user.is_active = False
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def unlock_account(self, user: User) -> User:
        """
        Unlock locked user account.

        Args:
            user: User object

        Returns:
            Updated user object
        """
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_failed_login = None
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def assign_role(self, user: User, role: str) -> User:
        """
        Assign role to user.

        Args:
            user: User object
            role: New role

        Returns:
            Updated user object
        """
        user.role = role
        await self.db.commit()
        await self.db.refresh(user)
        return user

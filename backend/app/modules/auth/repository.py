"""
Authentication data access layer.
Handles all database operations for users.
"""
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.auth.schemas import UserUpdate


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

    async def create(
        self,
        email: str,
        full_name: str,
        password_hash: str,
        role_id: str,
    ) -> User:
        """
        Create a new user.

        Args:
            email: User email
            full_name: User full name
            password_hash: Hashed password
            role_id: UUID of settings.Role

        Returns:
            Created user object
        """
        user = User(
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            role_id=role_id,
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
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[User], int]:
        """
        List users with pagination and filters.

        Args:
            page: Page number (1-indexed)
            limit: Number of items per page
            role: Filter by role
            is_active: Filter by active status
            status: all|active|inactive|deleted
            search: Search in name and email

        Returns:
            Tuple of (users list, total count)
        """
        from sqlalchemy import func, or_

        query = select(User)

        # Apply status filter: all, active, inactive, deleted
        if status == "active":
            query = query.where(User.deleted_at.is_(None), User.is_active == True)
        elif status == "inactive":
            query = query.where(User.deleted_at.is_(None), User.is_active == False)
        elif status == "deleted":
            query = query.where(User.deleted_at.isnot(None))
        else:
            # all or default: exclude soft-deleted (keep current default behavior)
            if status != "all":
                query = query.where(User.deleted_at.is_(None))

        # Apply filters
        if role:
            from app.modules.settings.models import Role
            query = query.join(Role, User.role_id == Role.id).where(Role.slug == role)
        if is_active is not None and status not in ("active", "inactive", "deleted"):
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

    async def count_user_references(self, user_id: str) -> dict[str, int]:
        """
        Count records in tables that reference users with RESTRICT FKs.
        Returns dict of table_name -> count, excluding zero counts.
        """
        counts: dict[str, int] = {}

        # customers.created_by (RESTRICT)
        from app.modules.customers.models import Customer
        r = await self.db.execute(select(func.count()).select_from(Customer).where(Customer.created_by == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["customers"] = n

        # orders.created_by (RESTRICT)
        from app.modules.orders.models import Order
        r = await self.db.execute(select(func.count()).select_from(Order).where(Order.created_by == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["orders"] = n

        # quotes.created_by_id (default RESTRICT)
        from app.modules.quotes.models import Quote
        r = await self.db.execute(select(func.count()).select_from(Quote).where(Quote.created_by_id == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["quotes"] = n

        # quote_timeline.created_by_id
        from app.modules.quotes.models import QuoteTimeline
        r = await self.db.execute(select(func.count()).select_from(QuoteTimeline).where(QuoteTimeline.created_by_id == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["quote_timeline"] = n

        # invoices.created_by_id (default RESTRICT)
        from app.modules.invoices.models import Invoice
        r = await self.db.execute(select(func.count()).select_from(Invoice).where(Invoice.created_by_id == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["invoices"] = n

        # customer_notes.created_by (RESTRICT)
        from app.modules.customers.notes_models import CustomerNote
        r = await self.db.execute(select(func.count()).select_from(CustomerNote).where(CustomerNote.created_by == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["customer_notes"] = n

        # customer_documents.created_by (RESTRICT)
        from app.modules.customers.notes_models import CustomerDocument
        r = await self.db.execute(select(func.count()).select_from(CustomerDocument).where(CustomerDocument.created_by == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["customer_documents"] = n

        # kyc_documents.created_by (RESTRICT)
        from app.modules.customers.kyc_models import KYCDocument
        r = await self.db.execute(select(func.count()).select_from(KYCDocument).where(KYCDocument.created_by == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["kyc_documents"] = n

        # exports.requested_by_id (default RESTRICT)
        from app.modules.reports.models import Export
        r = await self.db.execute(select(func.count()).select_from(Export).where(Export.requested_by_id == user_id))
        n = r.scalar() or 0
        if n > 0:
            counts["exports"] = n

        return counts

    async def hard_delete(self, user: User) -> None:
        """
        Permanently delete a user from the database.

        Args:
            user: User object to delete
        """
        await self.db.delete(user)
        await self.db.commit()

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

    async def assign_role(self, user: User, role_id: str) -> User:
        """
        Assign role to user.

        Args:
            user: User object
            role_id: UUID of settings.Role

        Returns:
            Updated user object
        """
        user.role_id = role_id
        await self.db.commit()
        await self.db.refresh(user)
        return user

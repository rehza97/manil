"""
Notification group service.

Manages notification groups for targeting notifications to specific user sets.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import NotificationGroup, NotificationTargetType
from app.core.logging import logger
from app.core.exceptions import NotFoundException, ValidationException


class NotificationGroupService:
    """Service for managing notification groups."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def create_group(
        self,
        name: str,
        description: Optional[str],
        target_type: str,
        target_criteria: Optional[Dict[str, Any]],
    ) -> NotificationGroup:
        """
        Create a new notification group.

        Args:
            name: Group name (must be unique)
            description: Group description
            target_type: Target type (all, customer_type, category, custom)
            target_criteria: Targeting criteria (JSON object)

        Returns:
            Created NotificationGroup

        Raises:
            ValidationException: If name already exists or invalid target_type
        """
        # Validate target_type
        valid_types = [e.value for e in NotificationTargetType]
        if target_type not in valid_types:
            raise ValidationException(f"Invalid target_type. Must be one of: {', '.join(valid_types)}")

        # Check if name already exists
        existing = await self.get_by_name(name)
        if existing:
            raise ValidationException(f"Notification group with name '{name}' already exists")

        # Create group
        group = NotificationGroup(
            name=name,
            description=description,
            target_type=target_type,
            target_criteria=target_criteria,
            is_active=True,
        )

        self.db.add(group)
        await self.db.commit()
        await self.db.refresh(group)

        logger.info(f"Created notification group: {name} (target_type: {target_type})")
        return group

    async def get_by_id(self, group_id: str) -> Optional[NotificationGroup]:
        """Get notification group by ID."""
        result = await self.db.execute(
            select(NotificationGroup).where(NotificationGroup.id == group_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[NotificationGroup]:
        """Get notification group by name."""
        result = await self.db.execute(
            select(NotificationGroup).where(NotificationGroup.name == name)
        )
        return result.scalar_one_or_none()

    async def list_groups(
        self,
        is_active: Optional[bool] = None,
        target_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[List[NotificationGroup], int]:
        """List notification groups with filtering and pagination."""
        query = select(NotificationGroup)

        # Apply filters
        conditions = []
        if is_active is not None:
            conditions.append(NotificationGroup.is_active == is_active)
        if target_type:
            conditions.append(NotificationGroup.target_type == target_type)

        if conditions:
            query = query.where(and_(*conditions))

        # Get total count
        from sqlalchemy import func
        count_query = select(func.count()).select_from(NotificationGroup)
        if conditions:
            count_query = count_query.where(and_(*conditions))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        query = query.order_by(NotificationGroup.created_at.desc())
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        groups = list(result.scalars().all())

        return groups, total

    async def update_group(
        self,
        group_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        target_type: Optional[str] = None,
        target_criteria: Optional[Dict[str, Any]] = None,
        is_active: Optional[bool] = None,
    ) -> NotificationGroup:
        """Update a notification group."""
        group = await self.get_by_id(group_id)
        if not group:
            raise NotFoundException(f"Notification group {group_id} not found")

        # Validate target_type if provided
        if target_type:
            valid_types = [e.value for e in NotificationTargetType]
            if target_type not in valid_types:
                raise ValidationException(f"Invalid target_type. Must be one of: {', '.join(valid_types)}")

        # Check name uniqueness if changing name
        if name and name != group.name:
            existing = await self.get_by_name(name)
            if existing:
                raise ValidationException(f"Notification group with name '{name}' already exists")

        # Update fields
        if name is not None:
            group.name = name
        if description is not None:
            group.description = description
        if target_type is not None:
            group.target_type = target_type
        if target_criteria is not None:
            group.target_criteria = target_criteria
        if is_active is not None:
            group.is_active = is_active

        await self.db.commit()
        await self.db.refresh(group)

        logger.info(f"Updated notification group: {group_id}")
        return group

    async def delete_group(self, group_id: str) -> bool:
        """Delete a notification group."""
        group = await self.get_by_id(group_id)
        if not group:
            raise NotFoundException(f"Notification group {group_id} not found")

        await self.db.delete(group)
        await self.db.commit()

        logger.info(f"Deleted notification group: {group_id}")
        return True

    async def get_group_members(self, group_id: str) -> List[str]:
        """Get list of user IDs that match the group's targeting criteria."""
        from app.modules.notifications.services.targeting_service import TargetingService

        group = await self.get_by_id(group_id)
        if not group:
            raise NotFoundException(f"Notification group {group_id} not found")

        targeting_service = TargetingService(self.db)
        user_ids = await targeting_service.resolve_group_targets(group)

        return user_ids

    async def test_targeting(self, group_id: str) -> Dict[str, Any]:
        """Test group targeting without creating notifications."""
        user_ids = await self.get_group_members(group_id)
        return {
            "group_id": group_id,
            "member_count": len(user_ids),
        }

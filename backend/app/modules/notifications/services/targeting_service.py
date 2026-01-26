"""
Targeting service for notification groups.

Resolves user IDs based on notification group targeting criteria.
"""
from typing import List, Dict, Any, TYPE_CHECKING
from sqlalchemy import select, and_, or_, distinct
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from sqlalchemy.orm import Query

from app.modules.notifications.models import NotificationGroup, NotificationTargetType
from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.tickets.models import TicketCategory
from app.core.logging import logger


class TargetingService:
    """Service for resolving notification group targets."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def get_all_users(self) -> List[str]:
        """
        Get all active user IDs.

        Returns:
            List of user IDs
        """
        query = select(User.id).where(
            and_(
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return [str(user_id) for user_id in result.scalars().all()]

    async def get_users_by_customer_type(self, customer_type: str) -> List[str]:
        """
        Get user IDs for users linked to customers with specific type.

        Args:
            customer_type: Customer type ('individual' or 'corporate')

        Returns:
            List of user IDs
        """
        # Query users who have customers with the specified type
        # Customers are linked to users by email
        from sqlalchemy.orm import Query
        from app.modules.customers.schemas import CustomerType
        
        # Convert string to enum if needed
        if isinstance(customer_type, str):
            try:
                customer_type_enum = CustomerType(customer_type)
            except ValueError:
                logger.warning(f"Invalid customer_type: {customer_type}")
                return []
        else:
            customer_type_enum = customer_type
        
        query: Query = select(distinct(User.id)).join(
            Customer, User.email == Customer.email
        ).where(
            and_(
                Customer.customer_type == customer_type_enum,
                Customer.deleted_at.is_(None),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )

        result = await self.db.execute(query)
        return [str(user_id) for user_id in result.scalars().all()]

    async def get_users_by_category(self, category_id: str) -> List[str]:
        """
        Get user IDs for users who have tickets in a specific category.

        Args:
            category_id: Ticket category ID

        Returns:
            List of user IDs
        """
        from app.modules.tickets.models import Ticket
        from sqlalchemy.orm import Query

        # Query users who have tickets in this category
        # This includes both ticket creators (customers) and assigned agents
        query: Query = select(distinct(User.id)).join(
            Ticket, or_(
                User.id == Ticket.customer_id,
                User.id == Ticket.assigned_to
            )
        ).where(
            and_(
                Ticket.category_id == category_id,
                Ticket.deleted_at.is_(None),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )

        result = await self.db.execute(query)
        return [str(user_id) for user_id in result.scalars().all()]

    async def get_users_by_custom_criteria(self, criteria: Dict[str, Any]) -> List[str]:
        """
        Get user IDs based on custom JSON criteria.

        Args:
            criteria: Custom criteria dictionary
                Examples:
                - {"role": "admin"}
                - {"role": ["admin", "corporate"]}
                - {"has_tickets": True}
                - {"customer_type": "corporate", "min_tickets": 5}

        Returns:
            List of user IDs
        """
        from app.modules.tickets.models import Ticket
        from sqlalchemy import func
        from sqlalchemy.orm import Query

        query: Query = select(distinct(User.id))

        # Apply custom criteria
        conditions: List[Any] = [
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        ]

        # Filter by role
        if "role" in criteria:
            role_value = criteria["role"]
            if isinstance(role_value, list):
                conditions.append(User.role.in_(role_value))
            else:
                conditions.append(User.role == role_value)

        # Filter by customer type (join by email since customers don't have direct user_id)
        if "customer_type" in criteria:
            from app.modules.customers.schemas import CustomerType
            
            customer_type_value = criteria["customer_type"]
            if isinstance(customer_type_value, str):
                try:
                    customer_type_enum = CustomerType(customer_type_value)
                except ValueError:
                    logger.warning(f"Invalid customer_type in criteria: {customer_type_value}")
                    return []
            else:
                customer_type_enum = customer_type_value
            
            query = query.join(Customer, User.email == Customer.email)
            conditions.append(Customer.customer_type == customer_type_enum)
            conditions.append(Customer.deleted_at.is_(None))

        # Filter by ticket count
        if "min_tickets" in criteria or "has_tickets" in criteria:
            ticket_subquery = select(
                Ticket.customer_id,
                func.count(Ticket.id).label("ticket_count")
            ).where(
                Ticket.deleted_at.is_(None)
            ).group_by(Ticket.customer_id).subquery()

            # Join via Customer to get user emails, then to User
            query = query.join(Customer, User.email == Customer.email).join(
                ticket_subquery, Customer.id == ticket_subquery.c.customer_id
            )

            if "min_tickets" in criteria:
                conditions.append(ticket_subquery.c.ticket_count >= criteria["min_tickets"])

            if criteria.get("has_tickets"):
                conditions.append(ticket_subquery.c.ticket_count > 0)

        if conditions:
            query = query.where(and_(*conditions))

        result = await self.db.execute(query)
        return [str(user_id) for user_id in result.scalars().all()]

    async def resolve_group_targets(self, group: NotificationGroup) -> List[str]:
        """
        Resolve all user IDs for a notification group based on its targeting criteria.

        Args:
            group: NotificationGroup instance

        Returns:
            List of user IDs
        """
        try:
            if group.target_type == NotificationTargetType.ALL.value:
                return await self.get_all_users()

            elif group.target_type == NotificationTargetType.CUSTOMER_TYPE.value:
                if not group.target_criteria or "customer_type" not in group.target_criteria:
                    logger.warning(f"Group {group.id} missing customer_type in criteria")
                    return []
                customer_type = group.target_criteria["customer_type"]
                return await self.get_users_by_customer_type(customer_type)

            elif group.target_type == NotificationTargetType.CATEGORY.value:
                if not group.target_criteria or "category_id" not in group.target_criteria:
                    logger.warning(f"Group {group.id} missing category_id in criteria")
                    return []
                category_id = group.target_criteria["category_id"]
                return await self.get_users_by_category(category_id)

            elif group.target_type == NotificationTargetType.CUSTOM.value:
                if not group.target_criteria:
                    logger.warning(f"Group {group.id} missing custom criteria")
                    return []
                return await self.get_users_by_custom_criteria(group.target_criteria)

            else:
                logger.error(f"Unknown target_type for group {group.id}: {group.target_type}")
                return []

        except Exception as e:
            logger.error(f"Failed to resolve targets for group {group.id}: {e}", exc_info=True)
            return []

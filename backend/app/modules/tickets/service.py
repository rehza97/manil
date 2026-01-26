"""Ticket service - business logic layer."""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ForbiddenException
from app.core.logging import logger
from app.modules.tickets.repository import TicketRepository
from app.modules.tickets.models import Ticket, TicketReply
from app.modules.tickets.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketReplyCreate,
)
from app.modules.tickets.notifications import TicketNotificationService
from app.modules.customers.repository import CustomerRepository
from app.modules.auth.models import User
from app.modules.notifications.service import create_notification, user_id_by_email
from app.modules.settings.service import UserNotificationPreferencesService
from app.infrastructure.sms.service import SMSService


class TicketService:
    """Ticket business logic service."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = TicketRepository(db)
        self.db = db
        self._notification_service = TicketNotificationService()

    async def _should_send_ticket_email(
        self, *, email: Optional[str] = None, user_id: Optional[str] = None
    ) -> bool:
        """Check user notification prefs; allow send if no user/prefs (default)."""
        uid = user_id
        if not uid and email:
            uid = await user_id_by_email(self.db, email)
        if not uid:
            return True
        prefs_svc = UserNotificationPreferencesService(self.db)
        prefs = await prefs_svc.get(uid)
        return bool(prefs.get("email", {}).get("ticketUpdates", True))

    async def _should_send_ticket_sms(
        self, *, email: Optional[str] = None, user_id: Optional[str] = None
    ) -> bool:
        """Check user SMS notification preferences for tickets."""
        uid = user_id
        if not uid and email:
            uid = await user_id_by_email(self.db, email)
        if not uid:
            return False  # Don't send SMS if no user found
        prefs_svc = UserNotificationPreferencesService(self.db)
        prefs = await prefs_svc.get(uid)
        return bool(prefs.get("sms", {}).get("ticketUpdates", False))

    async def _get_user(self, user_id: str) -> Optional[User]:
        """Fetch user by id."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create_ticket(
        self, ticket_data: TicketCreate, created_by: str
    ) -> Ticket:
        """Create new support ticket."""
        try:
            # Validate that customer exists
            customer_repo = CustomerRepository(self.db)
            customer = await customer_repo.get_by_id(ticket_data.customer_id)
            if not customer:
                raise NotFoundException(
                    f"Customer with ID {ticket_data.customer_id} not found. "
                    "Please ensure the customer exists before creating a ticket."
                )
            
            ticket = await self.repository.create(ticket_data, created_by)
            logger.info(
                f"Ticket created: {ticket.id} for customer {ticket.customer_id}"
            )
            try:
                if customer.email and await self._should_send_ticket_email(
                    email=customer.email
                ):
                    await self._notification_service.notify_ticket_created(
                        customer_email=customer.email,
                        ticket_id=ticket.id,
                        subject=ticket.title,
                    )
            except Exception as e:
                logger.warning(f"Ticket creation notification failed: {e}")
            
            # Notify notification groups if ticket has category
            if ticket.category_id:
                try:
                    from app.modules.notifications.services.group_service import NotificationGroupService
                    from app.modules.notifications.models import NotificationTargetType
                    
                    group_service = NotificationGroupService(self.db)
                    groups, _ = await group_service.list_groups(
                        is_active=True,
                        target_type=NotificationTargetType.CATEGORY.value,
                        skip=0,
                        limit=100,
                    )
                    
                    # Find groups targeting this category
                    for group in groups:
                        if (group.target_criteria and 
                            group.target_criteria.get("category_id") == ticket.category_id):
                            try:
                                await create_notification(
                                    self.db,
                                    group_id=group.id,
                                    type="ticket_created",
                                    title=f"New ticket in category: {ticket.title}",
                                    body=f"Ticket {ticket.id} has been created in your assigned category.",
                                    link=f"/tickets/{ticket.id}",
                                )
                            except Exception as e:
                                logger.warning(f"Failed to notify group {group.id} for ticket {ticket.id}: {e}")
                except Exception as e:
                    logger.warning(f"Failed to process notification groups for ticket {ticket.id}: {e}")
            
            # Notify groups targeting customer type
            if customer.customer_type:
                try:
                    from app.modules.notifications.services.group_service import NotificationGroupService
                    from app.modules.notifications.models import NotificationTargetType
                    
                    group_service = NotificationGroupService(self.db)
                    groups, _ = await group_service.list_groups(
                        is_active=True,
                        target_type=NotificationTargetType.CUSTOMER_TYPE.value,
                        skip=0,
                        limit=100,
                    )
                    
                    # Find groups targeting this customer type
                    for group in groups:
                        customer_type_value = customer.customer_type.value if hasattr(customer.customer_type, 'value') else str(customer.customer_type)
                        if (group.target_criteria and 
                            group.target_criteria.get("customer_type") == customer_type_value):
                            try:
                                await create_notification(
                                    self.db,
                                    group_id=group.id,
                                    type="ticket_created",
                                    title=f"New ticket from {customer_type_value} customer: {ticket.title}",
                                    body=f"Ticket {ticket.id} has been created by a {customer_type_value} customer.",
                                    link=f"/tickets/{ticket.id}",
                                )
                            except Exception as e:
                                logger.warning(f"Failed to notify group {group.id} for ticket {ticket.id}: {e}")
                except Exception as e:
                    logger.warning(f"Failed to process customer type notification groups for ticket {ticket.id}: {e}")
            
            return ticket
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to create ticket: {str(e)}")
            raise

    async def get_ticket(self, ticket_id: str) -> Ticket:
        """Get ticket by ID with permission check."""
        ticket = await self.repository.get_by_id(ticket_id)
        if not ticket:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        # Increment view count
        await self.repository.increment_view_count(ticket_id)
        return ticket

    async def list_tickets(
        self,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
    ) -> tuple[list[Ticket], int]:
        """List all tickets with pagination."""
        return await self.repository.get_all(skip, limit, customer_id)

    async def list_tickets_with_filters(
        self,
        skip: int = 0,
        limit: int = 20,
        filters: Optional[dict] = None,
    ) -> tuple[list[Ticket], int]:
        """List tickets with advanced filtering."""
        if filters is None:
            filters = {}

        return await self.repository.get_all(skip, limit, filters.get("customer_id"))

    async def update_ticket(
        self, ticket_id: str, ticket_data: TicketUpdate, updated_by: str
    ) -> Ticket:
        """Update ticket details."""
        ticket = await self.get_ticket(ticket_id)
        updated = await self.repository.update(ticket_id, ticket_data, updated_by)

        if not updated:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket updated: {ticket_id}")
        return updated

    async def change_status(
        self, ticket_id: str, new_status: str, reason: Optional[str], updated_by: str
    ) -> Ticket:
        """Change ticket status with validation and reason."""
        ticket = await self.get_ticket(ticket_id)
        old_status = ticket.status

        # Validate status transition
        valid_transitions = {
            "open": ["answered", "in_progress", "on_hold", "closed"],
            "answered": ["in_progress", "on_hold", "waiting_for_response", "closed"],
            "waiting_for_response": ["answered", "in_progress", "closed"],
            "on_hold": ["in_progress", "answered", "closed"],
            "in_progress": ["resolved", "closed", "on_hold"],
            "resolved": ["closed"],
            "closed": ["open"],
        }

        if new_status not in valid_transitions.get(ticket.status, []):
            raise ForbiddenException(
                f"Cannot transition from {ticket.status} to {new_status}"
            )

        updated = await self.repository.update_status(ticket_id, new_status, updated_by)
        if not updated:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket {ticket_id} status changed to {new_status}")

        try:
            customer_repo = CustomerRepository(self.db)
            customer = await customer_repo.get_by_id(ticket.customer_id)
            if (
                customer
                and customer.email
                and await self._should_send_ticket_email(email=customer.email)
            ):
                if new_status == "closed":
                    await self._notification_service.notify_ticket_closed(
                        recipient_email=customer.email,
                        ticket_id=ticket_id,
                        ticket_subject=ticket.title,
                    )
                else:
                    await self._notification_service.notify_ticket_status_change(
                        recipient_email=customer.email,
                        ticket_id=ticket_id,
                        ticket_subject=ticket.title,
                        old_status=old_status,
                        new_status=new_status,
                    )
            
            # Create in-app notification for customer
            if customer and customer.email:
                try:
                    uid = await user_id_by_email(self.db, customer.email)
                    if uid:
                        status_display = new_status.replace("_", " ").title()
                        await create_notification(
                            self.db,
                            uid,
                            "ticket_status_change",
                            f"Ticket status updated: {ticket.title}",
                            body=f"Ticket status changed from {old_status.replace('_', ' ').title()} to {status_display}.",
                            link=f"/tickets/{ticket_id}",
                        )
                except Exception as e:
                    logger.warning("In-app ticket status change notification failed: %s", e)
            
            # Notify assigned agent if ticket is assigned
            if ticket.assigned_to and ticket.assigned_to != ticket.created_by:
                try:
                    status_display = new_status.replace("_", " ").title()
                    await create_notification(
                        self.db,
                        ticket.assigned_to,
                        "ticket_status_change",
                        f"Ticket status updated: {ticket.title}",
                        body=f"Ticket {ticket_id} status changed from {old_status.replace('_', ' ').title()} to {status_display}.",
                        link=f"/tickets/{ticket_id}",
                    )
                except Exception as e:
                    logger.warning("In-app ticket status change notification for agent failed: %s", e)
            
            # Send SMS notification to customer if phone exists and preferences allow
            if customer and customer.phone and customer.phone.strip():
                try:
                    if await self._should_send_ticket_sms(email=customer.email):
                        sms_service = SMSService()
                        await sms_service.send_ticket_update(
                            to=customer.phone,
                            ticket_id=ticket_id
                        )
                except Exception as e:
                    logger.warning(f"Ticket status change SMS notification failed: {e}")
        except Exception as e:
            logger.warning(f"Ticket status change notification failed: {e}")

        return updated

    async def assign_ticket(
        self, ticket_id: str, user_id: str, assigned_by: str
    ) -> Ticket:
        """Assign ticket to user."""
        ticket = await self.get_ticket(ticket_id)
        assigned = await self.repository.assign(ticket_id, user_id, assigned_by)

        if not assigned:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket {ticket_id} assigned to {user_id}")

        try:
            agent = await self._get_user(user_id)
            if (
                agent
                and agent.email
                and await self._should_send_ticket_email(user_id=user_id)
            ):
                await self._notification_service.notify_ticket_assigned(
                    agent_email=agent.email,
                    ticket_id=ticket_id,
                    ticket_subject=ticket.title,
                    assigned_to=agent.full_name or agent.email,
                )
            try:
                await create_notification(
                    self.db,
                    user_id,
                    "ticket_assigned",
                    f"Ticket assigned: {ticket.title}",
                    body=f"You have been assigned to ticket {ticket_id}.",
                    link=f"/tickets/{ticket_id}",
                )
            except Exception as e:
                logger.warning("In-app ticket assign notification failed: %s", e)
            
            # Send SMS notification to customer if phone exists and preferences allow
            customer_repo = CustomerRepository(self.db)
            customer = await customer_repo.get_by_id(ticket.customer_id)
            if customer and customer.phone and customer.phone.strip():
                try:
                    if await self._should_send_ticket_sms(email=customer.email):
                        sms_service = SMSService()
                        await sms_service.send_ticket_update(
                            to=customer.phone,
                            ticket_id=ticket_id
                        )
                except Exception as e:
                    logger.warning(f"Ticket assignment SMS notification failed: {e}")
        except Exception as e:
            logger.warning(f"Ticket assignment notification failed: {e}")

        return assigned

    async def transfer_ticket(
        self, ticket_id: str, new_user_id: str, transferred_by: str
    ) -> Ticket:
        """Transfer ticket to another user."""
        ticket = await self.get_ticket(ticket_id)
        transferred = await self.repository.transfer(
            ticket_id, new_user_id, transferred_by
        )

        if not transferred:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Ticket {ticket_id} transferred to {new_user_id}")

        try:
            agent = await self._get_user(new_user_id)
            if (
                agent
                and agent.email
                and await self._should_send_ticket_email(user_id=new_user_id)
            ):
                await self._notification_service.notify_ticket_assigned(
                    agent_email=agent.email,
                    ticket_id=ticket_id,
                    ticket_subject=ticket.title,
                    assigned_to=agent.full_name or agent.email,
                )
            try:
                await create_notification(
                    self.db,
                    new_user_id,
                    "ticket_assigned",
                    f"Ticket transferred: {ticket.title}",
                    body=f"Ticket {ticket_id} has been transferred to you.",
                    link=f"/tickets/{ticket_id}",
                )
            except Exception as e:
                logger.warning("In-app ticket transfer notification failed: %s", e)
        except Exception as e:
            logger.warning(f"Ticket transfer notification failed: {e}")

        return transferred

    async def close_ticket(self, ticket_id: str, closed_by: str) -> Ticket:
        """Close ticket."""
        ticket = await self.get_ticket(ticket_id)
        return await self.change_status(ticket_id, "closed", None, closed_by)

    async def delete_ticket(self, ticket_id: str, deleted_by: str) -> bool:
        """Delete (soft delete) ticket."""
        ticket = await self.get_ticket(ticket_id)
        result = await self.repository.delete(ticket_id, deleted_by)
        if result:
            logger.info(f"Ticket {ticket_id} deleted")
        return result

    async def add_reply(
        self, ticket_id: str, reply_data: TicketReplyCreate, user_id: str
    ) -> TicketReply:
        """Add reply to ticket."""
        ticket = await self.get_ticket(ticket_id)
        reply = await self.repository.add_reply(ticket_id, reply_data, user_id)

        if not reply:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(f"Reply added to ticket {ticket_id}")

        if not reply_data.is_internal:
            try:
                reply_author_user = await self._get_user(user_id)
                reply_author = (
                    (reply_author_user.full_name or reply_author_user.email)
                    if reply_author_user
                    else "Support"
                )
                customer_repo = CustomerRepository(self.db)
                customer = await customer_repo.get_by_id(ticket.customer_id)
                if user_id == ticket.created_by:
                    if ticket.assigned_to and customer:
                        agent = await self._get_user(ticket.assigned_to)
                        if (
                            agent
                            and agent.email
                            and await self._should_send_ticket_email(
                                user_id=ticket.assigned_to
                            )
                        ):
                            await self._notification_service.notify_ticket_reply(
                                recipient_email=agent.email,
                                ticket_id=ticket_id,
                                ticket_subject=ticket.title,
                                reply_author=reply_author,
                                is_internal=False,
                            )
                            try:
                                await create_notification(
                                    self.db,
                                    ticket.assigned_to,
                                    "ticket_reply",
                                    f"New reply on ticket: {ticket.title}",
                                    body=f"{reply_author} replied to ticket {ticket_id}.",
                                    link=f"/tickets/{ticket_id}",
                                )
                            except Exception as e:
                                logger.warning("In-app ticket reply notification failed: %s", e)
                elif (
                    customer
                    and customer.email
                    and await self._should_send_ticket_email(email=customer.email)
                ):
                    await self._notification_service.notify_ticket_reply(
                        recipient_email=customer.email,
                        ticket_id=ticket_id,
                        ticket_subject=ticket.title,
                        reply_author=reply_author,
                        is_internal=False,
                    )
                    try:
                        uid = await user_id_by_email(self.db, customer.email)
                        if uid:
                            await create_notification(
                                self.db,
                                uid,
                                "ticket_reply",
                                f"New reply on ticket: {ticket.title}",
                                body=f"{reply_author} replied to your ticket.",
                                link=f"/tickets/{ticket_id}",
                            )
                    except Exception as e:
                        logger.warning("In-app ticket reply notification failed: %s", e)
                    
                    # Send SMS notification to customer if phone exists and preferences allow
                    if customer.phone and customer.phone.strip():
                        try:
                            if await self._should_send_ticket_sms(email=customer.email):
                                sms_service = SMSService()
                                await sms_service.send_ticket_update(
                                    to=customer.phone,
                                    ticket_id=ticket_id
                                )
                        except Exception as e:
                            logger.warning(f"Ticket reply SMS notification failed: {e}")
            except Exception as e:
                logger.warning(f"Ticket reply notification failed: {e}")

        return reply

    async def get_ticket_replies(self, ticket_id: str, current_user=None) -> list[TicketReply]:
        """Get all replies for ticket with permission filtering."""
        ticket = await self.get_ticket(ticket_id)
        replies = await self.repository.get_replies(ticket_id)

        # ✅ FIXED: Filter internal notes based on user role
        if current_user and current_user.role == "client":
            # Customers only see non-internal replies
            replies = [r for r in replies if not r.is_internal]

        return replies

    async def delete_reply(self, reply_id: str, deleted_by: str) -> bool:
        """Delete (soft delete) reply."""
        result = await self.repository.delete_reply(reply_id, deleted_by)
        if result:
            logger.info(f"Reply {reply_id} deleted")
        return result

"""Ticket service - business logic layer."""
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ForbiddenException, BadRequestException
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
from app.modules.settings.utils import notification_gate_allows
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
            # Default allow when we cannot resolve user prefs (e.g. customer exists without portal user).
            return True
        prefs_svc = UserNotificationPreferencesService(self.db)
        prefs = await prefs_svc.get(uid)
        return bool(prefs.get("sms", {}).get("ticketUpdates", True))

    async def _should_send_ticket_push(
        self, *, email: Optional[str] = None, user_id: Optional[str] = None
    ) -> bool:
        """Check user push/in-app notification preferences for tickets."""
        uid = user_id
        if not uid and email:
            uid = await user_id_by_email(self.db, email)
        if not uid:
            return True  # Default allow if no user found (backward compatible)
        prefs_svc = UserNotificationPreferencesService(self.db)
        prefs = await prefs_svc.get(uid)
        return bool(prefs.get("push", {}).get("ticketUpdates", True))

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

            # Validate category if provided
            if ticket_data.category_id:
                from app.modules.tickets.response_templates import TicketCategory
                category_query = select(TicketCategory).where(
                    and_(
                        TicketCategory.id == ticket_data.category_id,
                        TicketCategory.is_active.is_(True)
                    )
                )
                category_result = await self.db.execute(category_query)
                category = category_result.scalar_one_or_none()
                if not category:
                    raise NotFoundException(
                        f"Category with ID {ticket_data.category_id} not found or inactive."
                    )

            ticket = await self.repository.create(ticket_data, created_by)
            logger.info(
                f"Ticket created: {ticket.id} for customer {ticket.customer_id}"
            )
            try:
                if (
                    customer.email
                    and await notification_gate_allows(self.db, "email", "ticket.created")
                    and await self._should_send_ticket_email(email=customer.email)
                ):
                    await self._notification_service.notify_ticket_created(
                        customer_email=customer.email,
                        ticket_id=ticket.id,
                        subject=ticket.title,
                        db=self.db,
                    )
            except Exception as e:
                logger.warning(
                    f"Ticket creation email notification failed: {e}")

            # Send SMS notification for ticket creation
            try:
                if (
                    customer.phone
                    and customer.phone.strip()
                    and await notification_gate_allows(self.db, "sms", "ticket.created")
                    and await self._should_send_ticket_sms(email=customer.email)
                ):
                    sms_service = SMSService()
                    await sms_service.send_ticket_update(
                        customer.phone,
                        ticket.id,
                        db=self.db,
                    )
            except Exception as e:
                logger.warning(f"Ticket creation SMS notification failed: {e}")

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
                                logger.warning(
                                    f"Failed to notify group {group.id} for ticket {ticket.id}: {e}")
                except Exception as e:
                    logger.warning(
                        f"Failed to process notification groups for ticket {ticket.id}: {e}")

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
                        customer_type_value = customer.customer_type.value if hasattr(
                            customer.customer_type, 'value') else str(customer.customer_type)
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
                                logger.warning(
                                    f"Failed to notify group {group.id} for ticket {ticket.id}: {e}")
                except Exception as e:
                    logger.warning(
                        f"Failed to process customer type notification groups for ticket {ticket.id}: {e}")

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

        return await self.repository.get_all_with_filters(skip, limit, filters)

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

        logger.info(
            f"[TICKET STATUS] Attempting to change ticket {ticket_id} "
            f"from '{old_status}' to '{new_status}' | "
            f"updated_by={updated_by} | reason={reason}"
        )

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

        valid_next_statuses = valid_transitions.get(ticket.status, [])

        if new_status not in valid_next_statuses:
            logger.warning(
                f"[TICKET STATUS] Invalid transition rejected: {ticket_id} | "
                f"from '{old_status}' to '{new_status}' | "
                f"valid_transitions={', '.join(valid_next_statuses) if valid_next_statuses else 'none'} | "
                f"updated_by={updated_by}"
            )
            raise BadRequestException(
                f"Cannot transition from '{ticket.status}' to '{new_status}'. "
                f"Valid transitions from '{ticket.status}' are: {', '.join(valid_next_statuses) if valid_next_statuses else 'none'}"
            )

        updated = await self.repository.update_status(ticket_id, new_status, updated_by)
        if not updated:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        logger.info(
            f"[TICKET STATUS] ✅ Successfully changed ticket {ticket_id} | "
            f"from '{old_status}' to '{new_status}' | "
            f"updated_by={updated_by}"
        )

        try:
            customer_repo = CustomerRepository(self.db)
            customer = await customer_repo.get_by_id(ticket.customer_id)
            ev = "ticket.closed" if new_status == "closed" else "ticket.status_changed"
            if (
                customer
                and customer.email
                and await notification_gate_allows(self.db, "email", ev)
                and await self._should_send_ticket_email(email=customer.email)
            ):
                if new_status == "closed":
                    await self._notification_service.notify_ticket_closed(
                        recipient_email=customer.email,
                        ticket_id=ticket_id,
                        ticket_subject=ticket.title,
                        db=self.db,
                    )
                else:
                    await self._notification_service.notify_ticket_status_change(
                        recipient_email=customer.email,
                        ticket_id=ticket_id,
                        ticket_subject=ticket.title,
                        old_status=old_status,
                        new_status=new_status,
                        db=self.db,
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
                    logger.warning(
                        "In-app ticket status change notification failed: %s", e)

            # Notify assigned agent if ticket is assigned
            if ticket.assigned_to and ticket.assigned_to != ticket.created_by:
                try:
                    if await self._should_send_ticket_push(user_id=ticket.assigned_to):
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
                    logger.warning(
                        "In-app ticket status change notification for agent failed: %s", e)

            # Send SMS notification to customer if phone exists and preferences allow
            if (
                customer
                and customer.phone
                and customer.phone.strip()
                and await notification_gate_allows(self.db, "sms", ev)
            ):
                try:
                    if await self._should_send_ticket_sms(email=customer.email):
                        sms_service = SMSService()
                        await sms_service.send_ticket_update(
                            customer.phone,
                            ticket_id,
                            db=self.db,
                        )
                except Exception as e:
                    logger.warning(
                        "Ticket status change SMS notification failed: %s", e)
        except Exception as e:
            logger.warning("Ticket status change notification failed: %s", e)

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
                and await notification_gate_allows(self.db, "email", "ticket.assigned")
                and await self._should_send_ticket_email(user_id=user_id)
            ):
                await self._notification_service.notify_ticket_assigned(
                    agent_email=agent.email,
                    ticket_id=ticket_id,
                    ticket_subject=ticket.title,
                    assigned_to=agent.full_name or agent.email,
                    db=self.db,
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
                logger.warning(
                    "In-app ticket assign notification failed: %s", e)

            customer_repo = CustomerRepository(self.db)
            customer = await customer_repo.get_by_id(ticket.customer_id)
            if (
                customer
                and customer.phone
                and customer.phone.strip()
                and await notification_gate_allows(self.db, "sms", "ticket.assigned")
            ):
                try:
                    if await self._should_send_ticket_sms(email=customer.email):
                        sms_service = SMSService()
                        await sms_service.send_ticket_update(
                            customer.phone,
                            ticket_id,
                            db=self.db,
                        )
                except Exception as e:
                    logger.warning(
                        "Ticket assignment SMS notification failed: %s", e)
        except Exception as e:
            logger.warning("Ticket assignment notification failed: %s", e)

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
                and await notification_gate_allows(self.db, "email", "ticket.assigned")
                and await self._should_send_ticket_email(user_id=new_user_id)
            ):
                await self._notification_service.notify_ticket_assigned(
                    agent_email=agent.email,
                    ticket_id=ticket_id,
                    ticket_subject=ticket.title,
                    assigned_to=agent.full_name or agent.email,
                    db=self.db,
                )
            try:
                if await self._should_send_ticket_push(user_id=new_user_id):
                    await create_notification(
                        self.db,
                        new_user_id,
                        "ticket_assigned",
                        f"Ticket transferred: {ticket.title}",
                        body=f"Ticket {ticket_id} has been transferred to you.",
                        link=f"/tickets/{ticket_id}",
                    )
            except Exception as e:
                logger.warning(
                    "In-app ticket transfer notification failed: %s", e)
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
                            and await notification_gate_allows(
                                self.db, "email", "ticket.replied"
                            )
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
                                db=self.db,
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
                                logger.warning(
                                    "In-app ticket reply notification failed: %s", e)
                elif (
                    customer
                    and customer.email
                    and await notification_gate_allows(
                        self.db, "email", "ticket.replied"
                    )
                    and await self._should_send_ticket_email(email=customer.email)
                ):
                    await self._notification_service.notify_ticket_reply(
                        recipient_email=customer.email,
                        ticket_id=ticket_id,
                        ticket_subject=ticket.title,
                        reply_author=reply_author,
                        is_internal=False,
                        db=self.db,
                    )
                    try:
                        uid = await user_id_by_email(self.db, customer.email)
                        if uid and await self._should_send_ticket_push(email=customer.email):
                            await create_notification(
                                self.db,
                                uid,
                                "ticket_reply",
                                f"New reply on ticket: {ticket.title}",
                                body=f"{reply_author} replied to your ticket.",
                                link=f"/tickets/{ticket_id}",
                            )
                    except Exception as e:
                        logger.warning(
                            "In-app ticket reply notification failed: %s", e)

                    if (
                        customer.phone
                        and customer.phone.strip()
                        and await notification_gate_allows(
                            self.db, "sms", "ticket.replied"
                        )
                    ):
                        try:
                            if await self._should_send_ticket_sms(email=customer.email):
                                sms_service = SMSService()
                                await sms_service.send_ticket_update(
                                    customer.phone,
                                    ticket_id,
                                    db=self.db,
                                )
                        except Exception as e:
                            logger.warning(
                                "Ticket reply SMS notification failed: %s", e
                            )
            except Exception as e:
                logger.warning(f"Ticket reply notification failed: {e}")

        return reply

    async def get_ticket_replies(self, ticket_id: str, current_user=None) -> list[TicketReply]:
        """Get all replies for ticket with permission filtering."""
        ticket = await self.get_ticket(ticket_id)
        replies = await self.repository.get_replies(ticket_id)

        # ✅ FIXED: Filter internal notes based on user role
        if current_user and current_user.role_slug == "client":
            # Customers only see non-internal replies
            replies = [r for r in replies if not r.is_internal]

        return replies

    async def delete_reply(self, reply_id: str, deleted_by: str) -> bool:
        """Delete (soft delete) reply."""
        result = await self.repository.delete_reply(reply_id, deleted_by)
        if result:
            logger.info(f"Reply {reply_id} deleted")
        return result

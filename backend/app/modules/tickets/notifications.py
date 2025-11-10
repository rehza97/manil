"""Ticket notification service for email alerts on ticket events."""
from typing import Optional

from app.infrastructure.email.service import EmailService
from app.core.logging import logger


class TicketNotificationService:
    """
    Service for sending ticket-related email notifications.

    Handles notifications for ticket creation, replies, status changes,
    and assignments.
    """

    def __init__(self):
        """Initialize notification service with email provider."""
        self.email_service = EmailService()

    async def notify_ticket_created(
        self, customer_email: str, ticket_id: str, subject: str
    ) -> bool:
        """
        Notify customer that ticket was created.

        Args:
            customer_email: Customer email address
            ticket_id: Ticket ID
            subject: Ticket subject

        Returns:
            True if notification sent successfully
        """
        try:
            result = await self.email_service.send_ticket_created(
                customer_email, ticket_id, subject
            )
            if result:
                logger.info(f"Ticket creation notification sent to {customer_email}")
            else:
                logger.warning(f"Failed to send ticket creation notification to {customer_email}")
            return result
        except Exception as e:
            logger.error(f"Error sending ticket creation notification: {str(e)}")
            return False

    async def notify_ticket_reply(
        self,
        recipient_email: str,
        ticket_id: str,
        ticket_subject: str,
        reply_author: str,
        is_internal: bool = False,
    ) -> bool:
        """
        Notify about new ticket reply.

        Args:
            recipient_email: Email of person to notify
            ticket_id: Ticket ID
            ticket_subject: Ticket subject
            reply_author: Name of person who replied
            is_internal: Whether reply is internal note

        Returns:
            True if notification sent successfully
        """
        try:
            # Don't send notification for internal notes to customers
            if is_internal:
                logger.info(f"Skipping internal note notification for ticket {ticket_id}")
                return True

            result = await self.email_service.send_ticket_reply(
                recipient_email, ticket_id, ticket_subject, reply_author, is_internal
            )
            if result:
                logger.info(f"Ticket reply notification sent to {recipient_email}")
            else:
                logger.warning(f"Failed to send ticket reply notification to {recipient_email}")
            return result
        except Exception as e:
            logger.error(f"Error sending ticket reply notification: {str(e)}")
            return False

    async def notify_ticket_status_change(
        self,
        recipient_email: str,
        ticket_id: str,
        ticket_subject: str,
        old_status: str,
        new_status: str,
    ) -> bool:
        """
        Notify about ticket status change.

        Args:
            recipient_email: Email of person to notify
            ticket_id: Ticket ID
            ticket_subject: Ticket subject
            old_status: Previous status
            new_status: New status

        Returns:
            True if notification sent successfully
        """
        try:
            result = await self.email_service.send_ticket_status_change(
                recipient_email, ticket_id, ticket_subject, old_status, new_status
            )
            if result:
                logger.info(
                    f"Ticket status change notification sent to {recipient_email}: "
                    f"{old_status} -> {new_status}"
                )
            else:
                logger.warning(
                    f"Failed to send ticket status change notification to {recipient_email}"
                )
            return result
        except Exception as e:
            logger.error(f"Error sending ticket status change notification: {str(e)}")
            return False

    async def notify_ticket_assigned(
        self,
        agent_email: str,
        ticket_id: str,
        ticket_subject: str,
        assigned_to: str,
    ) -> bool:
        """
        Notify agent that ticket was assigned to them.

        Args:
            agent_email: Email of assigned agent
            ticket_id: Ticket ID
            ticket_subject: Ticket subject
            assigned_to: Name of assigned agent

        Returns:
            True if notification sent successfully
        """
        try:
            result = await self.email_service.send_ticket_assigned(
                agent_email, ticket_id, ticket_subject, assigned_to
            )
            if result:
                logger.info(f"Ticket assignment notification sent to {agent_email}")
            else:
                logger.warning(f"Failed to send ticket assignment notification to {agent_email}")
            return result
        except Exception as e:
            logger.error(f"Error sending ticket assignment notification: {str(e)}")
            return False

    async def notify_ticket_closed(
        self,
        recipient_email: str,
        ticket_id: str,
        ticket_subject: str,
    ) -> bool:
        """
        Notify that ticket was closed.

        Args:
            recipient_email: Email of person to notify
            ticket_id: Ticket ID
            ticket_subject: Ticket subject

        Returns:
            True if notification sent successfully
        """
        try:
            result = await self.email_service.send_ticket_closed(
                recipient_email, ticket_id, ticket_subject
            )
            if result:
                logger.info(f"Ticket closed notification sent to {recipient_email}")
            else:
                logger.warning(f"Failed to send ticket closed notification to {recipient_email}")
            return result
        except Exception as e:
            logger.error(f"Error sending ticket closed notification: {str(e)}")
            return False

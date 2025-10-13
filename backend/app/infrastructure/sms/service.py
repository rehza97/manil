"""
SMS service for sending notifications.

Provides high-level API for sending SMS messages.
"""

from app.infrastructure.sms.providers import get_sms_provider


class SMSService:
    """
    SMS service for sending notifications.

    Handles SMS sending with support for multiple providers
    and message formatting.
    """

    def __init__(self):
        self.provider = get_sms_provider()

    async def send_sms(self, to: str, message: str) -> bool:
        """
        Send SMS with custom content.

        Args:
            to: Recipient phone number (E.164 format recommended)
            message: SMS message content

        Returns:
            True if SMS sent successfully, False otherwise
        """
        return await self.provider.send_sms(to, message)

    async def send_2fa_code(self, to: str, code: str) -> bool:
        """
        Send 2FA verification code via SMS.

        Args:
            to: Recipient phone number
            code: 2FA verification code

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager: Your verification code is {code}. Valid for 5 minutes."
        return await self.send_sms(to, message)

    async def send_password_reset_code(self, to: str, code: str) -> bool:
        """
        Send password reset code via SMS.

        Args:
            to: Recipient phone number
            code: Password reset code

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager: Your password reset code is {code}. Valid for 1 hour."
        return await self.send_sms(to, message)

    async def send_order_notification(self, to: str, order_id: str, status: str) -> bool:
        """
        Send order status notification via SMS.

        Args:
            to: Recipient phone number
            order_id: Order ID
            status: Order status

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager: Order {order_id} status: {status}"
        return await self.send_sms(to, message)

    async def send_ticket_update(self, to: str, ticket_id: str) -> bool:
        """
        Send ticket update notification via SMS.

        Args:
            to: Recipient phone number
            ticket_id: Ticket ID

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager: Your ticket {ticket_id} has been updated."
        return await self.send_sms(to, message)

    async def send_custom_notification(self, to: str, title: str, body: str) -> bool:
        """
        Send custom notification via SMS.

        Args:
            to: Recipient phone number
            title: Notification title
            body: Notification body

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager - {title}: {body}"
        # Truncate if too long (SMS limit ~160 chars)
        if len(message) > 160:
            message = message[:157] + "..."
        return await self.send_sms(to, message)

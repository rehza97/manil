"""
SMS service for sending notifications.

Provides high-level API for sending SMS messages.
"""

from app.infrastructure.sms.providers import get_sms_provider
from app.core.logging import logger


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
        ok = await self.provider.send_sms(to, message)
        if not ok:
            logger.warning("SMS delivery failed: to=%s", to)
        return ok

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

    async def send_invoice_notification(
        self, to: str, invoice_number: str, amount: float, due_date: str
    ) -> bool:
        """
        Send invoice notification via SMS.

        Args:
            to: Recipient phone number
            invoice_number: Invoice number
            amount: Invoice amount
            due_date: Due date (formatted string)

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager: Invoice {invoice_number} for {amount:.2f} DZD. Due: {due_date}"
        # Truncate if too long
        if len(message) > 160:
            message = message[:157] + "..."
        return await self.send_sms(to, message)

    async def send_quote_notification(
        self, to: str, quote_id: str, status: str, message: str = None
    ) -> bool:
        """
        Send quote notification via SMS.

        Args:
            to: Recipient phone number
            quote_id: Quote ID
            status: Quote status (created, approved, quoted, accepted, rejected)
            message: Optional custom message

        Returns:
            True if SMS sent successfully
        """
        if message:
            sms_message = f"CloudManager: {message}"
        else:
            status_display = status.replace("_", " ").title()
            sms_message = f"CloudManager: Quote {quote_id} status: {status_display}"
        
        # Truncate if too long
        if len(sms_message) > 160:
            sms_message = sms_message[:157] + "..."
        return await self.send_sms(to, sms_message)

    async def send_payment_confirmation(
        self, to: str, invoice_number: str, amount: float
    ) -> bool:
        """
        Send payment confirmation via SMS.

        Args:
            to: Recipient phone number
            invoice_number: Invoice number
            amount: Payment amount

        Returns:
            True if SMS sent successfully
        """
        message = f"CloudManager: Payment of {amount:.2f} DZD received for invoice {invoice_number}. Thank you!"
        # Truncate if too long
        if len(message) > 160:
            message = message[:157] + "..."
        return await self.send_sms(to, message)

    async def send_vps_alert(
        self, to: str, vps_name: str, alert_type: str, message: str
    ) -> bool:
        """
        Send VPS alert notification via SMS.

        Args:
            to: Recipient phone number
            vps_name: VPS instance name
            alert_type: Alert type (CPU, Memory, Disk, etc.)
            message: Alert message

        Returns:
            True if SMS sent successfully
        """
        sms_message = f"CloudManager VPS Alert [{vps_name}]: {alert_type} - {message}"
        # Truncate if too long
        if len(sms_message) > 160:
            sms_message = sms_message[:157] + "..."
        return await self.send_sms(to, sms_message)

    async def send_billing_notification(self, to: str, message: str) -> bool:
        """
        Send billing notification via SMS.

        Args:
            to: Recipient phone number
            message: Billing message

        Returns:
            True if SMS sent successfully
        """
        sms_message = f"CloudManager Billing: {message}"
        # Truncate if too long
        if len(sms_message) > 160:
            sms_message = sms_message[:157] + "..."
        return await self.send_sms(to, sms_message)

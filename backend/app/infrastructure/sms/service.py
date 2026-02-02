"""
SMS service for sending notifications.

Provider switch (Twilio vs Custom) from DB; Twilio API keys from UI.
Custom forces sms/ (queue -> Flutter /sms/app/*).
"""

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.sms.providers import get_sms_provider, get_sms_provider_for_config
from app.modules.settings.utils import get_sms_config, get_notification_sms_enabled, get_app_name
from app.core.logging import logger


class SMSService:
    """
    SMS service. When db provided, uses get_sms_config(db) and DB-driven provider.
    Otherwise uses env-based get_sms_provider().
    """

    def __init__(self):
        pass

    async def _get_app_name(self, db: Optional[AsyncSession] = None) -> str:
        """Get app name from DB if available, else fallback to default."""
        if db:
            try:
                return await get_app_name(db)
            except Exception as e:
                logger.warning("Failed to get app name from DB: %s", e)
        return "CloudManager"

    async def send_sms(
        self, to: str, message: str, db: Optional[AsyncSession] = None
    ) -> bool:
        """
        Send SMS. When db provided, provider from DB (Twilio vs Custom); else env.
        """
        logger.info("SMS send: to=%s, db=%s", to, "provided" if db is not None else "none")
        if db is not None:
            try:
                sms_enabled = await get_notification_sms_enabled(db)
                logger.info("SMS notification gate (notification.sms_enabled): enabled=%s", sms_enabled)
                if not sms_enabled:
                    logger.info(
                        "SMS gate disabled: skipping send (no queue row created); returning success=True. "
                        "Enable notification.sms_enabled to queue messages."
                    )
                    return True
            except Exception as e:
                logger.warning("Failed to check SMS notification gate: %s", e)
            try:
                config = await get_sms_config(db)
                provider = get_sms_provider_for_config(config)
                logger.info("SMS provider: Custom (queue -> Flutter app sends from device)")
            except Exception as e:
                logger.warning(
                    "SMS config from DB failed, using env fallback: %s", e)
                provider = get_sms_provider()
                logger.info("SMS provider: from env fallback")
        else:
            provider = get_sms_provider()
            logger.info("SMS provider: from env (no db)")
        ok = await provider.send_sms(to, message)
        logger.info("SMS provider.send_sms result: ok=%s, to=%s", ok, to)
        if not ok:
            logger.warning("SMS delivery failed: to=%s", to)
        return ok

    async def send_2fa_code(
        self, to: str, code: str, db: Optional[AsyncSession] = None
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name}: Your verification code is {code}. Valid for 5 minutes."
        return await self.send_sms(to, message, db=db)

    async def send_password_reset_code(
        self, to: str, code: str, db: Optional[AsyncSession] = None
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name}: Your password reset code is {code}. Valid for 1 hour."
        return await self.send_sms(to, message, db=db)

    async def send_order_notification(
        self, to: str, order_id: str, status: str, db: Optional[AsyncSession] = None
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name}: Order {order_id} status: {status}"
        return await self.send_sms(to, message, db=db)

    async def send_ticket_update(
        self, to: str, ticket_id: str, db: Optional[AsyncSession] = None
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name}: Your ticket {ticket_id} has been updated."
        return await self.send_sms(to, message, db=db)

    async def send_custom_notification(
        self, to: str, title: str, body: str, db: Optional[AsyncSession] = None
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name} - {title}: {body}"
        if len(message) > 160:
            message = message[:157] + "..."
        return await self.send_sms(to, message, db=db)

    async def send_invoice_notification(
        self,
        to: str,
        invoice_number: str,
        amount: float,
        due_date: str,
        db: Optional[AsyncSession] = None,
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name}: Invoice {invoice_number} for {amount:.2f} DZD. Due: {due_date}"
        if len(message) > 160:
            message = message[:157] + "..."
        return await self.send_sms(to, message, db=db)

    async def send_quote_notification(
        self,
        to: str,
        quote_id: str,
        status: str,
        message: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> bool:
        app_name = await self._get_app_name(db)
        if message:
            sms_message = f"{app_name}: {message}"
        else:
            status_display = status.replace("_", " ").title()
            sms_message = f"{app_name}: Quote {quote_id} status: {status_display}"
        if len(sms_message) > 160:
            sms_message = sms_message[:157] + "..."
        return await self.send_sms(to, sms_message, db=db)

    async def send_payment_confirmation(
        self,
        to: str,
        invoice_number: str,
        amount: float,
        db: Optional[AsyncSession] = None,
    ) -> bool:
        app_name = await self._get_app_name(db)
        message = f"{app_name}: Payment of {amount:.2f} DZD received for invoice {invoice_number}. Thank you!"
        if len(message) > 160:
            message = message[:157] + "..."
        return await self.send_sms(to, message, db=db)

    async def send_vps_alert(
        self,
        to: str,
        vps_name: str,
        alert_type: str,
        message: str,
        db: Optional[AsyncSession] = None,
    ) -> bool:
        app_name = await self._get_app_name(db)
        sms_message = f"{app_name} VPS Alert [{vps_name}]: {alert_type} - {message}"
        if len(sms_message) > 160:
            sms_message = sms_message[:157] + "..."
        return await self.send_sms(to, sms_message, db=db)

    async def send_billing_notification(
        self, to: str, message: str, db: Optional[AsyncSession] = None
    ) -> bool:
        app_name = await self._get_app_name(db)
        sms_message = f"{app_name} Billing: {message}"
        if len(sms_message) > 160:
            sms_message = sms_message[:157] + "..."
        return await self.send_sms(to, sms_message, db=db)

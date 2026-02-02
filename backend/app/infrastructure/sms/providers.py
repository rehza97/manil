"""
SMS provider implementations.

- Twilio: API; credentials from DB (admin UI) or env fallback.
- Custom: queues to DB; Flutter app polls /sms/app/* (device delivery). Custom forces sms/.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from app.config.settings import get_settings
from app.config.database import AsyncSessionLocal
from app.infrastructure.sms.repository import SMSRepository
from app.core.logging import logger

settings = get_settings()


class SMSProvider(ABC):
    """Base class for SMS providers."""

    @abstractmethod
    async def send_sms(self, to: str, message: str) -> bool:
        """Send SMS via provider."""
        pass


class TwilioProvider(SMSProvider):
    """Twilio SMS provider. Credentials from config dict or env."""

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
    ):
        tw = account_sid or settings.TWILIO_ACCOUNT_SID
        tok = auth_token or settings.TWILIO_AUTH_TOKEN
        fn = from_number or getattr(
            settings, "TWILIO_FROM_NUMBER", None
        ) or getattr(settings, "TWILIO_PHONE_NUMBER", None)
        self.account_sid = (tw or "").strip()
        self.auth_token = (tok or "").strip()
        self.from_number = (fn or "").strip()

    async def send_sms(self, to: str, message: str) -> bool:
        """
        Send SMS via Twilio.

        Args:
            to: Recipient phone number (E.164 format)
            message: SMS message content

        Returns:
            True if SMS sent successfully, False otherwise
        """
        if not self.account_sid or not self.auth_token:
            logger.warning("Twilio credentials not configured")
            return False

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)
            msg = client.messages.create(
                body=message,
                from_=self.from_number or None,
                to=to,
            )
            logger.info("SMS sent via Twilio: sid=%s", getattr(msg, "sid", ""))
            return True
        except Exception as e:
            logger.error("Twilio send error: %s", e)
            return False


class InfobipProvider(SMSProvider):
    """Infobip SMS provider implementation (placeholder)."""

    def __init__(self):
        self.api_key = getattr(settings, "INFOBIP_API_KEY", None)
        self.base_url = getattr(settings, "INFOBIP_BASE_URL", None)
        self.from_number = getattr(settings, "INFOBIP_FROM_NUMBER", None)

    async def send_sms(self, to: str, message: str) -> bool:
        """
        Send SMS via Infobip.

        Args:
            to: Recipient phone number
            message: SMS message content

        Returns:
            True if SMS sent successfully, False otherwise
        """
        if not self.api_key or not self.base_url:
            print("⚠️  Infobip credentials not configured")
            return False

        try:
            import httpx

            headers = {
                "Authorization": f"App {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "messages": [
                    {
                        "from": self.from_number,
                        "destinations": [{"to": to}],
                        "text": message,
                    }
                ]
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/sms/2/text/advanced",
                    headers=headers,
                    json=payload,
                )

            return response.status_code == 200
        except Exception as e:
            print(f"❌ Infobip send error: {e}")
            return False


class CustomSMSProvider(SMSProvider):
    """Custom SMS provider that queues messages for Flutter app to send."""

    async def send_sms(self, to: str, message: str) -> bool:
        """
        Queue SMS message for sending via custom gateway (Flutter app).

        Args:
            to: Recipient phone number
            message: SMS message content

        Returns:
            True if message is successfully queued, False otherwise
        """
        logger.info(
            "Custom SMS provider: queuing to=%s (Flutter app will poll /sms/app and send from device)",
            to,
        )
        try:
            async with AsyncSessionLocal() as db:
                repo = SMSRepository(db)
                sms_message = await repo.create_message(phone_number=to, message=message)
                logger.info(
                    "SMS queued: id=%s, to=%s, status=pending (Flutter app picks up and sends)",
                    sms_message.id,
                    to,
                )
                return True
        except Exception as e:
            logger.error("Failed to queue SMS: to=%s, error=%s", to, e)
            return False


class MockSMSProvider(SMSProvider):
    """Mock SMS provider for testing."""

    async def send_sms(self, to: str, message: str) -> bool:
        """
        Mock SMS sending (logs only).

        Args:
            to: Recipient phone number
            message: SMS message content

        Returns:
            Always True
        """
        print(f"📱 [MOCK SMS] To: {to}")
        print(f"📱 [MOCK SMS] Message: {message}")
        return True


def get_sms_provider() -> SMSProvider:
    """
    Get SMS provider from env (fallback when DB not used).
    Prefer get_sms_provider_for_config() with get_sms_config(db) when db available.
    """
    provider = (getattr(settings, "SMS_PROVIDER", None)
                or "custom").strip().lower()
    if provider == "twilio":
        return TwilioProvider()
    if provider == "infobip":
        return InfobipProvider()
    if provider == "custom":
        return CustomSMSProvider()
    return MockSMSProvider()


def get_sms_provider_for_config(config: Dict[str, Any]) -> SMSProvider:
    """
    Always use Custom provider so all SMS is queued and the Flutter app sends from the phone.
    """
    return CustomSMSProvider()

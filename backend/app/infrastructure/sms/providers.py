"""
SMS provider implementations.

Supports multiple SMS providers:
- Twilio
- Infobip (planned)
- Custom (via Flutter app)
"""

from abc import ABC, abstractmethod
from typing import Optional

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
    """Twilio SMS provider implementation."""

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = getattr(
            settings, "TWILIO_FROM_NUMBER", None
        ) or getattr(settings, "TWILIO_PHONE_NUMBER", None)

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
            print("⚠️  Twilio credentials not configured")
            return False

        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)

            message = client.messages.create(
                body=message,
                from_=self.from_number,
                to=to
            )

            print(f"✅ SMS sent via Twilio: {message.sid}")
            return True
        except Exception as e:
            print(f"❌ Twilio send error: {e}")
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
        try:
            async with AsyncSessionLocal() as db:
                repo = SMSRepository(db)
                sms_message = await repo.create_message(phone_number=to, message=message)
                logger.info(
                    f"✅ SMS queued for sending: id={sms_message.id}, to={to}"
                )
                return True
        except Exception as e:
            logger.error(f"❌ Failed to queue SMS: {e}")
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
    Get configured SMS provider.

    Returns:
        SMSProvider instance based on settings
    """
    provider = settings.SMS_PROVIDER.lower()

    if provider == "twilio":
        return TwilioProvider()
    elif provider == "infobip":
        return InfobipProvider()
    elif provider == "custom":
        return CustomSMSProvider()
    else:
        return MockSMSProvider()

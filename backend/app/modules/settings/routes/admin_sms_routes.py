"""
Admin SMS settings API routes.

Endpoints for testing SMS configuration.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.settings import get_settings
from app.core.dependencies import require_permission
from app.core.logging import logger
from app.core.permissions import Permission
from app.infrastructure.sms.service import SMSService
from app.modules.auth.models import User

router = APIRouter(prefix="/sms", tags=["admin-sms-settings"])


class SMSTestResponse(BaseModel):
    """Response model for SMS test endpoint."""
    success: bool
    message: str


@router.post("/test", response_model=SMSTestResponse)
async def test_sms_configuration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SETTINGS_EDIT)),
) -> SMSTestResponse:
    """
    Test SMS configuration by sending a test SMS.
    Uses DB config (provider, Twilio keys) and respects notification gate.
    """
    try:
        from app.modules.settings.utils import get_app_name
        from app.modules.customers.repository import CustomerRepository

        settings = get_settings()
        try:
            app_name = await get_app_name(db)
        except Exception:
            app_name = settings.APP_NAME

        # Try to get phone from current user's customer record, or use admin phone from settings
        test_phone = None

        # Check if current user has associated customer with phone
        customer_repo = CustomerRepository(db)
        customer = await customer_repo.get_by_email(current_user.email)
        if customer and customer.phone and customer.phone.strip():
            test_phone = customer.phone.strip()
        else:
            # Fallback: try to get admin phone from settings or use a placeholder
            # Note: Admin phone might not be in settings, so we'll require it to be set
            test_phone = getattr(settings, "ADMIN_PHONE", None)
            if not test_phone:
                return SMSTestResponse(
                    success=False,
                    message="No phone number available for testing. Please ensure your user account has a phone number associated, or set ADMIN_PHONE in environment variables."
                )

        test_message = f"{app_name}: SMS configuration test. If you received this message, your SMS settings are working correctly! Test sent at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"

        sms_service = SMSService()
        success = await sms_service.send_sms(
            test_phone,
            test_message,
            db=db,
        )

        if success:
            logger.info(
                "SMS test successful - test SMS sent to %s", test_phone)
            return SMSTestResponse(
                success=True,
                message=f"Test SMS sent successfully to {test_phone}. Please check your device."
            )
        logger.error("SMS test failed - provider returned False")
        return SMSTestResponse(
            success=False,
            message="Failed to send test SMS. Please check your SMS provider configuration and credentials."
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"SMS test error: {error_msg}")

        # Provide more helpful error messages
        if "phone" in error_msg.lower() or "number" in error_msg.lower():
            return SMSTestResponse(
                success=False,
                message=f"Phone number error: {error_msg}. Please verify the phone number format."
            )
        elif "twilio" in error_msg.lower() or "api" in error_msg.lower():
            return SMSTestResponse(
                success=False,
                message=f"SMS provider API error: {error_msg}. Please verify your Twilio credentials or custom provider configuration."
            )
        elif "gate" in error_msg.lower() or "disabled" in error_msg.lower():
            return SMSTestResponse(
                success=False,
                message=f"SMS notifications are disabled: {error_msg}. Please enable SMS notifications in notification settings."
            )
        else:
            return SMSTestResponse(
                success=False,
                message=f"SMS test failed: {error_msg}"
            )

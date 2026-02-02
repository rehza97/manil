"""
Admin notification settings API routes.

Endpoints for testing notification configuration and gates.
"""
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.settings import get_settings
from app.core.dependencies import require_permission
from app.core.logging import logger
from app.core.permissions import Permission
from app.infrastructure.email.service import EmailService
from app.infrastructure.sms.service import SMSService
from app.modules.auth.models import User

router = APIRouter(prefix="/notification",
                   tags=["admin-notification-settings"])


class NotificationTestResponse(BaseModel):
    """Response model for notification test endpoint."""
    success: bool
    message: str
    details: Dict[str, Any] = {}


@router.post("/test", response_model=NotificationTestResponse)
async def test_notification_configuration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SETTINGS_EDIT)),
) -> NotificationTestResponse:
    """
    Test notification configuration by checking gates and optionally sending test messages.
    Verifies that notification.email_enabled and notification.sms_enabled are respected.
    """
    try:
        from app.modules.settings.utils import (
            get_notification_email_enabled,
            get_notification_sms_enabled,
            get_app_name,
        )
        from app.modules.customers.repository import CustomerRepository

        settings = get_settings()
        try:
            app_name = await get_app_name(db)
        except Exception:
            app_name = settings.APP_NAME

        # Check notification gate status
        email_enabled = await get_notification_email_enabled(db)
        sms_enabled = await get_notification_sms_enabled(db)

        details = {
            "email_enabled": email_enabled,
            "sms_enabled": sms_enabled,
            "email_test_sent": False,
            "sms_test_sent": False,
        }

        messages = []

        # Test email if enabled
        if email_enabled:
            try:
                test_email = settings.ADMIN_EMAIL or settings.EMAIL_FROM or current_user.email
                if test_email:
                    email_service = EmailService()
                    subject = f"{app_name} Notification Test - Email"
                    html_body = f"""
                    <html>
                        <body>
                            <h2>Notification Configuration Test</h2>
                            <p>This is a test email to verify your notification settings.</p>
                            <p>Email notifications are <strong>enabled</strong> in system settings.</p>
                            <hr>
                            <p><small>Test sent at: {datetime.now(timezone.utc).isoformat()}</small></p>
                        </body>
                    </html>
                    """
                    text_body = f"This is a test email to verify your notification settings. Email notifications are enabled in system settings."

                    email_success = await email_service.send_email(
                        [test_email],
                        subject,
                        html_body,
                        text_body=text_body,
                        db=db,
                    )

                    if email_success:
                        details["email_test_sent"] = True
                        messages.append(f"Test email sent to {test_email}")
                    else:
                        messages.append(
                            f"Failed to send test email to {test_email}")
            except Exception as e:
                logger.warning(
                    f"Email test failed during notification test: {e}")
                messages.append(f"Email test error: {str(e)}")
        else:
            messages.append(
                "Email notifications are disabled in system settings")

        # Test SMS if enabled
        if sms_enabled:
            try:
                # Try to get phone from current user's customer record
                customer_repo = CustomerRepository(db)
                customer = await customer_repo.get_by_email(current_user.email)
                test_phone = None

                if customer and customer.phone and customer.phone.strip():
                    test_phone = customer.phone.strip()
                else:
                    test_phone = getattr(settings, "ADMIN_PHONE", None)

                if test_phone:
                    sms_service = SMSService()
                    sms_message = f"{app_name}: Notification test. SMS notifications are enabled."
                    sms_success = await sms_service.send_sms(
                        test_phone,
                        sms_message,
                        db=db,
                    )

                    if sms_success:
                        details["sms_test_sent"] = True
                        messages.append(f"Test SMS sent to {test_phone}")
                    else:
                        messages.append(
                            f"Failed to send test SMS to {test_phone}")
                else:
                    messages.append("No phone number available for SMS test")
            except Exception as e:
                logger.warning(
                    f"SMS test failed during notification test: {e}")
                messages.append(f"SMS test error: {str(e)}")
        else:
            messages.append(
                "SMS notifications are disabled in system settings")

        # Determine overall success
        success = True
        if not email_enabled and not sms_enabled:
            success_message = "Both email and SMS notifications are disabled. No test messages were sent."
        elif details.get("email_test_sent") or details.get("sms_test_sent"):
            success_message = "Notification test completed. " + \
                " ".join(messages)
        else:
            success_message = "Notification gate check completed. " + \
                " ".join(messages)
            # Not a failure if gates are working correctly
            if not (email_enabled or sms_enabled):
                success = True
            else:
                success = False

        logger.info(
            "Notification test completed - email_enabled=%s, sms_enabled=%s",
            email_enabled, sms_enabled
        )

        return NotificationTestResponse(
            success=success,
            message=success_message,
            details=details
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Notification test error: {error_msg}")
        return NotificationTestResponse(
            success=False,
            message=f"Notification test failed: {error_msg}",
            details={}
        )

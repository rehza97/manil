"""
Admin SMS settings API routes.

Endpoints for testing SMS configuration and viewing the SMS queue.
"""
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.settings import get_settings
from app.core.dependencies import require_permission
from app.core.logging import logger
from app.core.permissions import Permission
from app.infrastructure.sms.repository import SMSRepository
from app.infrastructure.sms.models import SMSStatus
from app.infrastructure.sms.providers import CustomSMSProvider
from app.infrastructure.sms.service import SMSService
from app.modules.auth.models import User

router = APIRouter(prefix="/sms", tags=["admin-sms-settings"])


class SMSTestResponse(BaseModel):
    """Response model for SMS test endpoint."""
    success: bool
    message: str


class SMSQueueItem(BaseModel):
    """Single SMS message in queue list."""
    id: str
    phone_number: str
    message: str
    status: str
    error_message: Optional[str] = None
    device_id: Optional[str] = None
    created_at: str
    updated_at: str
    sent_at: Optional[str] = None


class SMSQueueResponse(BaseModel):
    """Response model for SMS queue list."""
    items: List[SMSQueueItem]
    total: int


class SendSMSRequest(BaseModel):
    """Request body for manual SMS send."""
    phone: str
    message: str


@router.get("/queue", response_model=SMSQueueResponse)
async def list_sms_queue(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status: pending, sent, failed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SMS_VIEW)),
) -> SMSQueueResponse:
    """
    List SMS queue messages for admin visibility.
    Shows whether the system is creating a queue (pending/sent/failed).
    """
    status_filter = None
    if status and status in ("pending", "sent", "failed"):
        status_filter = SMSStatus(status)
    logger.info(
        "SMS queue GET /queue: skip=%s, limit=%s, status=%s (table: sms_messages)",
        skip,
        limit,
        status or "all",
    )
    repo = SMSRepository(db)
    messages = await repo.list_messages(skip=skip, limit=limit, status=status_filter)
    logger.info("SMS queue GET /queue result: %s message(s) returned", len(messages))
    items = [
        SMSQueueItem(
            id=str(m.id),
            phone_number=m.phone_number,
            message=(m.message[:200] + "..." if len(m.message) > 200 else m.message),
            status=m.status.value,
            error_message=m.error_message,
            device_id=m.device_id,
            created_at=m.created_at.isoformat() if m.created_at else "",
            updated_at=m.updated_at.isoformat() if m.updated_at else "",
            sent_at=m.sent_at.isoformat() if m.sent_at else None,
        )
        for m in messages
    ]
    return SMSQueueResponse(items=items, total=len(items))


@router.post("/send", response_model=SMSTestResponse)
async def send_sms_manual(
    body: SendSMSRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SMS_SEND)),
) -> SMSTestResponse:
    """
    Send an SMS manually (admin dashboard).
    Requires phone number and message. Always queues via Custom provider (bypasses
    notification.sms_enabled gate) so the Flutter app can send from the device.
    """
    phone = (body.phone or "").strip()
    message = (body.message or "").strip()
    if not phone:
        return SMSTestResponse(
            success=False,
            message="Phone number is required.",
        )
    if not message:
        return SMSTestResponse(
            success=False,
            message="Message is required.",
        )
    logger.info(
        "Manual SMS send requested: to=%s, user=%s (Custom provider, gate bypassed -> queue -> Flutter app)",
        phone,
        current_user.id,
    )
    try:
        # Bypass SMSService gate: always queue via Custom provider so manual send creates a row
        provider = CustomSMSProvider()
        success = await provider.send_sms(phone, message)
        if success:
            logger.info(
                "Manual SMS result: success=True, to=%s, user=%s (message queued; Flutter app will send from device)",
                phone,
                current_user.id,
            )
            return SMSTestResponse(
                success=True,
                message=f"SMS sent successfully to {phone}.",
            )
        logger.warning("Manual SMS result: success=False, to=%s (provider returned False)", phone)
        return SMSTestResponse(
            success=False,
            message="Failed to send SMS. Check provider configuration.",
        )
    except Exception as e:
        error_msg = str(e)
        logger.error("Manual SMS send error: %s", error_msg)
        if "phone" in error_msg.lower() or "number" in error_msg.lower():
            return SMSTestResponse(
                success=False,
                message=f"Phone error: {error_msg}. Verify phone format.",
            )
        if "gate" in error_msg.lower() or "disabled" in error_msg.lower():
            return SMSTestResponse(
                success=False,
                message="SMS is disabled. Enable SMS in notification settings.",
            )
        return SMSTestResponse(
            success=False,
            message=f"SMS send failed: {error_msg}",
        )


@router.post("/test", response_model=SMSTestResponse)
async def test_sms_configuration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SMS_SEND)),
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

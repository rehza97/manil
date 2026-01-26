"""SMS API routes for Flutter app integration."""
import uuid
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.infrastructure.sms.repository import SMSRepository
from app.infrastructure.sms.models import SMSStatus
from app.core.logging import logger

router = APIRouter(prefix="/sms/app", tags=["sms"])


# Request/Response Models
class DeviceInfo(BaseModel):
    """Device information from Flutter app."""

    device_id: str
    device_name: str
    app_version: str
    android_version: str


class HeartbeatRequest(BaseModel):
    """Heartbeat request from Flutter app."""

    device_id: str
    device_name: str
    app_version: str
    android_version: str


class HeartbeatResponse(BaseModel):
    """Heartbeat response with device token."""

    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None


class SMSUpdateItem(BaseModel):
    """SMS status update item."""

    sms_id: str
    status: str  # "sent" or "failed"
    error_message: Optional[str] = None
    delivery_status: Optional[str] = None


class SMSUpdateRequest(BaseModel):
    """SMS status update request from Flutter app."""

    device_info: DeviceInfo
    sms_updates: List[SMSUpdateItem]


class SMSUpdateResponse(BaseModel):
    """SMS status update response."""

    success: bool
    message: str


# Simple device token storage (in-memory for now, can be moved to Redis/DB later)
# NOTE: For production, this should be moved to Redis or a database table
# to persist tokens across server restarts and enable multi-instance deployments
_device_tokens: dict[str, dict] = {}


def _generate_device_token(device_id: str) -> str:
    """Generate a simple device token."""
    # In production, use JWT or similar
    import secrets
    return secrets.token_urlsafe(32)


def _verify_device_token(token: Optional[str]) -> Optional[str]:
    """
    Verify device token and return device_id.

    Args:
        token: Device token from X-Device-Token header

    Returns:
        Device ID if token is valid, None otherwise
    """
    if not token:
        return None

    for device_id, token_data in _device_tokens.items():
        if token_data.get("token") == token:
            # Check expiry
            expires_at = token_data.get("expires_at")
            if expires_at and expires_at < datetime.now(timezone.utc):
                continue
            return device_id

    return None


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(
    request: HeartbeatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Device heartbeat/registration endpoint.

    Flutter app calls this to register device and get authentication token.
    """
    try:
        device_id = request.device_id

        # Generate or retrieve device token
        if device_id not in _device_tokens:
            token = _generate_device_token(device_id)
            expires_at = datetime.now(timezone.utc) + timedelta(days=30)

            _device_tokens[device_id] = {
                "token": token,
                "device_id": device_id,
                "device_name": request.device_name,
                "expires_at": expires_at,
                "last_seen": datetime.now(timezone.utc),
            }
        else:
            # Update last seen
            _device_tokens[device_id]["last_seen"] = datetime.now(timezone.utc)
            token = _device_tokens[device_id]["token"]
            expires_at = _device_tokens[device_id]["expires_at"]

        logger.info(f"Device heartbeat: {device_id} ({request.device_name})")

        return HeartbeatResponse(
            success=True,
            data={
                "access_token": token,
                "device_id": device_id,
                "token_expires_at": expires_at.isoformat() if expires_at else None,
            },
        )
    except Exception as e:
        logger.error(f"Error in heartbeat: {e}")
        return HeartbeatResponse(success=False, message=str(e))


@router.get("/pending")
async def get_pending_messages(
    device_id: str = Query(..., description="Device ID"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of messages"),
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get pending SMS messages for device.

    Flutter app polls this endpoint to get messages to send.
    """
    try:
        # Verify device token (optional for now, but recommended)
        verified_device_id = _verify_device_token(x_device_token)
        if verified_device_id and verified_device_id != device_id:
            raise HTTPException(status_code=403, detail="Device ID mismatch")

        repo = SMSRepository(db)
        messages = await repo.get_pending_messages(device_id=device_id, limit=limit)

        # Format response as expected by Flutter app
        result = []
        for msg in messages:
            # Assign device_id to message if not already assigned
            if not msg.device_id:
                msg.device_id = device_id
                await db.commit()
                await db.refresh(msg)

            result.append({
                "id": str(msg.id),
                "phone_number": msg.phone_number,
                "message": msg.message,
            })

        logger.debug(f"Returning {len(result)} pending messages for device {device_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pending messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update", response_model=SMSUpdateResponse)
async def update_sms_status(
    request: SMSUpdateRequest,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Update SMS message status after sending.

    Flutter app calls this to report whether messages were sent successfully.
    """
    try:
        # Verify device token
        verified_device_id = _verify_device_token(x_device_token)
        if not verified_device_id:
            # Allow without token for now, but log warning
            logger.warning("SMS update called without valid device token")
            verified_device_id = request.device_info.device_id

        repo = SMSRepository(db)
        updated_count = 0

        for update in request.sms_updates:
            try:
                message_id = uuid.UUID(update.sms_id)
                status = (
                    SMSStatus.SENT if update.status == "sent" else SMSStatus.FAILED
                )

                await repo.update_message_status(
                    message_id=message_id,
                    status=status,
                    device_id=verified_device_id,
                    error_message=update.error_message,
                )
                updated_count += 1
                logger.info(
                    f"Updated SMS {update.sms_id} to {status.value} by device {verified_device_id}"
                )
            except ValueError:
                logger.warning(f"Invalid SMS ID format: {update.sms_id}")
            except Exception as e:
                logger.error(f"Error updating SMS {update.sms_id}: {e}")

        return SMSUpdateResponse(
            success=True, message=f"Updated {updated_count} message(s)"
        )

    except Exception as e:
        logger.error(f"Error updating SMS status: {e}")
        return SMSUpdateResponse(success=False, message=str(e))

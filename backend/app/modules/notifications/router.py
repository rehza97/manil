"""Notifications API and SSE stream."""
import asyncio
import json
import logging
import time
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_VIEW)),
):
    """List notifications for the current user."""
    repo = NotificationRepository(db)
    skip = (page - 1) * page_size
    items, total = await repo.list_for_user(
        str(current_user.id), skip=skip, limit=page_size, unread_only=unread_only
    )
    total_pages = (total + page_size - 1) // page_size if total else 0
    return NotificationListResponse(
        data=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get unread notification count."""
    repo = NotificationRepository(db)
    count = await repo.unread_count(str(current_user.id))
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_VIEW)),
):
    """Mark a notification as read."""
    repo = NotificationRepository(db)
    ok = await repo.mark_read(notification_id, str(current_user.id))
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.commit()
    return {"ok": True}


async def _sse_generator(user_id: str):
    keepalive_interval = 15
    try:
        redis = await get_redis()
    except Exception as e:
        logger.warning("Redis unavailable for notifications stream: %s", e)
        yield f"event: error\ndata: {json.dumps({'error': 'Notifications stream unavailable'})}\n\n"
        return
    try:
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"notifications:{user_id}")
        last_keepalive = time.monotonic()
        try:
            while True:
                msg = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                now = time.monotonic()
                if msg and msg.get("type") == "message" and msg.get("data"):
                    data = msg["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                    yield f"event: notification\ndata: {data}\n\n"
                    last_keepalive = now
                elif now - last_keepalive >= keepalive_interval:
                    yield ": keepalive\n\n"
                    last_keepalive = now
        finally:
            await pubsub.unsubscribe(f"notifications:{user_id}")
            await pubsub.close()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.exception("SSE notifications stream error: %s", e)
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"


@router.get("/stream")
async def stream_notifications(
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_VIEW)),
):
    """Stream notifications via SSE. Requires Authorization header."""
    return StreamingResponse(
        _sse_generator(str(current_user.id)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

"""
Notification preferences API routes.

Used for both /client/settings/notifications and /admin/settings/notifications.
"""
from typing import Any

from fastapi import APIRouter, Body, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.settings.service import UserNotificationPreferencesService

router = APIRouter(prefix="/notifications", tags=["notification-preferences"])


@router.get("", response_model=dict)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get current user's notification preferences."""
    svc = UserNotificationPreferencesService(db)
    return await svc.get(str(current_user.id))


@router.put("", response_model=dict)
async def update_notification_preferences(
    body: dict = Body(default_factory=dict),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Update current user's notification preferences."""
    svc = UserNotificationPreferencesService(db)
    return await svc.update(str(current_user.id), body)

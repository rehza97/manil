"""Notifications service."""
import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.redis import get_redis
from app.core.logging import logger as _log
from app.modules.auth.models import User
from app.modules.notifications.models import Notification
from app.modules.notifications.repository import NotificationRepository

logger = _log


async def create_notification(
    db: AsyncSession,
    user_id: Optional[str] = None,
    type: str = "",
    title: str = "",
    body: Optional[str] = None,
    link: Optional[str] = None,
    group_id: Optional[str] = None,
) -> Optional[Notification]:
    """
    Create an in-app notification and publish to Redis for SSE.
    
    Args:
        db: Database session
        user_id: User ID (required if group_id not provided)
        type: Notification type
        title: Notification title
        body: Notification body
        link: Optional link
        group_id: Optional notification group ID (if provided, creates notifications for all group members)
    
    Returns:
        Created Notification (if single user) or None (if group)
    """
    # If group_id provided, create notifications for all group members
    if group_id:
        return await create_group_notification(db, group_id, type, title, body, link)
    
    # Single user notification (backward compatible)
    if not user_id:
        logger.warning("create_notification called without user_id or group_id")
        return None
    
    repo = NotificationRepository(db)
    try:
        n = await repo.create(
            user_id=user_id,
            type=type,
            title=title,
            body=body or "",
            link=link,
        )
        await db.commit()
        try:
            redis = await get_redis()
            payload = json.dumps({
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body or "",
                "link": n.link or "",
                "created_at": n.created_at.isoformat() if n.created_at else None,
            })
            await redis.publish(f"notifications:{user_id}", payload)
        except Exception as e:
            logger.warning("Failed to publish notification to Redis: %s", e)
        return n
    except Exception as e:
        logger.warning("Failed to create notification: %s", e)
        await db.rollback()
        return None


async def create_group_notification(
    db: AsyncSession,
    group_id: str,
    type: str,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
) -> Optional[Notification]:
    """
    Create notifications for all members of a notification group.
    
    Args:
        db: Database session
        group_id: Notification group ID
        type: Notification type
        title: Notification title
        body: Notification body
        link: Optional link
    
    Returns:
        None (group notifications don't return a single notification)
    """
    from app.modules.notifications.services.group_service import NotificationGroupService
    
    try:
        service = NotificationGroupService(db)
        user_ids = await service.get_group_members(group_id)
        
        if not user_ids:
            logger.info(f"No members found for notification group {group_id}")
            return None
        
        repo = NotificationRepository(db)
        created_count = 0
        
        # Create notification for each user
        for user_id in user_ids:
            try:
                n = await repo.create(
                    user_id=user_id,
                    type=type,
                    title=title,
                    body=body or "",
                    link=link,
                )
                created_count += 1
                
                # Publish to Redis for SSE
                try:
                    redis = await get_redis()
                    payload = json.dumps({
                        "id": str(n.id),
                        "type": n.type,
                        "title": n.title,
                        "body": n.body or "",
                        "link": n.link or "",
                        "created_at": n.created_at.isoformat() if n.created_at else None,
                    })
                    await redis.publish(f"notifications:{user_id}", payload)
                except Exception as e:
                    logger.warning(f"Failed to publish notification to Redis for user {user_id}: {e}")
            except Exception as e:
                logger.warning(f"Failed to create notification for user {user_id}: {e}")
        
        await db.commit()
        logger.info(f"Created {created_count} notifications for group {group_id} ({len(user_ids)} members)")
        return None
        
    except Exception as e:
        logger.error(f"Failed to create group notification: {e}", exc_info=True)
        await db.rollback()
        return None


async def user_id_by_email(db: AsyncSession, email: str) -> Optional[str]:
    """Resolve user id by email."""
    r = await db.execute(select(User.id).where(User.email == email))
    uid = r.scalar_one_or_none()
    return str(uid) if uid else None

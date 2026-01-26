"""Notifications repository."""
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: str,
        type: str,
        title: str,
        body: Optional[str] = None,
        link: Optional[str] = None,
    ) -> Notification:
        n = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body or "",
            link=link,
        )
        self.db.add(n)
        await self.db.flush()
        await self.db.refresh(n)
        return n

    async def get_by_id(self, notification_id: UUID, user_id: str) -> Optional[Notification]:
        q = select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        )
        r = await self.db.execute(q)
        return r.scalar_one_or_none()

    async def list_for_user(
        self, user_id: str, skip: int = 0, limit: int = 50, unread_only: bool = False
    ) -> tuple[list[Notification], int]:
        base = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            base = base.where(Notification.read_at.is_(None))
        count_q = select(func.count()).select_from(base.subquery())
        res = await self.db.execute(count_q)
        total = res.scalar() or 0
        q = (
            base.order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        r = await self.db.execute(q)
        return list(r.scalars().all()), total

    async def unread_count(self, user_id: str) -> int:
        q = select(func.count()).select_from(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
        r = await self.db.execute(q)
        return r.scalar() or 0

    async def mark_read(self, notification_id: UUID, user_id: str) -> bool:
        from datetime import datetime, timezone

        n = await self.get_by_id(notification_id, user_id)
        if not n:
            return False
        n.read_at = datetime.now(timezone.utc)
        await self.db.flush()
        return True

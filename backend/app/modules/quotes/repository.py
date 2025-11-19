"""
Quote repository.

Data access layer for quote management.
"""
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload

from app.modules.quotes.models import Quote, QuoteItem, QuoteTimeline, QuoteStatus
from app.modules.quotes.schemas import QuoteItemCreate


class QuoteRepository:
    """Quote data access layer."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        status: Optional[QuoteStatus] = None,
        include_deleted: bool = False
    ) -> List[Quote]:
        """Get all quotes with optional filters."""
        query = select(Quote).options(
            selectinload(Quote.items),
            selectinload(Quote.customer),
            selectinload(Quote.created_by)
        )

        # Apply filters
        if not include_deleted:
            query = query.where(Quote.deleted_at.is_(None))

        if customer_id:
            query = query.where(Quote.customer_id == customer_id)

        if status:
            query = query.where(Quote.status == status)

        # Only get latest versions by default
        query = query.where(Quote.is_latest_version == True)

        query = query.order_by(desc(Quote.created_at)).offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        customer_id: Optional[str] = None,
        status: Optional[QuoteStatus] = None,
        include_deleted: bool = False
    ) -> int:
        """Count quotes with optional filters."""
        query = select(func.count(Quote.id))

        if not include_deleted:
            query = query.where(Quote.deleted_at.is_(None))

        if customer_id:
            query = query.where(Quote.customer_id == customer_id)

        if status:
            query = query.where(Quote.status == status)

        query = query.where(Quote.is_latest_version == True)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_by_id(self, quote_id: str, include_deleted: bool = False) -> Optional[Quote]:
        """Get quote by ID."""
        query = select(Quote).options(
            selectinload(Quote.items),
            selectinload(Quote.customer),
            selectinload(Quote.created_by),
            selectinload(Quote.approved_by),
            selectinload(Quote.timeline_events)
        ).where(Quote.id == quote_id)

        if not include_deleted:
            query = query.where(Quote.deleted_at.is_(None))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_quote_number(self, quote_number: str, include_deleted: bool = False) -> Optional[Quote]:
        """Get quote by quote number."""
        query = select(Quote).options(
            selectinload(Quote.items)
        ).where(Quote.quote_number == quote_number)

        if not include_deleted:
            query = query.where(Quote.deleted_at.is_(None))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_quote_versions(self, quote_id: str) -> List[Quote]:
        """Get all versions of a quote."""
        # Get the original quote to find all versions
        original_query = select(Quote).where(Quote.id == quote_id)
        original_result = await self.db.execute(original_query)
        original_quote = original_result.scalar_one_or_none()

        if not original_quote:
            return []

        # Find the root quote (either this one or its parent)
        root_id = original_quote.parent_quote_id if original_quote.parent_quote_id else original_quote.id

        # Get all quotes with this root
        query = select(Quote).where(
            or_(Quote.id == root_id, Quote.parent_quote_id == root_id)
        ).order_by(Quote.version)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, quote: Quote) -> Quote:
        """Create a new quote."""
        self.db.add(quote)
        await self.db.flush()
        await self.db.refresh(quote, attribute_names=["items", "customer"])
        return quote

    async def update(self, quote: Quote) -> Quote:
        """Update a quote."""
        quote.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(quote)
        return quote

    async def delete(self, quote: Quote, hard_delete: bool = False) -> None:
        """Delete a quote (soft delete by default)."""
        if hard_delete:
            await self.db.delete(quote)
        else:
            quote.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def add_timeline_event(
        self,
        quote_id: str,
        event_type: str,
        event_description: str,
        created_by_id: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None
    ) -> QuoteTimeline:
        """Add a timeline event to a quote."""
        event = QuoteTimeline(
            quote_id=quote_id,
            event_type=event_type,
            event_description=event_description,
            created_by_id=created_by_id,
            old_value=old_value,
            new_value=new_value
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def get_expired_quotes(self) -> List[Quote]:
        """Get all quotes that have expired."""
        query = select(Quote).where(
            and_(
                Quote.valid_until < datetime.now(timezone.utc),
                Quote.status.in_([QuoteStatus.SENT, QuoteStatus.APPROVED]),
                Quote.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        """Commit the current transaction."""
        await self.db.commit()

    async def rollback(self) -> None:
        """Rollback the current transaction."""
        await self.db.rollback()

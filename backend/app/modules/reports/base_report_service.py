"""
Base Report Service

Provides date range handling, formatting utilities, and Redis cache helpers
for all report services. No database access.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import os

from app.config.redis import get_redis


class BaseReportService:
    """Abstract base with report utilities and cache helpers."""

    def _get_date_range(
        self,
        period: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[datetime, datetime]:
        """
        Resolve start and end dates from period or explicit params.

        Args:
            period: today, week, month, quarter, year
            start_date: Override start (optional)
            end_date: Override end (optional)

        Returns:
            (start_date, end_date) as timezone-aware datetimes
        """
        now = datetime.now(timezone.utc)
        end = end_date or now

        if start_date is not None:
            return (start_date, end)

        if period == "today":
            start = end.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start = end - timedelta(days=7)
        elif period == "month":
            start = end - timedelta(days=30)
        elif period == "quarter":
            start = end - timedelta(days=90)
        elif period == "year":
            start = end - timedelta(days=365)
        else:
            start = end - timedelta(days=30)

        return (start, end)

    def _format_currency(self, amount: float, currency: str = "DZD") -> str:
        """Format amount as currency string."""
        return f"{amount:,.2f} {currency}"

    def _format_percentage(self, value: float, total: float) -> float:
        """Return percentage of value over total; 0 if total is 0."""
        if total == 0:
            return 0.0
        return round((value / total) * 100, 2)

    def _format_duration(self, hours: float) -> str:
        """Format hours as human-readable duration."""
        if hours < 1:
            return f"{int(hours * 60)}m"
        if hours < 24:
            return f"{hours:.1f}h"
        days = hours / 24
        return f"{days:.1f}d"

    async def _cache_report(
        self, cache_key: str, file_path: str, ttl: int = 900
    ) -> None:
        """Store report file path in Redis."""
        try:
            redis = await get_redis()
            key = f"report:file:{cache_key}"
            await redis.setex(key, ttl, file_path)
        except Exception:
            pass

    async def _get_cached_report(self, cache_key: str) -> Optional[str]:
        """Get cached report file path if it exists on disk."""
        try:
            redis = await get_redis()
            key = f"report:file:{cache_key}"
            file_path = await redis.get(key)
            if file_path and os.path.isfile(file_path):
                return file_path
        except Exception:
            pass
        return None

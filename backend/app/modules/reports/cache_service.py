"""
Report Cache Service

Thin Redis wrapper for report file caching: get, set, invalidate by report type.
"""

import os
from typing import Optional

from app.config.redis import get_redis


class ReportCacheService:
    """Report-specific cache: file paths by key; invalidate by type."""

    PREFIX = "report:file:"
    DEFAULT_TTL = 3600

    async def get_report(self, key: str) -> Optional[str]:
        """Return cached file path if key exists and file exists."""
        try:
            redis = await get_redis()
            path = await redis.get(f"{self.PREFIX}{key}")
            if path and os.path.isfile(path):
                return path
        except Exception:
            pass
        return None

    async def set_report(self, key: str, file_path: str, ttl: int = DEFAULT_TTL) -> None:
        """Cache report file path."""
        try:
            redis = await get_redis()
            await redis.setex(f"{self.PREFIX}{key}", ttl, file_path)
        except Exception:
            pass

    async def invalidate_reports(self, report_type: str = "*") -> None:
        """Delete all keys matching report_type. Use '*' to clear all report cache."""
        try:
            redis = await get_redis()
            pattern = f"{self.PREFIX}*" if report_type == "*" else f"{self.PREFIX}*{report_type}*"
            keys = await redis.keys(pattern)
            if keys:
                await redis.delete(*keys)
        except Exception:
            pass

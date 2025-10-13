"""
Redis cache service implementation.
Provides caching utilities for application data and sessions.
"""
import json
from typing import Any, Optional
from redis.asyncio import Redis

from app.config.redis import get_redis
from app.config.settings import get_settings

settings = get_settings()


class CacheService:
    """Redis cache service for data and session management."""

    def __init__(self):
        self.redis: Optional[Redis] = None

    async def _get_client(self) -> Redis:
        """Get Redis client instance."""
        if self.redis is None:
            self.redis = await get_redis()
        return self.redis

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        redis = await self._get_client()
        value = await redis.get(key)

        if value is None:
            return None

        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with optional TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (optional)

        Returns:
            True if successful
        """
        redis = await self._get_client()

        if isinstance(value, (dict, list)):
            value = json.dumps(value)

        if ttl:
            return await redis.setex(key, ttl, value)
        else:
            return await redis.set(key, value)

    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key

        Returns:
            True if key was deleted
        """
        redis = await self._get_client()
        result = await redis.delete(key)
        return result > 0

    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if key exists
        """
        redis = await self._get_client()
        return await redis.exists(key) > 0

    async def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment numeric value in cache.

        Args:
            key: Cache key
            amount: Amount to increment by

        Returns:
            New value after increment
        """
        redis = await self._get_client()
        return await redis.incrby(key, amount)

    async def expire(self, key: str, ttl: int) -> bool:
        """
        Set expiration time for key.

        Args:
            key: Cache key
            ttl: Time to live in seconds

        Returns:
            True if expiration was set
        """
        redis = await self._get_client()
        return await redis.expire(key, ttl)

    async def get_ttl(self, key: str) -> int:
        """
        Get remaining TTL for key.

        Args:
            key: Cache key

        Returns:
            TTL in seconds, -1 if no expiration, -2 if key doesn't exist
        """
        redis = await self._get_client()
        return await redis.ttl(key)

    # Session management methods

    async def set_session(
        self,
        session_id: str,
        data: dict,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Store session data.

        Args:
            session_id: Session identifier
            data: Session data
            ttl: Time to live (defaults to CACHE_TTL_SESSION)

        Returns:
            True if successful
        """
        key = f"session:{session_id}"
        ttl = ttl or settings.CACHE_TTL_SESSION
        return await self.set(key, data, ttl)

    async def get_session(self, session_id: str) -> Optional[dict]:
        """
        Get session data.

        Args:
            session_id: Session identifier

        Returns:
            Session data or None if not found
        """
        key = f"session:{session_id}"
        return await self.get(key)

    async def delete_session(self, session_id: str) -> bool:
        """
        Delete session data.

        Args:
            session_id: Session identifier

        Returns:
            True if session was deleted
        """
        key = f"session:{session_id}"
        return await self.delete(key)

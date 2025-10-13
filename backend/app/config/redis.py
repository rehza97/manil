"""
Redis configuration and connection management.
Provides async Redis client for caching and session storage.
"""
from typing import Optional
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

from app.config.settings import get_settings

settings = get_settings()

# Global Redis connection pool
_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[redis.Redis] = None


async def init_redis() -> redis.Redis:
    """
    Initialize Redis connection pool.

    Returns:
        Redis client instance
    """
    global _redis_pool, _redis_client

    if _redis_client is not None:
        return _redis_client

    _redis_pool = ConnectionPool.from_url(
        settings.REDIS_URL,
        password=settings.REDIS_PASSWORD,
        encoding="utf-8",
        decode_responses=True,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
    )

    _redis_client = redis.Redis(connection_pool=_redis_pool)

    # Test connection
    try:
        await _redis_client.ping()
        print("✅ Redis connection established")
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        raise

    return _redis_client


async def get_redis() -> redis.Redis:
    """
    Get Redis client instance.

    Returns:
        Redis client

    Raises:
        RuntimeError: If Redis not initialized
    """
    if _redis_client is None:
        return await init_redis()
    return _redis_client


async def close_redis():
    """Close Redis connection and cleanup resources."""
    global _redis_pool, _redis_client

    if _redis_client:
        await _redis_client.close()
        _redis_client = None

    if _redis_pool:
        await _redis_pool.disconnect()
        _redis_pool = None

    print("✅ Redis connection closed")

"""
Rate limiting decorators for specific endpoints.
Provides more granular control than global middleware.
"""
import functools
from typing import Callable
from fastapi import Request, HTTPException, status

from app.config.redis import get_redis
from app.core.logging import logger


class RateLimiter:
    """
    Rate limiter for specific endpoints.
    Uses Redis to track request counts per IP.
    """

    def __init__(self, requests: int, window: int, key_prefix: str):
        """
        Initialize rate limiter.

        Args:
            requests: Maximum number of requests allowed
            window: Time window in seconds
            key_prefix: Prefix for Redis keys (e.g., "auth_login")
        """
        self.requests = requests
        self.window = window
        self.key_prefix = key_prefix

    async def check_rate_limit(self, request: Request) -> None:
        """
        Check if request exceeds rate limit.

        Args:
            request: FastAPI request

        Raises:
            HTTPException: If rate limit is exceeded
        """
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        try:
            redis = await get_redis()
            if not redis:
                # Redis not available, skip rate limiting
                logger.warning("Redis not available, skipping rate limiting")
                return

            # Create rate limit key
            key = f"rate_limit:{self.key_prefix}:{client_ip}"

            # Increment request count
            current_requests = await redis.incr(key)

            # Set expiration on first request
            if current_requests == 1:
                await redis.expire(key, self.window)

            # Check if limit exceeded
            if current_requests > self.requests:
                logger.warning(
                    f"Rate limit exceeded for {self.key_prefix} "
                    f"from IP: {client_ip} ({current_requests}/{self.requests} requests)"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Maximum {self.requests} requests per {self.window} seconds allowed.",
                    headers={"Retry-After": str(self.window)},
                )

            logger.debug(
                f"Rate limit check passed for {self.key_prefix} "
                f"from IP: {client_ip} ({current_requests}/{self.requests} requests)"
            )

        except HTTPException:
            raise
        except Exception as e:
            # Log error but don't block request
            logger.error(f"Rate limiting error for {self.key_prefix}: {e}")


def rate_limit(requests: int, window: int, key_prefix: str):
    """
    Decorator to apply rate limiting to an endpoint.

    Args:
        requests: Maximum number of requests allowed
        window: Time window in seconds
        key_prefix: Prefix for Redis keys (e.g., "auth_login")

    Returns:
        Decorated function with rate limiting

    Example:
        @rate_limit(requests=5, window=300, key_prefix="auth_login")
        async def login(request: Request, ...):
            ...
    """
    limiter = RateLimiter(requests=requests, window=window, key_prefix=key_prefix)

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs (FastAPI injects it)
            request = kwargs.get('request') or next(
                (arg for arg in args if isinstance(arg, Request)), None
            )

            if request:
                await limiter.check_rate_limit(request)

            return await func(*args, **kwargs)

        return wrapper

    return decorator


# Predefined rate limiters for common authentication operations
# These provide stricter limits than global middleware

# Login: 5 attempts per 5 minutes (300 seconds)
login_rate_limit = rate_limit(requests=5, window=300, key_prefix="auth_login")

# Password reset request: 3 attempts per 15 minutes (900 seconds)
password_reset_rate_limit = rate_limit(
    requests=3, window=900, key_prefix="auth_password_reset"
)

# 2FA verification: 5 attempts per 5 minutes (300 seconds)
two_fa_rate_limit = rate_limit(requests=5, window=300, key_prefix="auth_2fa_verify")

# Registration: 3 attempts per hour (3600 seconds)
registration_rate_limit = rate_limit(
    requests=3, window=3600, key_prefix="auth_register"
)

# Token refresh: 10 attempts per minute (60 seconds)
token_refresh_rate_limit = rate_limit(
    requests=10, window=60, key_prefix="auth_token_refresh"
)

# 2FA setup required: 5 attempts per 15 minutes (900 seconds)
two_fa_setup_required_rate_limit = rate_limit(
    requests=5, window=900, key_prefix="auth_2fa_setup_required"
)

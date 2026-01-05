"""
Custom middleware for the FastAPI application.
Includes logging, rate limiting, CSRF protection, and request tracking.
"""
import time
import uuid
import secrets
from typing import Callable

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import logger, log_request
from app.config.redis import get_redis
from app.config.settings import get_settings

settings = get_settings()


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses.
    Adds request ID and tracks execution time.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details.

        Args:
            request: HTTP request
            call_next: Next middleware in chain

        Returns:
            HTTP response
        """
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Log request
        start_time = time.time()

        # Process request
        response = await call_next(request)

        # Calculate execution time
        process_time = time.time() - start_time

        # Add custom headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)

        # Log request details
        log_request(
            request.method,
            str(request.url.path),
            response.status_code,
            process_time * 1000  # Convert to milliseconds
        )

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to implement rate limiting.
    Uses Redis to track request counts per IP.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Check rate limit and process request.

        Args:
            request: HTTP request
            call_next: Next middleware in chain

        Returns:
            HTTP response

        Raises:
            HTTPException: If rate limit is exceeded
        """
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Skip rate limiting for health checks and status polling endpoints
        # These endpoints are designed to be polled frequently
        excluded_paths = [
            "/health",
            "/",
        ]
        # Exclude download-status and stats endpoints (frequent polling)
        if "/download-status" in request.url.path or "/stats" in request.url.path:
            return await call_next(request)
        
        if request.url.path in excluded_paths:
            return await call_next(request)

        try:
            redis = await get_redis()
            if redis:
                # Create rate limit key
                key = f"rate_limit:{client_ip}"

                # Increment request count
                current_requests = await redis.incr(key)

                # Set expiration on first request
                if current_requests == 1:
                    await redis.expire(key, 60)  # 60 seconds window

                # Check if limit exceeded
                if current_requests > settings.RATE_LIMIT_PER_MINUTE:
                    logger.warning(
                        f"Rate limit exceeded for IP: {client_ip} ({current_requests} requests)")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again later.",
                        headers={"Retry-After": "60"},
                    )

                # Add rate limit headers to response
                response = await call_next(request)
                response.headers["X-RateLimit-Limit"] = str(
                    settings.RATE_LIMIT_PER_MINUTE)
                response.headers["X-RateLimit-Remaining"] = str(
                    max(0, settings.RATE_LIMIT_PER_MINUTE - current_requests))
                return response
            else:
                # Redis not available, skip rate limiting
                logger.debug("Redis not available, skipping rate limiting")
                return await call_next(request)

        except HTTPException:
            raise
        except Exception as e:
            # Log error but don't block request
            logger.error(f"Rate limiting error: {e}")
            return await call_next(request)


class CORSHeadersMiddleware(BaseHTTPMiddleware):
    """
    Additional CORS headers middleware.
    Adds security headers to all responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add security headers to response.

        Args:
            request: HTTP request
            call_next: Next middleware in chain

        Returns:
            HTTP response with security headers
        """
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        # Content Security Policy for XSS protection
        # Allow Swagger UI CDN resources for documentation
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'"
        )

        return response


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF protection middleware.
    Validates CSRF tokens for state-changing operations.
    """

    # Methods that require CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    # Paths that are excluded from CSRF protection (e.g., login, public APIs)
    EXCLUDED_PATHS = {"/auth/login", "/auth/register",
                      "/health", "/docs", "/openapi.json"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Validate CSRF token for protected methods.

        Args:
            request: HTTP request
            call_next: Next middleware in chain

        Returns:
            HTTP response

        Raises:
            HTTPException: If CSRF token is missing or invalid
        """
        # Skip CSRF check for excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)

        # Skip CSRF check for safe methods
        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)

        # Get CSRF token from header
        csrf_token = request.headers.get("X-CSRF-Token")

        # Get CSRF token from cookie (for comparison)
        cookie_token = request.cookies.get("csrf_token")

        # Validate tokens
        if not csrf_token or not cookie_token or csrf_token != cookie_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed",
            )

        response = await call_next(request)

        # Generate new CSRF token if not present
        if not cookie_token:
            new_token = secrets.token_urlsafe(32)
            response.set_cookie(
                key="csrf_token",
                value=new_token,
                httponly=True,
                secure=True,
                samesite="strict",
                max_age=3600,
            )
            response.headers["X-CSRF-Token"] = new_token

        return response

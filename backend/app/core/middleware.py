"""
Custom middleware for the FastAPI application.
Includes logging, rate limiting, CSRF protection, and request tracking.
"""
import asyncio
import time
import uuid
import secrets
from typing import Callable

from anyio import EndOfStream
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.logging import logger, log_request
from app.config.redis import get_redis
from app.config.database import AsyncSessionLocal
from app.config.settings import get_settings
from app.modules.settings.utils import get_rate_limit_cached
from app.modules.audit.models import AuditLog, AuditAction
from app.modules.system.models import ApiRequestLog
from app.modules.system.request_log_utils import normalize_request_path

settings = get_settings()

API_REQUEST_LOG_PREFIX = "/api/v1/"
AUDIT_EXCLUDE_PATH_SUBSTRINGS = ("/health",)


async def _record_api_request(
    path: str,
    method: str,
    status_code: int,
    duration_ms: float,
) -> None:
    """Write one API request to api_request_logs (fire-and-forget)."""
    try:
        normalized = normalize_request_path(path)
        async with AsyncSessionLocal() as session:
            log = ApiRequestLog(
                request_path=normalized,
                request_method=method,
                status_code=status_code,
                duration_ms=duration_ms,
            )
            session.add(log)
            await session.commit()
    except Exception as e:
        logger.debug("API request log write skipped: %s", e)


async def _record_audit_api_request(
    path: str,
    method: str,
    status_code: int,
    duration_ms: float,
) -> None:
    """Write one API request to audit_logs (fire-and-forget)."""
    if any(exc in path for exc in AUDIT_EXCLUDE_PATH_SUBSTRINGS):
        return
    try:
        async with AsyncSessionLocal() as session:
            entry = AuditLog(
                action=AuditAction.API_REQUEST,
                resource_type="api",
                description=f"{method} {path} -> {status_code}",
                request_path=path,
                request_method=method,
                success=status_code < 400,
                extra_data={"duration_ms": duration_ms, "status_code": status_code},
            )
            session.add(entry)
            await session.commit()
    except Exception as e:
        logger.debug("Audit API request log write skipped: %s", e)


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
        try:
            response = await call_next(request)
        except EndOfStream:
            # Client disconnected before response was sent (stream closed).
            logger.debug("Client disconnected (EndOfStream) for %s %s", request.method, request.url.path)
            return Response(status_code=499)
        except RuntimeError as e:
            # BaseHTTPMiddleware can raise "No response returned." on client disconnects,
            # especially with streaming responses (SSE). Treat as disconnected client.
            if "No response returned" in str(e):
                return Response(status_code=204)
            raise

        # Calculate execution time
        process_time = time.time() - start_time

        # Add custom headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)

        # Log request details
        path_str = str(request.url.path)
        process_time_ms = process_time * 1000
        log_request(
            request.method,
            path_str,
            response.status_code,
            process_time_ms,
        )

        # Record API requests for performance metrics and audit (fire-and-forget)
        if path_str.startswith(API_REQUEST_LOG_PREFIX):
            asyncio.create_task(
                _record_api_request(
                    path_str,
                    request.method,
                    response.status_code,
                    process_time_ms,
                )
            )
            asyncio.create_task(
                _record_audit_api_request(
                    path_str,
                    request.method,
                    response.status_code,
                    process_time_ms,
                )
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
            try:
                return await call_next(request)
            except RuntimeError as e:
                if "No response returned" in str(e):
                    return Response(status_code=204)
                raise

        if request.url.path in excluded_paths:
            try:
                return await call_next(request)
            except RuntimeError as e:
                if "No response returned" in str(e):
                    return Response(status_code=204)
                raise

        async def _call_next() -> Response:
            try:
                return await call_next(request)
            except RuntimeError as e:
                if "No response returned" in str(e):
                    return Response(status_code=204)
                raise

        # Load config (do not swallow downstream exceptions)
        try:
            limit_cfg = await get_rate_limit_cached()
            enabled = limit_cfg.get("enabled", True)
            requests_per_minute = int(
                limit_cfg.get("requests_per_minute")
                or settings.RATE_LIMIT_PER_MINUTE
                or 60
            )
        except Exception as e:
            logger.warning("Rate limiting skipped: config error (%s)", e)
            return await _call_next()

        if not enabled:
            return await _call_next()

        # Redis interactions should never break requests or swallow handler errors
        try:
            redis = await get_redis()
            if not redis:
                logger.debug("Redis not available, skipping rate limiting")
                return await _call_next()

            key = f"rate_limit:{client_ip}"
            current_requests = await redis.incr(key)
            if current_requests == 1:
                await redis.expire(key, 60)

            if current_requests > requests_per_minute:
                logger.warning(
                    "Rate limit exceeded for IP %s (%s requests)",
                    client_ip,
                    current_requests,
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded. Please try again later."},
                    headers={"Retry-After": "60"},
                )

            response = await _call_next()
            response.headers["X-RateLimit-Limit"] = str(requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(
                max(0, requests_per_minute - current_requests)
            )
            return response
        except HTTPException:
            raise
        except Exception as e:
            msg = str(e).lower()
            if any(
                x in msg
                for x in (
                    "too many connections",
                    "connection refused",
                    "connection pool",
                )
            ):
                logger.warning(
                    "Rate limiting skipped: Redis connection issue (%s)", e
                )
            else:
                logger.warning("Rate limiting skipped: Redis error (%s)", e)
            return await _call_next()


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
        try:
            response = await call_next(request)
        except EndOfStream:
            logger.debug("Client disconnected (EndOfStream) for %s %s", request.method, request.url.path)
            return Response(status_code=499)
        except RuntimeError as e:
            if "No response returned" in str(e):
                return Response(status_code=204)
            raise

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
            try:
                return await call_next(request)
            except RuntimeError as e:
                if "No response returned" in str(e):
                    return Response(status_code=204)
                raise

        # Skip CSRF check for safe methods
        if request.method not in self.PROTECTED_METHODS:
            try:
                return await call_next(request)
            except RuntimeError as e:
                if "No response returned" in str(e):
                    return Response(status_code=204)
                raise

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

        try:
            response = await call_next(request)
        except RuntimeError as e:
            if "No response returned" in str(e):
                return Response(status_code=204)
            raise

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

"""
CloudManager FastAPI Application.
Main entry point for the backend API.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config.database import close_db, init_db
from app.config.redis import init_redis, close_redis
from app.config.settings import get_settings
from app.core.logging import logger, log_exception
from app.core.middleware import (
    CORSHeadersMiddleware,
    LoggingMiddleware,
    RateLimitMiddleware,
    CSRFProtectionMiddleware,
)

# Import routers
from app.modules.auth.router import router as auth_router
from app.modules.audit.router import router as audit_router
from app.modules.customers.router import router as customers_router
from app.modules.customers.kyc_router import router as kyc_router
from app.modules.customers.notes_router import router as notes_router
from app.modules.tickets.router import router as tickets_router
from app.modules.system.router import router as system_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    Handles startup and shutdown procedures.
    """
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📦 Environment: {settings.ENVIRONMENT}")

    # Initialize Redis
    logger.info("📦 Initializing Redis...")
    try:
        await init_redis()
        logger.info("✅ Redis initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️  Redis initialization failed: {e}")
        logger.warning("⚠️  Continuing without Redis cache")

    # Initialize database (only in development)
    if settings.ENVIRONMENT == "development" and settings.DEBUG:
        logger.info("🗄️  Initializing database...")
        await init_db()
        logger.info("✅ Database initialized successfully")

    logger.info("✅ Application startup complete")
    yield

    # Shutdown
    logger.info("🛑 Shutting down application...")
    await close_redis()
    await close_db()
    logger.info("✅ Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise Cloud & Hosting Management Platform",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Custom Middleware
app.add_middleware(CORSHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
# CSRF Protection disabled for development
# app.add_middleware(CSRFProtectionMiddleware)
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(RateLimitMiddleware)


# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for unhandled exceptions.

    Args:
        request: HTTP request
        exc: Exception that was raised

    Returns:
        JSON error response
    """
    request_id = getattr(request.state, "request_id", "unknown")
    log_exception(
        exc, f"Unhandled exception in {request.method} {request.url.path} (request_id: {request_id})")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": request_id,
        },
    )


# Health Check Endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint.

    Returns:
        Health status information
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["System"])
async def root():
    """
    Root endpoint.

    Returns:
        Welcome message
    """
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/api/docs" if settings.DEBUG else "Documentation disabled",
    }


# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(customers_router, prefix="/api/v1")
app.include_router(kyc_router, prefix="/api/v1")
app.include_router(notes_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(system_router, prefix="/api/v1")

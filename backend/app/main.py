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
from app.core.middleware import (
    CORSHeadersMiddleware,
    LoggingMiddleware,
    RateLimitMiddleware,
)

# TODO: Import routers as modules are created
# from app.modules.auth.router import router as auth_router
# from app.modules.customers.router import router as customers_router
# from app.modules.tickets.router import router as tickets_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    Handles startup and shutdown procedures.
    """
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📦 Environment: {settings.ENVIRONMENT}")

    # Initialize Redis
    print("📦 Initializing Redis...")
    try:
        await init_redis()
    except Exception as e:
        print(f"⚠️  Redis initialization failed: {e}")
        print("⚠️  Continuing without Redis cache")

    # Initialize database (only in development)
    if settings.ENVIRONMENT == "development" and settings.DEBUG:
        print("🗄️  Initializing database...")
        await init_db()

    yield

    # Shutdown
    print("🛑 Shutting down...")
    await close_redis()
    await close_db()


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
    # TODO: Log to proper logging system
    print(f"❌ Unhandled exception: {exc}")

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": getattr(request.state, "request_id", None),
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


# TODO: Include routers as modules are created
# app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"])
# app.include_router(customers_router, prefix="/api/v1", tags=["Customers"])
# app.include_router(tickets_router, prefix="/api/v1", tags=["Tickets"])

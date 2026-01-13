"""
CloudManager FastAPI Application.
Main entry point for the backend API.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

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
from app.modules.users.router import router as users_router
from app.modules.customers.router import router as customers_router
from app.modules.customers.kyc_router import router as kyc_router
from app.modules.customers.notes_router import router as notes_router
from app.modules.tickets.router import router as tickets_router
from app.modules.tickets.router_phase2 import router as tickets_phase2_router
from app.modules.tickets.attachments_router import router as ticket_attachments_router
from app.modules.tickets.routes.admin_support_routes import router as admin_support_router
from app.modules.products.routes import router as products_router
from app.modules.orders.routes import router as orders_router
from app.modules.quotes.routes import router as quotes_router
from app.modules.invoices.routes import router as invoices_router
from app.modules.reports.routes import router as reports_router
from app.modules.reports.admin_routes import router as admin_reports_router
from app.modules.settings.routes import router as settings_router
from app.modules.system.router import router as system_router
from app.modules.system.routes.maintenance_routes import router as maintenance_router
from app.modules.system.admin_logs_routes import router as admin_logs_router
from app.modules.hosting.routes.client import router as hosting_client_router
from app.modules.hosting.routes.admin import router as hosting_admin_router
from app.modules.hosting.routes.custom_images import router as custom_images_router
from app.modules.hosting.routes.plan_admin import router as plan_admin_router
from app.modules.hosting.dns_client_router import router as dns_client_router
from app.modules.hosting.dns_admin_router import router as dns_admin_router
from app.modules.hosting.routes.service_domains_client import router as service_domains_client_router
from app.modules.hosting.routes.service_domains_admin import router as service_domains_admin_router

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

    # Initialize database (seeds admin user, settings, demo data, etc.)
    logger.info("🗄️  Initializing database...")
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️  Database initialization failed: {e}")
        logger.warning("⚠️  Continuing startup - database may need manual initialization")
    
    # Always seed roles and permissions if they don't exist (idempotent)
    logger.info("🔐 Ensuring default roles and permissions are seeded...")
    try:
        from app.config.database import AsyncSessionLocal
        from app.modules.settings.service import seed_permissions_and_roles
        async with AsyncSessionLocal() as db:
            if await seed_permissions_and_roles(db):
                logger.info("✅ Roles and permissions verified")
            else:
                logger.warning("⚠️  Could not verify roles and permissions")
    except Exception as e:
        logger.warning(f"⚠️  Could not seed roles/permissions: {e}")
        logger.warning("⚠️  Continuing startup - roles may need to be seeded manually")

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
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    # #region agent log
    import json, os, time
    log_path = '/tmp/debug.log'
    try:
        body_str = None
        if hasattr(exc, 'body') and exc.body:
            try:
                body_str = exc.body.decode('utf-8') if isinstance(exc.body, bytes) else str(exc.body)
            except:
                body_str = str(exc.body)
        with open(log_path, 'a') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"D","location":"main.py:validation_handler","message":"Pydantic validation error","data":{"errors":exc.errors(),"body":body_str,"url":str(request.url),"method":request.method},"timestamp":int(time.time()*1000)})+'\n')
    except Exception as e:
        pass
    # #endregion
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )
    
    # Ensure CORS headers are present
    origin = request.headers.get("origin")
    if origin and origin in settings.CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for unhandled exceptions.

    Args:
        request: HTTP request
        exc: Exception that was raised

    Returns:
        JSON error response with CORS headers
    """
    request_id = getattr(request.state, "request_id", "unknown")
    log_exception(
        exc, f"Unhandled exception in {request.method} {request.url.path} (request_id: {request_id})")

    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": request_id,
        },
    )
    
    # Ensure CORS headers are present even in error responses
    origin = request.headers.get("origin")
    if origin and origin in settings.CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response


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
app.include_router(users_router, prefix="/api/v1")
app.include_router(customers_router, prefix="/api/v1")
app.include_router(kyc_router, prefix="/api/v1")
app.include_router(notes_router, prefix="/api/v1")
# Register phase2 router FIRST so specific routes like /templates are matched before catch-all routes
app.include_router(tickets_phase2_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(ticket_attachments_router, prefix="/api/v1")
app.include_router(admin_support_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(orders_router, prefix="/api/v1")
app.include_router(quotes_router)  # Quotes router already has /api/v1/quotes prefix
app.include_router(invoices_router)  # Invoices router already has /api/v1/invoices prefix
app.include_router(reports_router)  # Reports router already has /api/v1/reports prefix
app.include_router(admin_reports_router, prefix="/api/v1")  # Admin reports router
app.include_router(admin_logs_router, prefix="/api/v1")  # Admin logs router
app.include_router(settings_router)  # Settings router already has /api/v1/settings prefix
app.include_router(system_router, prefix="/api/v1")
app.include_router(maintenance_router, prefix="/api/v1")
app.include_router(hosting_client_router)  # Hosting client router already has /api/v1/hosting prefix
app.include_router(hosting_admin_router)  # Hosting admin router already has /api/v1/hosting/admin prefix
app.include_router(custom_images_router, prefix="/api/v1/hosting")  # Custom Docker images router
app.include_router(plan_admin_router)  # VPS Plan admin router already has /api/v1/hosting/admin/plans prefix
app.include_router(dns_client_router, prefix="/api/v1")  # DNS client router has /hosting/dns prefix
app.include_router(dns_admin_router, prefix="/api/v1")  # DNS admin router has /hosting/admin/dns prefix
app.include_router(service_domains_client_router, prefix="/api/v1")  # Service domains client router has /hosting/service-domains prefix
app.include_router(service_domains_admin_router, prefix="/api/v1")  # Service domains admin router has /hosting/admin/service-domains prefix

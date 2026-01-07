"""
VPS Hosting API routes.

Client and admin routes for VPS hosting management.
"""
from app.modules.hosting.routes.client import router as client_router
from app.modules.hosting.routes.admin import router as admin_router
from app.modules.hosting.routes.custom_images import router as custom_images_router
from app.modules.hosting.routes.plan_admin import router as plan_admin_router

__all__ = ["client_router", "admin_router", "custom_images_router", "plan_admin_router"]











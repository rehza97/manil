"""
Advanced Report Routes

Mounts all 28 report endpoints under /api/v1/reports/advanced.
Include this router in reports/routes.py with prefix="/advanced".
"""

from fastapi import APIRouter

from .advanced_routes_financial import router as financial_router
from .advanced_routes_sales import router as sales_router
from .advanced_routes_customers import router as customers_router
from .advanced_routes_operations import router as operations_router
from .advanced_routes_hosting import router as hosting_router
from .advanced_routes_audit import router as audit_router
from .advanced_routes_executive import router as executive_router


router = APIRouter(prefix="", tags=["reports-advanced"])

router.include_router(financial_router)
router.include_router(sales_router)
router.include_router(customers_router)
router.include_router(operations_router)
router.include_router(hosting_router)
router.include_router(audit_router)
router.include_router(executive_router)

"""Products module for catalogue management."""
from app.modules.products.models import Product, ProductCategory, ProductImage, ProductVariant
from app.modules.products.quote_models import QuoteRequest, QuoteLineItem, ServiceRequest
from app.modules.products.service import ProductService, CategoryService
from app.modules.products.routes import router

__all__ = [
    "Product",
    "ProductCategory",
    "ProductImage",
    "ProductVariant",
    "QuoteRequest",
    "QuoteLineItem",
    "ServiceRequest",
    "ProductService",
    "CategoryService",
    "router",
]

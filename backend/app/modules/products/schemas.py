"""Product catalogue request/response schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProductCategoryBase(BaseModel):
    """Base product category schema."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    icon_color: str = Field("#3B82F6", pattern=r"^#[0-9A-F]{6}$")
    display_order: int = Field(0, ge=0)


class ProductCategoryCreate(ProductCategoryBase):
    """Schema for creating a product category."""

    parent_category_id: Optional[str] = None


class ProductCategoryUpdate(BaseModel):
    """Schema for updating a product category."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    icon_color: Optional[str] = Field(None, pattern=r"^#[0-9A-F]{6}$")
    display_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ProductCategoryResponse(ProductCategoryBase):
    """Schema for product category response."""

    id: str
    parent_category_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductImageBase(BaseModel):
    """Base product image schema."""

    image_url: str
    alt_text: Optional[str] = Field(None, max_length=255)
    caption: Optional[str] = Field(None, max_length=2000)


class ProductImageCreate(ProductImageBase):
    """Schema for creating a product image."""

    display_order: int = Field(0, ge=0)
    is_primary: bool = Field(False)


class ProductImageResponse(ProductImageBase):
    """Schema for product image response."""

    id: str
    product_id: str
    display_order: int
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductVariantBase(BaseModel):
    """Base product variant schema."""

    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    price_adjustment: Optional[float] = None
    stock_quantity: int = Field(0, ge=0)


class ProductVariantCreate(ProductVariantBase):
    """Schema for creating a product variant."""

    display_order: int = Field(0, ge=0)
    is_active: bool = Field(True)


class ProductVariantResponse(ProductVariantBase):
    """Schema for product variant response."""

    id: str
    product_id: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    """Base product schema."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    short_description: Optional[str] = Field(None, max_length=500)
    sku: str = Field(..., min_length=1, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    regular_price: float = Field(..., gt=0)
    sale_price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, gt=0)
    stock_quantity: int = Field(0, ge=0)
    low_stock_threshold: int = Field(10, ge=0)


class ProductCreate(ProductBase):
    """Schema for creating a product."""

    category_id: str
    is_featured: bool = Field(False)
    is_active: bool = Field(True)
    is_visible: bool = Field(True)
    display_order: int = Field(0, ge=0)


class ProductUpdate(BaseModel):
    """Schema for updating a product."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    short_description: Optional[str] = Field(None, max_length=500)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    regular_price: Optional[float] = Field(None, gt=0)
    sale_price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, gt=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    category_id: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    is_visible: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0)


class ProductResponse(ProductBase):
    """Schema for product response."""

    id: str
    category_id: str
    is_featured: bool
    is_active: bool
    is_visible: bool
    display_order: int
    view_count: int
    rating: float
    review_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDetailResponse(ProductResponse):
    """Schema for detailed product response with images and variants."""

    images: list[ProductImageResponse] = []
    variants: list[ProductVariantResponse] = []
    category: ProductCategoryResponse


class ProductListResponse(BaseModel):
    """Schema for product list with pagination."""

    data: list[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProductFilterParams(BaseModel):
    """Schema for product filter parameters."""

    category_id: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    search: Optional[str] = None
    is_featured: Optional[bool] = None
    in_stock: Optional[bool] = None
    sort_by: str = Field("created_at", pattern="^(name|price|created_at|rating|view_count)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

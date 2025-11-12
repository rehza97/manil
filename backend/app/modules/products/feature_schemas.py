"""
Product features and specifications schemas.
Pydantic schemas for product features, specifications, and documentation.
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class FeatureType(str, Enum):
    """Type of product feature/specification."""
    SPECIFICATION = "specification"
    TECHNICAL_DETAIL = "technical_detail"
    FEATURE = "feature"


# ============================================================================
# PRODUCT SPECIFICATION
# ============================================================================


class ProductSpecificationBase(BaseModel):
    """Base specification schema."""

    name: str = Field(..., min_length=1, max_length=255, description="Specification name")
    value: str = Field(..., min_length=1, description="Specification value")
    unit: Optional[str] = Field(None, max_length=50, description="Unit of measurement")
    feature_type: FeatureType = Field(default=FeatureType.SPECIFICATION)
    category: Optional[str] = Field(None, max_length=100, description="Specification category")
    display_order: int = Field(default=0)


class ProductSpecificationCreate(ProductSpecificationBase):
    """Schema for creating product specification."""

    pass


class ProductSpecificationUpdate(BaseModel):
    """Schema for updating product specification."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    value: Optional[str] = Field(None, min_length=1)
    unit: Optional[str] = Field(None, max_length=50)
    feature_type: Optional[FeatureType] = None
    category: Optional[str] = Field(None, max_length=100)
    display_order: Optional[int] = None


class ProductSpecificationResponse(ProductSpecificationBase):
    """Response schema for product specification."""

    id: str
    product_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductSpecificationListResponse(BaseModel):
    """Paginated list of specifications."""

    data: list[ProductSpecificationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# PRODUCT DOCUMENTATION
# ============================================================================


class ProductDocumentationBase(BaseModel):
    """Base documentation schema."""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    url: str = Field(..., description="URL to documentation")
    document_type: str = Field(..., max_length=50, description="Document type")
    language: str = Field(default="en", max_length=10)
    display_order: int = Field(default=0)
    is_primary: bool = Field(default=False)


class ProductDocumentationCreate(ProductDocumentationBase):
    """Schema for creating documentation."""

    pass


class ProductDocumentationUpdate(BaseModel):
    """Schema for updating documentation."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    url: Optional[str] = None
    document_type: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    display_order: Optional[int] = None
    is_primary: Optional[bool] = None


class ProductDocumentationResponse(ProductDocumentationBase):
    """Response schema for documentation."""

    id: str
    product_id: str
    file_size: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductDocumentationListResponse(BaseModel):
    """Paginated list of documentation."""

    data: list[ProductDocumentationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# PRODUCT VIDEO
# ============================================================================


class ProductVideoBase(BaseModel):
    """Base video schema."""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    url: str = Field(..., description="Video URL")
    thumbnail_url: Optional[str] = None
    video_type: str = Field(default="demonstration", max_length=50)
    duration_seconds: Optional[int] = None
    source_platform: str = Field(default="youtube", max_length=50)
    display_order: int = Field(default=0)
    is_featured: bool = Field(default=False)


class ProductVideoCreate(ProductVideoBase):
    """Schema for creating video."""

    pass


class ProductVideoUpdate(BaseModel):
    """Schema for updating video."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    video_type: Optional[str] = Field(None, max_length=50)
    duration_seconds: Optional[int] = None
    source_platform: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None
    is_featured: Optional[bool] = None


class ProductVideoResponse(ProductVideoBase):
    """Response schema for video."""

    id: str
    product_id: str
    view_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductVideoListResponse(BaseModel):
    """Paginated list of videos."""

    data: list[ProductVideoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# COMPREHENSIVE PRODUCT FEATURES
# ============================================================================


class ProductFeaturesResponse(BaseModel):
    """Complete product features and specifications."""

    product_id: str
    specifications: list[ProductSpecificationResponse]
    documentation: list[ProductDocumentationResponse]
    videos: list[ProductVideoResponse]

    model_config = ConfigDict(from_attributes=True)

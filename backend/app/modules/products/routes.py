"""Product catalogue API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.exceptions import NotFoundException, ConflictException
from app.modules.products.service import CategoryService, ProductService
from app.modules.products.schemas import (
    ProductCategoryResponse,
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductResponse,
    ProductDetailResponse,
    ProductListResponse,
    ProductCreate,
    ProductUpdate,
    ProductImageCreate,
    ProductImageResponse,
    ProductVariantCreate,
    ProductVariantResponse,
)

router = APIRouter(prefix="/products", tags=["products"])


# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================


@router.get("", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    search: str = Query(None),
    is_featured: bool = Query(None),
    in_stock: bool = Query(None),
    sort_by: str = Query("created_at", pattern="^(name|price|created_at|rating|view_count)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """List products with filtering, searching, and sorting."""
    skip = (page - 1) * page_size

    products, total = ProductService.list_products(
        db,
        skip=skip,
        limit=page_size,
        category_id=category_id,
        min_price=min_price,
        max_price=max_price,
        search=search,
        is_featured=is_featured,
        in_stock=in_stock,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return ProductListResponse(
        data=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ProductDetailResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
):
    """Create a new product."""
    try:
        product = ProductService.create_product(db, product_data)
        return ProductDetailResponse.model_validate(product)
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{product_id}", response_model=ProductDetailResponse)
def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing product."""
    try:
        product = ProductService.update_product(db, product_id, product_data)
        return ProductDetailResponse.model_validate(product)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
):
    """Delete a product."""
    try:
        ProductService.delete_product(db, product_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
):
    """Get detailed product information."""
    try:
        product = ProductService.get_product(db, product_id)
        return ProductDetailResponse.model_validate(product)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/by-slug/{slug}", response_model=ProductDetailResponse)
def get_product_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Get product by URL slug."""
    try:
        product = ProductService.get_product_by_slug(db, slug)
        return ProductDetailResponse.model_validate(product)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/search/full-text", response_model=list[ProductResponse])
def search_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Full-text search for products."""
    products = ProductService.search_products(db, q, limit)
    return [ProductResponse.model_validate(p) for p in products]


@router.get("/featured/list", response_model=list[ProductResponse])
def get_featured_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get featured products."""
    products = ProductService.get_featured_products(db, limit)
    return [ProductResponse.model_validate(p) for p in products]


@router.get("/statistics/overview", response_model=dict)
def get_product_statistics(
    db: Session = Depends(get_db),
):
    """Get product catalogue statistics."""
    return ProductService.get_product_statistics(db)


# ============================================================================
# PRODUCT IMAGES
# ============================================================================


@router.post("/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
def add_product_image(
    product_id: str,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
):
    """Add an image to a product."""
    try:
        image = ProductService.add_product_image(db, product_id, image_data)
        return ProductImageResponse.model_validate(image)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{product_id}/images/{image_id}", response_model=ProductImageResponse)
def update_product_image(
    product_id: str,
    image_id: str,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
):
    """Update a product image."""
    try:
        image = ProductService.update_product_image(db, product_id, image_id, image_data)
        return ProductImageResponse.model_validate(image)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(
    product_id: str,
    image_id: str,
    db: Session = Depends(get_db),
):
    """Delete a product image."""
    try:
        ProductService.delete_product_image(db, product_id, image_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# PRODUCT VARIANTS
# ============================================================================


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def add_product_variant(
    product_id: str,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
):
    """Add a variant to a product."""
    try:
        variant = ProductService.add_product_variant(db, product_id, variant_data)
        return ProductVariantResponse.model_validate(variant)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/{product_id}/variants/{variant_id}", response_model=ProductVariantResponse)
def update_product_variant(
    product_id: str,
    variant_id: str,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
):
    """Update a product variant."""
    try:
        variant = ProductService.update_product_variant(db, product_id, variant_id, variant_data)
        return ProductVariantResponse.model_validate(variant)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_variant(
    product_id: str,
    variant_id: str,
    db: Session = Depends(get_db),
):
    """Delete a product variant."""
    try:
        ProductService.delete_product_variant(db, product_id, variant_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# CATEGORY ENDPOINTS
# ============================================================================


@router.post("/categories", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: ProductCategoryCreate,
    db: Session = Depends(get_db),
):
    """Create a new product category."""
    try:
        category = CategoryService.create_category(db, category_data)
        return ProductCategoryResponse.model_validate(category)
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/categories/list", response_model=list[ProductCategoryResponse])
def list_categories(
    parent_only: bool = Query(False),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    """List product categories."""
    categories = CategoryService.list_categories(
        db,
        parent_only=parent_only,
        active_only=active_only,
    )
    return [ProductCategoryResponse.model_validate(c) for c in categories]


@router.get("/categories/{category_id}", response_model=ProductCategoryResponse)
def get_category(
    category_id: str,
    db: Session = Depends(get_db),
):
    """Get a category by ID."""
    try:
        category = CategoryService.get_category(db, category_id)
        return ProductCategoryResponse.model_validate(category)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/categories/{category_id}", response_model=ProductCategoryResponse)
def update_category(
    category_id: str,
    category_data: ProductCategoryUpdate,
    db: Session = Depends(get_db),
):
    """Update a product category."""
    try:
        category = CategoryService.update_category(db, category_id, category_data)
        return ProductCategoryResponse.model_validate(category)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
):
    """Delete a product category."""
    try:
        CategoryService.delete_category(db, category_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/categories/{category_id}/products", response_model=ProductListResponse)
def get_category_products(
    category_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(name|price|created_at|rating|view_count)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """Get products in a specific category."""
    skip = (page - 1) * page_size

    products, total = ProductService.list_products(
        db,
        skip=skip,
        limit=page_size,
        category_id=category_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return ProductListResponse(
        data=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

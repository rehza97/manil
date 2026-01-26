"""Product catalogue business logic service."""
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import uuid4

from sqlalchemy import select, and_, or_, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.modules.products.models import (
    ProductCategory,
    Product,
    ProductImage,
    ProductVariant,
)
from app.modules.products.schemas import (
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCreate,
    ProductUpdate,
    ProductImageCreate,
    ProductVariantCreate,
)
from app.core.exceptions import NotFoundException, ConflictException

logger = logging.getLogger(__name__)


class CategoryService:
    """Service for managing product categories."""

    @staticmethod
    def create_category(db: Session, category_data: ProductCategoryCreate) -> ProductCategory:
        """Create a new product category."""
        # Check if slug already exists
        existing = db.execute(
            select(ProductCategory).where(ProductCategory.slug == category_data.slug)
        ).first()

        if existing:
            raise ConflictException(f"Category with slug '{category_data.slug}' already exists")

        category = ProductCategory(
            id=str(uuid4()),
            **category_data.model_dump(),
        )

        db.add(category)
        db.commit()
        db.refresh(category)

        logger.info(f"Category created: {category.id} - {category.name}")
        return category

    @staticmethod
    def get_category(db: Session, category_id: str) -> ProductCategory:
        """Get a category by ID."""
        category = db.execute(
            select(ProductCategory).where(ProductCategory.id == category_id)
        ).first()

        if not category:
            raise NotFoundException(f"Category {category_id} not found")

        return category[0]

    @staticmethod
    def list_categories(
        db: Session,
        parent_only: bool = False,
        active_only: bool = True,
    ) -> list[ProductCategory]:
        """List all categories with optional filtering."""
        query = select(ProductCategory).where(ProductCategory.deleted_at.is_(None))

        if parent_only:
            query = query.where(ProductCategory.parent_category_id.is_(None))

        if active_only:
            query = query.where(ProductCategory.is_active.is_(True))

        query = query.order_by(ProductCategory.display_order, ProductCategory.name)

        categories = db.execute(query).scalars().all()
        return list(categories)

    @staticmethod
    def update_category(
        db: Session,
        category_id: str,
        category_data: ProductCategoryUpdate,
    ) -> ProductCategory:
        """Update a category."""
        category = db.execute(
            select(ProductCategory).where(ProductCategory.id == category_id)
        ).first()

        if not category:
            raise NotFoundException(f"Category {category_id} not found")

        category = category[0]

        # Check slug uniqueness if changing
        if category_data.slug and category_data.slug != category.slug:
            existing = db.execute(
                select(ProductCategory).where(
                    and_(
                        ProductCategory.slug == category_data.slug,
                        ProductCategory.id != category_id,
                    )
                )
            ).first()
            if existing:
                raise ConflictException(f"Category with slug '{category_data.slug}' already exists")

        for field, value in category_data.model_dump(exclude_unset=True).items():
            setattr(category, field, value)

        db.commit()
        db.refresh(category)

        logger.info(f"Category updated: {category.id}")
        return category

    @staticmethod
    def delete_category(db: Session, category_id: str) -> None:
        """Soft delete a category."""
        category = db.execute(
            select(ProductCategory).where(ProductCategory.id == category_id)
        ).first()

        if not category:
            raise NotFoundException(f"Category {category_id} not found")

        category = category[0]
        category.deleted_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"Category deleted: {category.id}")


class ProductService:
    """Service for managing products."""

    @staticmethod
    def create_product(db: Session, product_data: ProductCreate) -> Product:
        """Create a new product."""
        # Verify category exists
        category = db.execute(
            select(ProductCategory).where(ProductCategory.id == product_data.category_id)
        ).first()

        if not category:
            raise NotFoundException(f"Category {product_data.category_id} not found")

        # Check SKU uniqueness
        existing = db.execute(
            select(Product).where(Product.sku == product_data.sku)
        ).first()

        if existing:
            raise ConflictException(f"Product with SKU '{product_data.sku}' already exists")

        product = Product(
            id=str(uuid4()),
            **product_data.model_dump(),
        )

        db.add(product)
        db.commit()
        db.refresh(product)

        logger.info(f"Product created: {product.id} - {product.name}")
        return product

    @staticmethod
    def get_product(db: Session, product_id: str) -> Product:
        """Get a product by ID."""
        product = db.execute(
            select(Product).where(
                and_(Product.id == product_id, Product.deleted_at.is_(None))
            )
        ).first()

        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        return product[0]

    @staticmethod
    def get_product_by_slug(db: Session, slug: str) -> Product:
        """Get a product by slug."""
        product = db.execute(
            select(Product).where(
                and_(
                    Product.slug == slug,
                    Product.deleted_at.is_(None),
                    Product.is_visible.is_(True),
                )
            )
        ).first()

        if not product:
            raise NotFoundException(f"Product with slug '{slug}' not found")

        product = product[0]
        # Increment view count
        product.view_count += 1
        db.commit()

        return product

    @staticmethod
    async def list_products(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        search: Optional[str] = None,
        is_featured: Optional[bool] = None,
        service_type: Optional[str] = None,
        billing_cycle: Optional[str] = None,
        is_recurring: Optional[bool] = None,
        in_stock: Optional[bool] = None,  # DEPRECATED: kept for backward compatibility
        sort_by: str = "created_at",
        sort_order: str = "desc",
        visible_only: bool = True,
    ) -> Tuple[list[Product], int]:
        """List products with advanced filtering and pagination."""
        query = select(Product).where(Product.deleted_at.is_(None))

        if visible_only:
            query = query.where(Product.is_visible.is_(True))

        # Filters
        if category_id:
            query = query.where(Product.category_id == category_id)

        if min_price is not None:
            query = query.where(Product.regular_price >= min_price)

        if max_price is not None:
            query = query.where(Product.regular_price <= max_price)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.sku.ilike(search_term),
                )
            )

        if is_featured is not None:
            query = query.where(Product.is_featured == is_featured)

        # Service filters
        if service_type:
            query = query.where(Product.service_type == service_type)

        if billing_cycle:
            query = query.where(Product.billing_cycle == billing_cycle)

        if is_recurring is not None:
            query = query.where(Product.is_recurring == is_recurring)

        # DEPRECATED: Stock filter (kept for backward compatibility)
        if in_stock is not None:
            if in_stock:
                # For services, "in stock" means service is available (not terminated)
                query = query.where(
                    or_(
                        Product.stock_quantity.is_(None),  # Unlimited
                        Product.stock_quantity > 0
                    )
                )
            else:
                query = query.where(
                    and_(
                        Product.stock_quantity.isnot(None),
                        Product.stock_quantity == 0
                    )
                )

        # Get total count using same filters as main query
        count_stmt = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_stmt)
        total_count = total_result.scalar() or 0

        # Sorting
        sort_column = getattr(Product, sort_by, Product.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Pagination
        result = await db.execute(query.offset(skip).limit(limit))
        products = result.scalars().all()

        return list(products), total_count

    @staticmethod
    def update_product(
        db: Session,
        product_id: str,
        product_data: ProductUpdate,
    ) -> Product:
        """Update a product."""
        product = db.execute(
            select(Product).where(
                and_(Product.id == product_id, Product.deleted_at.is_(None))
            )
        ).first()

        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        product = product[0]

        # Check SKU uniqueness if changing
        if product_data.sku and product_data.sku != product.sku:
            existing = db.execute(
                select(Product).where(
                    and_(Product.sku == product_data.sku, Product.id != product_id)
                )
            ).first()
            if existing:
                raise ConflictException(f"Product with SKU '{product_data.sku}' already exists")

        for field, value in product_data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(product, field, value)

        db.commit()
        db.refresh(product)

        logger.info(f"Product updated: {product.id}")
        return product

    @staticmethod
    def delete_product(db: Session, product_id: str) -> None:
        """Soft delete a product."""
        product = db.execute(
            select(Product).where(
                and_(Product.id == product_id, Product.deleted_at.is_(None))
            )
        ).first()

        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        product = product[0]
        from datetime import datetime, timezone
        product.deleted_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"Product deleted: {product.id}")

    @staticmethod
    def get_featured_products(db: Session, limit: int = 10) -> list[Product]:
        """Get featured products."""
        products = db.execute(
            select(Product)
            .where(
                and_(
                    Product.is_featured.is_(True),
                    Product.is_visible.is_(True),
                    Product.deleted_at.is_(None),
                )
            )
            .order_by(Product.display_order, desc(Product.created_at))
            .limit(limit)
        ).scalars().all()

        return list(products)

    @staticmethod
    def search_products(
        db: Session,
        search_term: str,
        limit: int = 20,
    ) -> list[Product]:
        """Full-text search for products."""
        search_term = f"%{search_term}%"
        products = db.execute(
            select(Product)
            .where(
                and_(
                    or_(
                        Product.name.ilike(search_term),
                        Product.description.ilike(search_term),
                        Product.sku.ilike(search_term),
                    ),
                    Product.is_visible.is_(True),
                    Product.deleted_at.is_(None),
                )
            )
            .limit(limit)
        ).scalars().all()

        return list(products)

    @staticmethod
    def add_product_image(
        db: Session,
        product_id: str,
        image_data: ProductImageCreate,
    ) -> ProductImage:
        """Add an image to a product."""
        # Verify product exists
        product = db.execute(
            select(Product).where(
                and_(Product.id == product_id, Product.deleted_at.is_(None))
            )
        ).first()

        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        image = ProductImage(
            id=str(uuid4()),
            product_id=product_id,
            **image_data.model_dump(),
        )

        db.add(image)
        db.commit()
        db.refresh(image)

        logger.info(f"Product image added: {image.id}")
        return image

    @staticmethod
    def update_product_image(
        db: Session,
        product_id: str,
        image_id: str,
        image_data: ProductImageCreate,
    ) -> ProductImage:
        """Update a product image."""
        image = db.execute(
            select(ProductImage).where(
                and_(
                    ProductImage.id == image_id,
                    ProductImage.product_id == product_id,
                )
            )
        ).first()

        if not image:
            raise NotFoundException(f"Image {image_id} not found for product {product_id}")

        image = image[0]

        for field, value in image_data.model_dump(exclude_unset=True).items():
            setattr(image, field, value)

        db.commit()
        db.refresh(image)

        logger.info(f"Product image updated: {image.id}")
        return image

    @staticmethod
    def delete_product_image(
        db: Session,
        product_id: str,
        image_id: str,
    ) -> None:
        """Delete a product image."""
        image = db.execute(
            select(ProductImage).where(
                and_(
                    ProductImage.id == image_id,
                    ProductImage.product_id == product_id,
                )
            )
        ).first()

        if not image:
            raise NotFoundException(f"Image {image_id} not found for product {product_id}")

        image = image[0]
        db.delete(image)
        db.commit()

        logger.info(f"Product image deleted: {image_id}")

    @staticmethod
    def add_product_variant(
        db: Session,
        product_id: str,
        variant_data: ProductVariantCreate,
    ) -> ProductVariant:
        """Add a variant to a product."""
        # Verify product exists
        product = db.execute(
            select(Product).where(
                and_(Product.id == product_id, Product.deleted_at.is_(None))
            )
        ).first()

        if not product:
            raise NotFoundException(f"Product {product_id} not found")

        # Check SKU uniqueness
        existing = db.execute(
            select(ProductVariant).where(ProductVariant.sku == variant_data.sku)
        ).first()

        if existing:
            raise ConflictException(f"Variant with SKU '{variant_data.sku}' already exists")

        variant = ProductVariant(
            id=str(uuid4()),
            product_id=product_id,
            **variant_data.model_dump(),
        )

        db.add(variant)
        db.commit()
        db.refresh(variant)

        logger.info(f"Product variant added: {variant.id}")
        return variant

    @staticmethod
    def update_product_variant(
        db: Session,
        product_id: str,
        variant_id: str,
        variant_data: ProductVariantCreate,
    ) -> ProductVariant:
        """Update a product variant."""
        variant = db.execute(
            select(ProductVariant).where(
                and_(
                    ProductVariant.id == variant_id,
                    ProductVariant.product_id == product_id,
                )
            )
        ).first()

        if not variant:
            raise NotFoundException(f"Variant {variant_id} not found for product {product_id}")

        variant = variant[0]

        # Check SKU uniqueness if changing
        if variant_data.sku and variant_data.sku != variant.sku:
            existing = db.execute(
                select(ProductVariant).where(
                    and_(
                        ProductVariant.sku == variant_data.sku,
                        ProductVariant.id != variant_id,
                    )
                )
            ).first()
            if existing:
                raise ConflictException(f"Variant with SKU '{variant_data.sku}' already exists")

        for field, value in variant_data.model_dump(exclude_unset=True).items():
            setattr(variant, field, value)

        db.commit()
        db.refresh(variant)

        logger.info(f"Product variant updated: {variant.id}")
        return variant

    @staticmethod
    def delete_product_variant(
        db: Session,
        product_id: str,
        variant_id: str,
    ) -> None:
        """Delete a product variant."""
        variant = db.execute(
            select(ProductVariant).where(
                and_(
                    ProductVariant.id == variant_id,
                    ProductVariant.product_id == product_id,
                )
            )
        ).first()

        if not variant:
            raise NotFoundException(f"Variant {variant_id} not found for product {product_id}")

        variant = variant[0]
        db.delete(variant)
        db.commit()

        logger.info(f"Product variant deleted: {variant_id}")

    @staticmethod
    def get_product_statistics(db: Session) -> dict:
        """Get product catalogue statistics."""
        total_products = db.execute(
            select(func.count(Product.id)).where(Product.deleted_at.is_(None))
        ).scalar() or 0

        total_categories = db.execute(
            select(func.count(ProductCategory.id))
        ).scalar() or 0

        featured_products = db.execute(
            select(func.count(Product.id)).where(
                and_(Product.is_featured.is_(True), Product.deleted_at.is_(None))
            )
        ).scalar() or 0

        # Service type distribution
        service_type_dist = db.execute(
            select(Product.service_type, func.count(Product.id))
            .where(Product.deleted_at.is_(None))
            .group_by(Product.service_type)
        ).all()
        service_type_distribution = {row[0]: row[1] for row in service_type_dist}

        # Billing cycle distribution
        billing_cycle_dist = db.execute(
            select(Product.billing_cycle, func.count(Product.id))
            .where(Product.deleted_at.is_(None))
            .group_by(Product.billing_cycle)
        ).all()
        billing_cycle_distribution = {row[0]: row[1] for row in billing_cycle_dist}

        # Recurring services count
        recurring_services = db.execute(
            select(func.count(Product.id)).where(
                and_(
                    Product.is_recurring.is_(True),
                    Product.deleted_at.is_(None),
                )
            )
        ).scalar() or 0

        avg_rating = db.execute(
            select(func.avg(Product.rating)).where(Product.deleted_at.is_(None))
        ).scalar() or 0

        return {
            "total_products": total_products,
            "total_categories": total_categories,
            "featured_products": featured_products,
            "service_type_distribution": service_type_distribution,
            "billing_cycle_distribution": billing_cycle_distribution,
            "recurring_services": recurring_services,
            "avg_rating": round(float(avg_rating), 2),
        }

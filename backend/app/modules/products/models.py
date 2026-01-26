"""Product Catalogue database models."""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Text, Integer, Boolean, ForeignKey, Float, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.config.database import Base


class ProductCategory(Base):
    """Product category for organizing the catalogue."""

    __tablename__ = "product_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Hierarchy support
    parent_category_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("product_categories.id"), nullable=True, index=True
    )

    # Display
    icon_color: Mapped[str] = mapped_column(String(7), default="#3B82F6")  # Hex color
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # Relationships
    products = relationship(
        "Product", back_populates="category", cascade="all, delete-orphan"
    )
    subcategories = relationship(
        "ProductCategory",
        remote_side=[id],
        backref="parent",
        foreign_keys=[parent_category_id],
    )

    def __repr__(self) -> str:
        return f"<ProductCategory {self.id} - {self.name}>"


class Product(Base):
    """Product in the catalogue - represents digital services."""

    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    # Basic info
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Organization
    category_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("product_categories.id"), nullable=False, index=True
    )

    # Identifiers
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    barcode: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True,
        comment="DEPRECATED: Not applicable for digital services. Kept for backward compatibility."
    )

    # Pricing
    regular_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    sale_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    cost_price: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2), nullable=True,
        comment="DEPRECATED: Not applicable for digital services. Kept for backward compatibility."
    )

    # Service Configuration
    service_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="general", index=True,
        comment="Type of service: dns, ssl, email, backup, monitoring, domain, general, etc."
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(20), nullable=False, default="one_time", index=True,
        comment="Billing frequency: monthly, yearly, one_time, usage_based"
    )
    is_recurring: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True,
        comment="Whether service auto-renews"
    )
    provisioning_type: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True,
        comment="How service is provisioned: automatic, manual, api"
    )
    auto_renew: Mapped[bool] = mapped_column(
        Boolean, default=False,
        comment="Auto-renewal enabled by default"
    )
    trial_period_days: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        comment="Trial period in days"
    )
    service_config: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True,
        comment="Flexible service configuration (JSON)"
    )

    # Inventory (DEPRECATED - kept for backward compatibility)
    stock_quantity: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=None,
        comment="DEPRECATED: Not applicable for digital services. Use NULL for unlimited. Kept for backward compatibility."
    )
    low_stock_threshold: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=None,
        comment="DEPRECATED: Not applicable for digital services. Kept for backward compatibility."
    )

    # Features
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Metadata
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    # Display
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Audit
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    category = relationship("ProductCategory", back_populates="products")
    images = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan"
    )
    variants = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product {self.id} - {self.name}>"


class ProductImage(Base):
    """Images for products."""

    __tablename__ = "product_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Image storage
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    alt_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Display
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    product = relationship("Product", back_populates="images")

    def __repr__(self) -> str:
        return f"<ProductImage {self.id} for product {self.product_id}>"


class ProductVariant(Base):
    """Product variants - represents service tiers/plans (e.g., Basic, Professional, Enterprise)."""

    __tablename__ = "product_variants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Variant/Tier info
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., "Professional Plan"
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    tier_name: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True,
        comment="Tier name: basic, professional, enterprise, etc."
    )
    tier_level: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True,
        comment="Tier level for ordering (1=basic, 2=professional, 3=enterprise, etc.)"
    )

    # Pricing
    price_adjustment: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    # Inventory (DEPRECATED - kept for backward compatibility)
    stock_quantity: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=None,
        comment="DEPRECATED: Not applicable for service tiers. Kept for backward compatibility."
    )

    # Display
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    product = relationship("Product", back_populates="variants")

    def __repr__(self) -> str:
        return f"<ProductVariant {self.id} - {self.name}>"

"""Create products, images, and variants tables.

Revision ID: 021
Revises: 020
Create Date: 2025-11-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create products, images, and variants tables."""
    # Create products table
    op.create_table(
        "products",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("short_description", sa.String(500), nullable=True),
        sa.Column("category_id", sa.String(36), nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("barcode", sa.String(100), nullable=True),
        sa.Column("regular_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("sale_price", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("cost_price", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("stock_quantity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("low_stock_threshold", sa.Integer, nullable=False, server_default="10"),
        sa.Column("is_featured", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("is_visible", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("view_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rating", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("review_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["product_categories.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        sa.UniqueConstraint("sku"),
    )
    op.create_index(op.f("ix_products_name"), "products", ["name"])
    op.create_index(op.f("ix_products_slug"), "products", ["slug"], unique=True)
    op.create_index(op.f("ix_products_category_id"), "products", ["category_id"])
    op.create_index(op.f("ix_products_sku"), "products", ["sku"], unique=True)
    op.create_index(op.f("ix_products_barcode"), "products", ["barcode"])
    op.create_index(op.f("ix_products_is_featured"), "products", ["is_featured"])
    op.create_index(op.f("ix_products_is_active"), "products", ["is_active"])
    op.create_index(op.f("ix_products_is_visible"), "products", ["is_visible"])

    # Create product images table
    op.create_table(
        "product_images",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("product_id", sa.String(36), nullable=False),
        sa.Column("image_url", sa.Text, nullable=False),
        sa.Column("alt_text", sa.String(255), nullable=True),
        sa.Column("caption", sa.Text, nullable=True),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_product_images_product_id"), "product_images", ["product_id"])

    # Create product variants table
    op.create_table(
        "product_variants",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("product_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("price_adjustment", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("stock_quantity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku"),
    )
    op.create_index(op.f("ix_product_variants_product_id"), "product_variants", ["product_id"])
    op.create_index(op.f("ix_product_variants_sku"), "product_variants", ["sku"], unique=True)


def downgrade() -> None:
    """Drop products tables."""
    op.drop_index(op.f("ix_product_variants_sku"), table_name="product_variants")
    op.drop_index(op.f("ix_product_variants_product_id"), table_name="product_variants")
    op.drop_table("product_variants")

    op.drop_index(op.f("ix_product_images_product_id"), table_name="product_images")
    op.drop_table("product_images")

    op.drop_index(op.f("ix_products_is_visible"), table_name="products")
    op.drop_index(op.f("ix_products_is_active"), table_name="products")
    op.drop_index(op.f("ix_products_is_featured"), table_name="products")
    op.drop_index(op.f("ix_products_barcode"), table_name="products")
    op.drop_index(op.f("ix_products_sku"), table_name="products")
    op.drop_index(op.f("ix_products_category_id"), table_name="products")
    op.drop_index(op.f("ix_products_slug"), table_name="products")
    op.drop_index(op.f("ix_products_name"), table_name="products")
    op.drop_table("products")

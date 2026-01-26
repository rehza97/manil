"""Convert products to digital services

Revision ID: 049_products_to_services
Revises: 048_notification_groups
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "049_products_to_services"
down_revision = "048_notification_groups"
branch_labels = None
depends_on = None


def upgrade():
    """Convert products from physical items to digital services."""
    
    # Add service configuration columns to products table
    op.add_column(
        "products",
        sa.Column("service_type", sa.String(50), nullable=False, server_default="general"),
    )
    op.add_column(
        "products",
        sa.Column("billing_cycle", sa.String(20), nullable=False, server_default="one_time"),
    )
    op.add_column(
        "products",
        sa.Column("is_recurring", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "products",
        sa.Column("provisioning_type", sa.String(20), nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("auto_renew", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "products",
        sa.Column("trial_period_days", sa.Integer, nullable=True),
    )
    op.add_column(
        "products",
        sa.Column("service_config", JSONB, nullable=True),
    )
    
    # Make inventory fields nullable (deprecated)
    op.alter_column(
        "products",
        "stock_quantity",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
    op.alter_column(
        "products",
        "low_stock_threshold",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
    
    # Set stock_quantity to NULL for all existing products (unlimited for services)
    op.execute("UPDATE products SET stock_quantity = NULL")
    op.execute("UPDATE products SET low_stock_threshold = NULL")
    
    # Add indexes for service fields
    op.create_index(op.f("ix_products_service_type"), "products", ["service_type"])
    op.create_index(op.f("ix_products_billing_cycle"), "products", ["billing_cycle"])
    op.create_index(op.f("ix_products_is_recurring"), "products", ["is_recurring"])
    op.create_index(op.f("ix_products_provisioning_type"), "products", ["provisioning_type"])
    
    # Add comments marking deprecated fields
    op.execute("""
        COMMENT ON COLUMN products.barcode IS 'DEPRECATED: Not applicable for digital services. Kept for backward compatibility.';
        COMMENT ON COLUMN products.cost_price IS 'DEPRECATED: Not applicable for digital services. Kept for backward compatibility.';
        COMMENT ON COLUMN products.stock_quantity IS 'DEPRECATED: Not applicable for digital services. Use NULL for unlimited. Kept for backward compatibility.';
        COMMENT ON COLUMN products.low_stock_threshold IS 'DEPRECATED: Not applicable for digital services. Kept for backward compatibility.';
    """)
    
    # Add comments for new service fields
    op.execute("""
        COMMENT ON COLUMN products.service_type IS 'Type of service: dns, ssl, email, backup, monitoring, domain, general, etc.';
        COMMENT ON COLUMN products.billing_cycle IS 'Billing frequency: monthly, yearly, one_time, usage_based';
        COMMENT ON COLUMN products.is_recurring IS 'Whether service auto-renews';
        COMMENT ON COLUMN products.provisioning_type IS 'How service is provisioned: automatic, manual, api';
        COMMENT ON COLUMN products.auto_renew IS 'Auto-renewal enabled by default';
        COMMENT ON COLUMN products.trial_period_days IS 'Trial period in days';
        COMMENT ON COLUMN products.service_config IS 'Flexible service configuration (JSON)';
    """)
    
    # Add tier columns to product_variants table
    op.add_column(
        "product_variants",
        sa.Column("tier_name", sa.String(50), nullable=True),
    )
    op.add_column(
        "product_variants",
        sa.Column("tier_level", sa.Integer, nullable=True),
    )
    
    # Make stock_quantity nullable in variants (deprecated)
    op.alter_column(
        "product_variants",
        "stock_quantity",
        existing_type=sa.Integer(),
        nullable=True,
        server_default=None,
    )
    
    # Set stock_quantity to NULL for all existing variants
    op.execute("UPDATE product_variants SET stock_quantity = NULL")
    
    # Add index for tier_name
    op.create_index(op.f("ix_product_variants_tier_name"), "product_variants", ["tier_name"])
    
    # Add comments for variant fields
    op.execute("""
        COMMENT ON COLUMN product_variants.tier_name IS 'Tier name: basic, professional, enterprise, etc.';
        COMMENT ON COLUMN product_variants.tier_level IS 'Tier level for ordering (1=basic, 2=professional, 3=enterprise, etc.)';
        COMMENT ON COLUMN product_variants.stock_quantity IS 'DEPRECATED: Not applicable for service tiers. Kept for backward compatibility.';
    """)


def downgrade():
    """Revert products back to physical items model."""
    
    # Remove service configuration columns
    op.drop_index(op.f("ix_products_provisioning_type"), table_name="products")
    op.drop_index(op.f("ix_products_is_recurring"), table_name="products")
    op.drop_index(op.f("ix_products_billing_cycle"), table_name="products")
    op.drop_index(op.f("ix_products_service_type"), table_name="products")
    
    op.drop_column("products", "service_config")
    op.drop_column("products", "trial_period_days")
    op.drop_column("products", "auto_renew")
    op.drop_column("products", "provisioning_type")
    op.drop_column("products", "is_recurring")
    op.drop_column("products", "billing_cycle")
    op.drop_column("products", "service_type")
    
    # Restore inventory fields to not nullable with defaults
    op.execute("UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL")
    op.execute("UPDATE products SET low_stock_threshold = 10 WHERE low_stock_threshold IS NULL")
    
    op.alter_column(
        "products",
        "stock_quantity",
        existing_type=sa.Integer(),
        nullable=False,
        server_default="0",
    )
    op.alter_column(
        "products",
        "low_stock_threshold",
        existing_type=sa.Integer(),
        nullable=False,
        server_default="10",
    )
    
    # Remove tier columns from variants
    op.drop_index(op.f("ix_product_variants_tier_name"), table_name="product_variants")
    op.drop_column("product_variants", "tier_level")
    op.drop_column("product_variants", "tier_name")
    
    # Restore stock_quantity in variants
    op.execute("UPDATE product_variants SET stock_quantity = 0 WHERE stock_quantity IS NULL")
    op.alter_column(
        "product_variants",
        "stock_quantity",
        existing_type=sa.Integer(),
        nullable=False,
        server_default="0",
    )
    
    # Remove comments
    op.execute("COMMENT ON COLUMN products.barcode IS NULL")
    op.execute("COMMENT ON COLUMN products.cost_price IS NULL")
    op.execute("COMMENT ON COLUMN products.stock_quantity IS NULL")
    op.execute("COMMENT ON COLUMN products.low_stock_threshold IS NULL")
    op.execute("COMMENT ON COLUMN product_variants.stock_quantity IS NULL")

"""Create orders tables

Revision ID: 038_create_orders_tables
Revises: 037_create_user_role_enum
Create Date: 2026-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '038_create_orders_tables'
down_revision = '037_create_user_role_enum'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create orders, order_items, and order_timeline tables."""

    # Create order_status_enum type if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_status_enum AS ENUM ('request', 'validated', 'in_progress', 'delivered', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create orders table
    op.execute("""
        CREATE TABLE orders (
            id VARCHAR(36) PRIMARY KEY,
            customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
            quote_id VARCHAR(36) REFERENCES quotes(id) ON DELETE SET NULL,
            status order_status_enum NOT NULL DEFAULT 'request'::order_status_enum,
            subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
            tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
            discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
            total_amount NUMERIC(12, 2) NOT NULL,
            order_number VARCHAR(50) NOT NULL UNIQUE,
            customer_notes TEXT,
            internal_notes TEXT,
            delivery_address TEXT,
            delivery_contact VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            validated_at TIMESTAMP WITH TIME ZONE,
            in_progress_at TIMESTAMP WITH TIME ZONE,
            delivered_at TIMESTAMP WITH TIME ZONE,
            cancelled_at TIMESTAMP WITH TIME ZONE,
            created_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            updated_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """)

    # Create indexes for orders table
    op.execute("CREATE INDEX ix_orders_customer_id ON orders(customer_id)")
    op.execute("CREATE INDEX ix_orders_quote_id ON orders(quote_id)")
    op.execute("CREATE INDEX ix_orders_status ON orders(status)")
    op.execute("CREATE INDEX ix_orders_order_number ON orders(order_number)")
    op.execute("CREATE INDEX ix_orders_deleted_at ON orders(deleted_at)")
    op.execute("CREATE INDEX ix_orders_created_at ON orders(created_at)")

    # Create order_items table
    op.execute("""
        CREATE TABLE order_items (
            id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
            unit_price NUMERIC(10, 2) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
            discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
            total_price NUMERIC(12, 2) NOT NULL,
            variant_sku VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # Create indexes for order_items table
    op.execute("CREATE INDEX ix_order_items_order_id ON order_items(order_id)")
    op.execute("CREATE INDEX ix_order_items_product_id ON order_items(product_id)")

    # Create order_timeline table
    op.execute("""
        CREATE TABLE order_timeline (
            id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            previous_status order_status_enum,
            new_status order_status_enum NOT NULL,
            action_type VARCHAR(100) NOT NULL,
            description TEXT,
            performed_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # Create indexes for order_timeline table
    op.execute("CREATE INDEX ix_order_timeline_order_id ON order_timeline(order_id)")
    op.execute("CREATE INDEX ix_order_timeline_created_at ON order_timeline(created_at)")


def downgrade() -> None:
    """Drop orders tables and enum type."""
    # Drop tables in reverse order (respecting foreign keys)
    op.execute("DROP TABLE IF EXISTS order_timeline CASCADE")
    op.execute("DROP TABLE IF EXISTS order_items CASCADE")
    op.execute("DROP TABLE IF EXISTS orders CASCADE")

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS order_status_enum')

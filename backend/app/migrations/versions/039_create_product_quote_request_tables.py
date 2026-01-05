"""Create product quote request tables

Revision ID: 039_create_product_quote_request_tables
Revises: 038_create_orders_tables
Create Date: 2026-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '039_product_quote_requests'
down_revision = '038_create_orders_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create quote_requests, quote_line_items, and service_requests tables."""

    # Create quote_status_enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE quote_status_enum AS ENUM ('pending', 'reviewed', 'quoted', 'accepted', 'rejected', 'expired', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create quote_priority_enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE quote_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create quote_requests table
    op.execute("""
        CREATE TABLE quote_requests (
            id VARCHAR(36) PRIMARY KEY,
            customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE CASCADE,
            product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            customer_name VARCHAR(255),
            customer_email VARCHAR(255),
            customer_phone VARCHAR(20),
            company_name VARCHAR(255),
            status quote_status_enum NOT NULL DEFAULT 'pending'::quote_status_enum,
            priority quote_priority_enum NOT NULL DEFAULT 'medium'::quote_priority_enum,
            estimated_price FLOAT,
            final_price FLOAT,
            internal_notes TEXT,
            customer_notes TEXT,
            requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            reviewed_at TIMESTAMP WITH TIME ZONE,
            quoted_at TIMESTAMP WITH TIME ZONE,
            expires_at TIMESTAMP WITH TIME ZONE,
            accepted_at TIMESTAMP WITH TIME ZONE,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_by VARCHAR(36) REFERENCES users(id),
            updated_by VARCHAR(36) REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # Create indexes for quote_requests
    op.execute("CREATE INDEX ix_quote_requests_customer_id ON quote_requests(customer_id)")
    op.execute("CREATE INDEX ix_quote_requests_product_id ON quote_requests(product_id)")
    op.execute("CREATE INDEX ix_quote_requests_status ON quote_requests(status)")
    op.execute("CREATE INDEX ix_quote_requests_priority ON quote_requests(priority)")
    op.execute("CREATE INDEX ix_quote_requests_requested_at ON quote_requests(requested_at)")
    op.execute("CREATE INDEX ix_quote_requests_deleted_at ON quote_requests(deleted_at)")

    # Create quote_line_items table
    op.execute("""
        CREATE TABLE quote_line_items (
            id VARCHAR(36) PRIMARY KEY,
            quote_id VARCHAR(36) NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
            product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
            product_name VARCHAR(255) NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price FLOAT NOT NULL,
            total_price FLOAT NOT NULL,
            discount_percentage FLOAT NOT NULL DEFAULT 0,
            discount_amount FLOAT NOT NULL DEFAULT 0,
            final_price FLOAT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # Create indexes for quote_line_items
    op.execute("CREATE INDEX ix_quote_line_items_quote_id ON quote_line_items(quote_id)")
    op.execute("CREATE INDEX ix_quote_line_items_product_id ON quote_line_items(product_id)")

    # Create service_requests table
    op.execute("""
        CREATE TABLE service_requests (
            id VARCHAR(36) PRIMARY KEY,
            customer_id VARCHAR(36) REFERENCES customers(id) ON DELETE CASCADE,
            quote_request_id VARCHAR(36) REFERENCES quote_requests(id) ON DELETE CASCADE,
            service_type VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            customer_name VARCHAR(255),
            customer_email VARCHAR(255),
            customer_phone VARCHAR(20),
            company_name VARCHAR(255),
            requested_date TIMESTAMP WITH TIME ZONE,
            preferred_time VARCHAR(50),
            duration_hours FLOAT,
            status quote_status_enum NOT NULL DEFAULT 'pending'::quote_status_enum,
            priority quote_priority_enum NOT NULL DEFAULT 'medium'::quote_priority_enum,
            internal_notes TEXT,
            customer_notes TEXT,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_by VARCHAR(36) REFERENCES users(id),
            updated_by VARCHAR(36) REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # Create indexes for service_requests
    op.execute("CREATE INDEX ix_service_requests_customer_id ON service_requests(customer_id)")
    op.execute("CREATE INDEX ix_service_requests_quote_request_id ON service_requests(quote_request_id)")
    op.execute("CREATE INDEX ix_service_requests_status ON service_requests(status)")
    op.execute("CREATE INDEX ix_service_requests_priority ON service_requests(priority)")
    op.execute("CREATE INDEX ix_service_requests_deleted_at ON service_requests(deleted_at)")


def downgrade() -> None:
    """Drop product quote request tables."""
    # Drop tables in reverse order (respecting foreign keys)
    op.execute("DROP TABLE IF EXISTS service_requests CASCADE")
    op.execute("DROP TABLE IF EXISTS quote_line_items CASCADE")
    op.execute("DROP TABLE IF EXISTS quote_requests CASCADE")

    # Note: Not dropping enum types as they might be used by other tables
    # op.execute('DROP TYPE IF EXISTS quote_status_enum')
    # op.execute('DROP TYPE IF EXISTS quote_priority_enum')

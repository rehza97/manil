"""add customer approval and status history

Revision ID: 046_customer_approval
Revises: 045_deleted_at_categories
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa


revision = "046_customer_approval"
down_revision = "045_deleted_at_categories"
branch_labels = None
depends_on = None


def upgrade():
    # Create approval_status enum (idempotent)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE approval_status_enum AS ENUM ('not_required', 'pending', 'approved', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Add approval_status column to customers table (only if it doesn't exist)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'customers' AND column_name = 'approval_status'
            ) THEN
                ALTER TABLE customers 
                ADD COLUMN approval_status approval_status_enum NOT NULL DEFAULT 'not_required';
            END IF;
        END $$;
    """)
    
    # Create index on approval_status for performance (only if it doesn't exist)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_approval_status') THEN
                CREATE INDEX idx_customers_approval_status ON customers (approval_status);
            END IF;
        END $$;
    """)
    
    # Update existing customers: active customers get "approved", others get "not_required
    # Only update rows where approval_status is still 'not_required' to avoid overwriting existing values
    op.execute("""
        UPDATE customers 
        SET approval_status = CASE 
            WHEN status = 'active' THEN 'approved'::approval_status_enum
            ELSE 'not_required'::approval_status_enum
        END
        WHERE approval_status = 'not_required'::approval_status_enum
    """)


def downgrade():
    # Drop index
    op.drop_index("idx_customers_approval_status", table_name="customers")
    
    # Drop column
    op.drop_column("customers", "approval_status")
    
    # Drop enum
    op.execute("DROP TYPE approval_status_enum")

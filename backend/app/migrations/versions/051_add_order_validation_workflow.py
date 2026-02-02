"""Add order validation workflow columns and enum values

Revision ID: 051_order_validation
Revises: 050_rename_email_metadata
Create Date: 2026-01-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '051_order_validation'
down_revision = '050_rename_email_metadata'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add validation workflow columns to orders table and update order_status_enum."""

    # Add new enum values to order_status_enum
    # PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE, so we check first
    op.execute("""
        DO $$ 
        BEGIN
            -- Add pending_commercial if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'pending_commercial' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')
            ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'pending_commercial';
            END IF;
            
            -- Add commercial_approved if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'commercial_approved' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')
            ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'commercial_approved';
            END IF;
            
            -- Add commercial_rejected if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'commercial_rejected' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')
            ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'commercial_rejected';
            END IF;
            
            -- Add pending_technical if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'pending_technical' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')
            ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'pending_technical';
            END IF;
            
            -- Add technical_approved if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'technical_approved' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')
            ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'technical_approved';
            END IF;
            
            -- Add technical_rejected if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'technical_rejected' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status_enum')
            ) THEN
                ALTER TYPE order_status_enum ADD VALUE 'technical_rejected';
            END IF;
        END $$;
    """)

    # Add validation workflow columns to orders table
    op.execute("""
        DO $$ 
        BEGIN
            -- Add validation_required column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'validation_required'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN validation_required BOOLEAN NOT NULL DEFAULT TRUE;
            END IF;
            
            -- Add commercial_validated_by column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_validated_by'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN commercial_validated_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
            END IF;
            
            -- Add commercial_validated_at column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_validated_at'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN commercial_validated_at TIMESTAMP WITH TIME ZONE;
            END IF;
            
            -- Add commercial_validation_notes column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_validation_notes'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN commercial_validation_notes TEXT;
            END IF;
            
            -- Add commercial_approved column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_approved'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN commercial_approved BOOLEAN;
            END IF;
            
            -- Add technical_validated_by column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_validated_by'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN technical_validated_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
            END IF;
            
            -- Add technical_validated_at column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_validated_at'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN technical_validated_at TIMESTAMP WITH TIME ZONE;
            END IF;
            
            -- Add technical_validation_notes column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_validation_notes'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN technical_validation_notes TEXT;
            END IF;
            
            -- Add technical_approved column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_approved'
            ) THEN
                ALTER TABLE orders 
                ADD COLUMN technical_approved BOOLEAN;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Remove validation workflow columns from orders table.

    Note: PostgreSQL enum values cannot be removed, so we only drop columns.
    """
    op.execute("""
        DO $$ 
        BEGIN
            -- Drop columns if they exist
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_approved'
            ) THEN
                ALTER TABLE orders DROP COLUMN technical_approved;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_validation_notes'
            ) THEN
                ALTER TABLE orders DROP COLUMN technical_validation_notes;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_validated_at'
            ) THEN
                ALTER TABLE orders DROP COLUMN technical_validated_at;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'technical_validated_by'
            ) THEN
                ALTER TABLE orders DROP COLUMN technical_validated_by;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_approved'
            ) THEN
                ALTER TABLE orders DROP COLUMN commercial_approved;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_validation_notes'
            ) THEN
                ALTER TABLE orders DROP COLUMN commercial_validation_notes;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_validated_at'
            ) THEN
                ALTER TABLE orders DROP COLUMN commercial_validated_at;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'commercial_validated_by'
            ) THEN
                ALTER TABLE orders DROP COLUMN commercial_validated_by;
            END IF;
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'orders' AND column_name = 'validation_required'
            ) THEN
                ALTER TABLE orders DROP COLUMN validation_required;
            END IF;
        END $$;
    """)

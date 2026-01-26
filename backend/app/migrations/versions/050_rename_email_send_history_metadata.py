"""Rename email_send_history metadata column to email_metadata

Revision ID: 050_rename_email_metadata
Revises: 049_products_to_services
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa


revision = "050_rename_email_metadata"
down_revision = "049_products_to_services"
branch_labels = None
depends_on = None


def upgrade():
    """Rename metadata column to email_metadata in email_send_history table."""
    # Check if table exists and has the metadata column
    # Use DO block to safely check and rename
    op.execute("""
        DO $$ 
        BEGIN
            -- Check if table exists and column exists
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'email_send_history' 
                AND column_name = 'metadata'
            ) THEN
                -- Rename the column
                ALTER TABLE email_send_history 
                RENAME COLUMN metadata TO email_metadata;
            END IF;
        END $$;
    """)


def downgrade():
    """Rename email_metadata column back to metadata."""
    op.execute("""
        DO $$ 
        BEGIN
            -- Check if table exists and column exists
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'email_send_history' 
                AND column_name = 'email_metadata'
            ) THEN
                -- Rename the column back
                ALTER TABLE email_send_history 
                RENAME COLUMN email_metadata TO metadata;
            END IF;
        END $$;
    """)

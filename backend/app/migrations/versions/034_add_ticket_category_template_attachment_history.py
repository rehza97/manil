"""Add ticket category, template, attachment, and history tables

Revision ID: 034
Revises: 033
Create Date: 2026-01-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '034'
down_revision = '033'
branch_labels = None
depends_on = None


def upgrade():
    # Create ticket_categories table
    op.create_table(
        'ticket_categories',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('slug', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('color', sa.String(7), nullable=False, server_default='#3B82F6'),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('display_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true', index=True),
        sa.Column('default_support_group_id', sa.String(36), sa.ForeignKey('support_groups.id'), nullable=True),
        sa.Column('default_priority', sa.String(20), nullable=True),
        sa.Column('sla_policy_id', sa.String(36), sa.ForeignKey('sla_policies.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Create response_templates table
    op.create_table(
        'response_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('subject', sa.String(255), nullable=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('variables', postgresql.JSONB, nullable=True),
        sa.Column('category', sa.String(100), nullable=True, index=True),
        sa.Column('is_public', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true', index=True),
        sa.Column('usage_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('updated_by', sa.String(36), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Create ticket_attachments table
    op.create_table(
        'ticket_attachments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ticket_id', sa.String(36), sa.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('virus_scanned', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_safe', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_public', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('download_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('uploaded_by', sa.String(36), nullable=False),
    )

    # Create ticket_history table
    op.create_table(
        'ticket_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('ticket_id', sa.String(36), sa.ForeignKey('tickets.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('action', sa.String(50), nullable=False, index=True),
        sa.Column('field_name', sa.String(100), nullable=True),
        sa.Column('old_value', sa.Text, nullable=True),
        sa.Column('new_value', sa.Text, nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), index=True),
        sa.Column('created_by', sa.String(36), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
    )

    # Update tickets table to add foreign key constraint for category_id
    # First, we need to drop the existing column and recreate it with FK
    # But we'll do this conditionally to avoid issues if already has FK
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'tickets_category_id_fkey'
            ) THEN
                ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_category_id_fkey;
                ALTER TABLE tickets
                ADD CONSTRAINT tickets_category_id_fkey
                FOREIGN KEY (category_id) REFERENCES ticket_categories(id);
            END IF;
        END$$;
    """)


def downgrade():
    # Drop foreign key constraint on tickets.category_id
    op.execute("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_category_id_fkey;")

    # Drop tables in reverse order
    op.drop_table('ticket_history')
    op.drop_table('ticket_attachments')
    op.drop_table('response_templates')
    op.drop_table('ticket_categories')

"""create quotes tables

Revision ID: 022
Revises: 021
Create Date: 2025-11-19 12:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '022'
down_revision: Union[str, None] = '021'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create quotes, quote_items, and quote_timeline tables."""

    # Drop enum if it exists (from previous failed migrations)
    # This is safe because if the migration hasn't completed, the table doesn't exist yet
    op.execute("""
        DO $$ BEGIN
            DROP TYPE IF EXISTS quotestatus CASCADE;
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;
    """)

    # Create Enum type object - SQLAlchemy will create it during table creation
    quotestatus_enum = sa.Enum(
        'draft', 'pending_approval', 'approved', 'rejected', 'sent', 
        'accepted', 'declined', 'expired', 'converted',
        name='quotestatus'
    )

    # Create quotes table
    op.create_table(
        'quotes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('quote_number', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('version', sa.Integer(), nullable=False, default=1),
        sa.Column('parent_quote_id', sa.String(36), sa.ForeignKey('quotes.id'), nullable=True),
        sa.Column('is_latest_version', sa.Boolean(), nullable=False, default=True),
        sa.Column('customer_id', sa.String(36), sa.ForeignKey('customers.id'), nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', quotestatus_enum, nullable=False, index=True),
        sa.Column('subtotal_amount', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), nullable=False, default=19.00),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('declined_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approval_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('approved_by_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approval_notes', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('updated_by_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Create indexes for quotes table
    op.create_index('idx_quotes_customer_id', 'quotes', ['customer_id'])
    op.create_index('idx_quotes_status', 'quotes', ['status'])
    op.create_index('idx_quotes_valid_until', 'quotes', ['valid_until'])
    op.create_index('idx_quotes_created_at', 'quotes', ['created_at'])

    # Create quote_items table
    op.create_table(
        'quote_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('quote_id', sa.String(36), sa.ForeignKey('quotes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('product_id', sa.String(36), sa.ForeignKey('products.id'), nullable=True),
        sa.Column('item_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('discount_percentage', sa.Numeric(precision=5, scale=2), nullable=False, default=0.00),
        sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
    )

    # Create indexes for quote_items table
    op.create_index('idx_quote_items_quote_id', 'quote_items', ['quote_id'])
    op.create_index('idx_quote_items_product_id', 'quote_items', ['product_id'])

    # Create quote_timeline table
    op.create_table(
        'quote_timeline',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('quote_id', sa.String(36), sa.ForeignKey('quotes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_description', sa.Text(), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
    )

    # Create indexes for quote_timeline table
    op.create_index('idx_quote_timeline_quote_id', 'quote_timeline', ['quote_id'])
    op.create_index('idx_quote_timeline_created_at', 'quote_timeline', ['created_at'])


def downgrade() -> None:
    """Drop quotes tables."""

    # Drop tables
    op.drop_table('quote_timeline')
    op.drop_table('quote_items')
    op.drop_table('quotes')

    # Drop enum if it exists
    op.execute("""
        DO $$ BEGIN
            DROP TYPE quotestatus;
        EXCEPTION
            WHEN undefined_object THEN null;
        END $$;
    """)

"""create invoices tables

Revision ID: 023
Revises: 022
Create Date: 2025-01-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '023'
down_revision: Union[str, None] = '022'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create invoice tables."""

    # Create InvoiceStatus ENUM (if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE invoicestatus AS ENUM (
                'draft', 'issued', 'sent', 'paid',
                'partially_paid', 'overdue', 'cancelled'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create PaymentMethod ENUM (if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE paymentmethod AS ENUM (
                'bank_transfer', 'check', 'cash',
                'credit_card', 'mobile_payment', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create invoices table
    # Use postgresql.ENUM with create_type=False since we already created the types manually
    invoice_status_enum = postgresql.ENUM(
        'draft', 'issued', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled',
        name='invoicestatus',
        create_type=False
    )
    payment_method_enum = postgresql.ENUM(
        'bank_transfer', 'check', 'cash', 'credit_card', 'mobile_payment', 'other',
        name='paymentmethod',
        create_type=False
    )
    
    op.create_table(
        'invoices',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('invoice_number', sa.String(length=50), nullable=False),
        sa.Column('quote_id', sa.String(length=36), nullable=True),
        sa.Column('customer_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', invoice_status_enum, nullable=False),
        sa.Column('subtotal_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('tax_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('paid_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('payment_method', payment_method_enum, nullable=True),
        sa.Column('issue_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('payment_notes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    )

    # Create indexes on invoices table
    op.create_index(op.f('ix_invoices_invoice_number'), 'invoices', ['invoice_number'], unique=True)
    op.create_index(op.f('ix_invoices_customer_id'), 'invoices', ['customer_id'], unique=False)
    op.create_index(op.f('ix_invoices_quote_id'), 'invoices', ['quote_id'], unique=False)
    op.create_index(op.f('ix_invoices_status'), 'invoices', ['status'], unique=False)

    # Create invoice_items table
    op.create_table(
        'invoice_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('invoice_id', sa.String(length=36), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('product_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    )

    # Create index on invoice_items table
    op.create_index(op.f('ix_invoice_items_invoice_id'), 'invoice_items', ['invoice_id'], unique=False)

    # Create invoice_timeline table
    op.create_table(
        'invoice_timeline',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('invoice_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    )

    # Create index on invoice_timeline table
    op.create_index(op.f('ix_invoice_timeline_invoice_id'), 'invoice_timeline', ['invoice_id'], unique=False)


def downgrade() -> None:
    """Drop invoice tables."""

    # Drop indexes and tables
    op.drop_index(op.f('ix_invoice_timeline_invoice_id'), table_name='invoice_timeline')
    op.drop_table('invoice_timeline')

    op.drop_index(op.f('ix_invoice_items_invoice_id'), table_name='invoice_items')
    op.drop_table('invoice_items')

    op.drop_index(op.f('ix_invoices_status'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_quote_id'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_customer_id'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_invoice_number'), table_name='invoices')
    op.drop_table('invoices')

    # Drop ENUMs
    op.execute('DROP TYPE paymentmethod')
    op.execute('DROP TYPE invoicestatus')

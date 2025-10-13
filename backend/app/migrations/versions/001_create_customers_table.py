"""Create customers table

Revision ID: 001
Revises:
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create customers table with all required fields."""
    # Create customers table (ENUMs will be created automatically by SQLAlchemy)
    op.create_table(
        'customers',
        # Primary Key
        sa.Column('id', sa.String(length=36), nullable=False),

        # Basic Information
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),

        # Customer Classification
        sa.Column(
            'customer_type',
            sa.Enum('individual', 'corporate', name='customer_type_enum'),
            nullable=False,
            server_default='individual'
        ),
        sa.Column(
            'status',
            sa.Enum('pending', 'active', 'suspended',
                    'inactive', name='customer_status_enum'),
            nullable=False,
            server_default='pending'
        ),

        # Corporate Information (Optional)
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('tax_id', sa.String(length=50), nullable=True),

        # Address Information (Optional)
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('postal_code', sa.String(length=20), nullable=True),

        # Audit Fields
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(length=36), nullable=False),
        sa.Column('updated_by', sa.String(length=36), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_customers_email'),

        # Table comment
        comment='Customer records with contact information, classification, and audit trail'
    )

    # Create single-column indexes
    op.create_index('idx_customers_name', 'customers', ['name'])
    op.create_index('idx_customers_email', 'customers', ['email'])
    op.create_index('idx_customers_phone', 'customers', ['phone'])
    op.create_index('idx_customers_customer_type',
                    'customers', ['customer_type'])
    op.create_index('idx_customers_status', 'customers', ['status'])
    op.create_index('idx_customers_tax_id', 'customers', ['tax_id'])
    op.create_index('idx_customers_city', 'customers', ['city'])
    op.create_index('idx_customers_country', 'customers', ['country'])
    op.create_index('idx_customers_created_at', 'customers', ['created_at'])

    # Create composite indexes for common query patterns
    op.create_index('idx_customers_status_type',
                    'customers', ['status', 'customer_type'])
    op.create_index('idx_customers_email_status',
                    'customers', ['email', 'status'])
    op.create_index('idx_customers_created_at_status',
                    'customers', ['created_at', 'status'])

    # Create foreign keys (will be added after users table exists)
    # Note: These are added in migration 004_add_customer_foreign_keys.py


def downgrade() -> None:
    """Drop customers table and related types."""
    # Drop composite indexes
    op.drop_index('idx_customers_created_at_status', 'customers')
    op.drop_index('idx_customers_email_status', 'customers')
    op.drop_index('idx_customers_status_type', 'customers')

    # Drop single-column indexes
    op.drop_index('idx_customers_created_at', 'customers')
    op.drop_index('idx_customers_country', 'customers')
    op.drop_index('idx_customers_city', 'customers')
    op.drop_index('idx_customers_tax_id', 'customers')
    op.drop_index('idx_customers_status', 'customers')
    op.drop_index('idx_customers_customer_type', 'customers')
    op.drop_index('idx_customers_phone', 'customers')
    op.drop_index('idx_customers_email', 'customers')
    op.drop_index('idx_customers_name', 'customers')

    # Drop table
    op.drop_table('customers')

    # Drop enums
    op.execute('DROP TYPE customer_status_enum;')
    op.execute('DROP TYPE customer_type_enum;')

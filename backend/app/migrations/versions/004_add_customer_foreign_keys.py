"""Add foreign keys to customers table

Revision ID: 004
Revises: 003
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add foreign key constraints to customers table."""
    # Add indexes for foreign key columns
    op.create_index('idx_customers_created_by', 'customers', ['created_by'])
    op.create_index('idx_customers_updated_by', 'customers', ['updated_by'])

    # Create foreign keys to users table
    op.create_foreign_key(
        'fk_customers_created_by',
        'customers', 'users',
        ['created_by'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_customers_updated_by',
        'customers', 'users',
        ['updated_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove foreign key constraints from customers table."""
    # Drop foreign keys
    op.drop_constraint('fk_customers_updated_by',
                       'customers', type_='foreignkey')
    op.drop_constraint('fk_customers_created_by',
                       'customers', type_='foreignkey')

    # Drop indexes
    op.drop_index('idx_customers_updated_by', 'customers')
    op.drop_index('idx_customers_created_by', 'customers')

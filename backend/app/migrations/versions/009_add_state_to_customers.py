"""Add state field to customers table

Revision ID: 009
Revises: 008
Create Date: 2025-10-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add state column to customers table."""
    op.add_column(
        'customers',
        sa.Column('state', sa.String(100), nullable=True, comment='State/Province')
    )

    # Add index on state column
    op.create_index(
        'ix_customers_state',
        'customers',
        ['state'],
        unique=False
    )


def downgrade() -> None:
    """Remove state column from customers table."""
    op.drop_index('ix_customers_state', table_name='customers')
    op.drop_column('customers', 'state')

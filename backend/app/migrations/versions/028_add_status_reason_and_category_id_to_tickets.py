"""Add status_reason and category_id to tickets table

Revision ID: 028
Revises: 027
Create Date: 2025-12-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import Text, String


# revision identifiers, used by Alembic.
revision = '028'
down_revision = '027'
branch_labels = None
depends_on = None


def upgrade():
    """Add status_reason and category_id columns to tickets table."""
    # Add status_reason column
    op.add_column(
        'tickets',
        sa.Column(
            'status_reason',
            Text,
            nullable=True,
            comment='Reason for the current ticket status (e.g., why it was closed)'
        )
    )

    # Add category_id column
    op.add_column(
        'tickets',
        sa.Column(
            'category_id',
            String(36),
            nullable=True,
            comment='Optional ticket category ID for categorization'
        )
    )

    # Create index on category_id for performance
    op.create_index(
        'ix_tickets_category_id',
        'tickets',
        ['category_id']
    )


def downgrade():
    """Remove status_reason and category_id columns from tickets table."""
    op.drop_index('ix_tickets_category_id', 'tickets')
    op.drop_column('tickets', 'category_id')
    op.drop_column('tickets', 'status_reason')













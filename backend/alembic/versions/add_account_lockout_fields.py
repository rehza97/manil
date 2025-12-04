"""add account lockout fields

Revision ID: add_lockout_001
Revises:
Create Date: 2025-12-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_lockout_001'
down_revision = None  # Update this with your latest migration ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add failed_login_attempts column
    op.add_column('users', sa.Column(
        'failed_login_attempts',
        sa.Integer(),
        nullable=False,
        server_default='0',
        comment='Number of consecutive failed login attempts'
    ))

    # Add locked_until column
    op.add_column('users', sa.Column(
        'locked_until',
        sa.DateTime(),
        nullable=True,
        comment='Account locked until this timestamp (NULL if not locked)'
    ))

    # Add last_failed_login column for tracking
    op.add_column('users', sa.Column(
        'last_failed_login',
        sa.DateTime(),
        nullable=True,
        comment='Timestamp of last failed login attempt'
    ))

    # Create index on locked_until for query performance
    op.create_index(
        'ix_users_locked_until',
        'users',
        ['locked_until'],
        unique=False
    )


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_users_locked_until', table_name='users')

    # Drop columns
    op.drop_column('users', 'last_failed_login')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')

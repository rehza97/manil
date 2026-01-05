"""Add account lockout fields to users table

Revision ID: 027
Revises: 026
Create Date: 2025-12-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import Integer, DateTime


# revision identifiers, used by Alembic.
revision = '027'
down_revision = '026'
branch_labels = None
depends_on = None


def upgrade():
    """Add account lockout security fields to users table."""
    # Add failed_login_attempts column
    op.add_column(
        'users',
        sa.Column(
            'failed_login_attempts',
            Integer,
            nullable=False,
            server_default='0',
            comment='Number of consecutive failed login attempts'
        )
    )

    # Add locked_until column
    op.add_column(
        'users',
        sa.Column(
            'locked_until',
            DateTime,
            nullable=True,
            comment='Account locked until this timestamp (NULL if not locked)'
        )
    )

    # Add last_failed_login column
    op.add_column(
        'users',
        sa.Column(
            'last_failed_login',
            DateTime,
            nullable=True,
            comment='Timestamp of last failed login attempt'
        )
    )

    # Add index on locked_until for performance
    op.create_index(
        'ix_users_locked_until',
        'users',
        ['locked_until']
    )


def downgrade():
    """Remove account lockout security fields from users table."""
    op.drop_index('ix_users_locked_until', 'users')
    op.drop_column('users', 'last_failed_login')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')

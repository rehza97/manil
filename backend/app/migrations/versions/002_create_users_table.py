"""Create users table

Revision ID: 002
Revises: 001
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users table with authentication and audit fields."""
    # Create users table
    op.create_table(
        'users',
        # Primary Key
        sa.Column('id', sa.String(length=36), nullable=False),

        # Authentication
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='client'),

        # Status flags
        sa.Column('is_active', sa.Boolean(),
                  nullable=False, server_default='true'),
        sa.Column('is_2fa_enabled', sa.Boolean(),
                  nullable=False, server_default='false'),
        sa.Column('totp_secret', sa.String(length=255), nullable=True),

        # Audit fields
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('updated_by', sa.String(length=36), nullable=True),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id', name='pk_users'),
        sa.UniqueConstraint('email', name='uq_users_email'),

        # Table comment
        comment='User accounts with authentication and role information'
    )

    # Create single-column indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_role', 'users', ['role'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    op.create_index('idx_users_created_by', 'users', ['created_by'])
    op.create_index('idx_users_updated_by', 'users', ['updated_by'])

    # Create composite indexes for common query patterns
    op.create_index('idx_users_email_active', 'users', ['email', 'is_active'])
    op.create_index('idx_users_role_active', 'users', ['role', 'is_active'])
    op.create_index('idx_users_created_at_role',
                    'users', ['created_at', 'role'])

    # Create self-referencing foreign keys
    op.create_foreign_key(
        'fk_users_created_by',
        'users', 'users',
        ['created_by'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_users_updated_by',
        'users', 'users',
        ['updated_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Drop users table and related types."""
    # Drop foreign keys
    op.drop_constraint('fk_users_updated_by', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_created_by', 'users', type_='foreignkey')

    # Drop composite indexes
    op.drop_index('idx_users_created_at_role', 'users')
    op.drop_index('idx_users_role_active', 'users')
    op.drop_index('idx_users_email_active', 'users')

    # Drop single-column indexes
    op.drop_index('idx_users_updated_by', 'users')
    op.drop_index('idx_users_created_by', 'users')
    op.drop_index('idx_users_created_at', 'users')
    op.drop_index('idx_users_is_active', 'users')
    op.drop_index('idx_users_role', 'users')
    op.drop_index('idx_users_email', 'users')

    # Drop table
    op.drop_table('users')

    # Drop enum
    op.execute('DROP TYPE user_role;')

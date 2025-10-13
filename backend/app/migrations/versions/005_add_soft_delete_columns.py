"""Add soft delete columns to all tables

Revision ID: 005
Revises: 004
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add soft delete columns (deleted_at, deleted_by) to all tables."""

    # Add soft delete columns to users table
    op.add_column('users', sa.Column(
        'deleted_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column(
        'deleted_by', sa.String(length=36), nullable=True))
    op.create_index('idx_users_deleted_at', 'users', ['deleted_at'])
    op.create_foreign_key(
        'fk_users_deleted_by',
        'users', 'users',
        ['deleted_by'], ['id'],
        ondelete='SET NULL'
    )

    # Add soft delete columns to customers table
    op.add_column('customers', sa.Column(
        'deleted_at', sa.DateTime(), nullable=True))
    op.add_column('customers', sa.Column(
        'deleted_by', sa.String(length=36), nullable=True))
    op.create_index('idx_customers_deleted_at', 'customers', ['deleted_at'])
    op.create_foreign_key(
        'fk_customers_deleted_by',
        'customers', 'users',
        ['deleted_by'], ['id'],
        ondelete='SET NULL'
    )

    # Add soft delete columns to audit_logs table
    op.add_column('audit_logs', sa.Column(
        'deleted_at', sa.DateTime(), nullable=True))
    op.add_column('audit_logs', sa.Column(
        'deleted_by', sa.String(length=36), nullable=True))
    op.create_index('idx_audit_logs_deleted_at', 'audit_logs', ['deleted_at'])
    op.create_foreign_key(
        'fk_audit_logs_deleted_by',
        'audit_logs', 'users',
        ['deleted_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Remove soft delete columns from all tables."""

    # Remove from audit_logs
    op.drop_constraint('fk_audit_logs_deleted_by',
                       'audit_logs', type_='foreignkey')
    op.drop_index('idx_audit_logs_deleted_at', 'audit_logs')
    op.drop_column('audit_logs', 'deleted_by')
    op.drop_column('audit_logs', 'deleted_at')

    # Remove from customers
    op.drop_constraint('fk_customers_deleted_by',
                       'customers', type_='foreignkey')
    op.drop_index('idx_customers_deleted_at', 'customers')
    op.drop_column('customers', 'deleted_by')
    op.drop_column('customers', 'deleted_at')

    # Remove from users
    op.drop_constraint('fk_users_deleted_by', 'users', type_='foreignkey')
    op.drop_index('idx_users_deleted_at', 'users')
    op.drop_column('users', 'deleted_by')
    op.drop_column('users', 'deleted_at')

"""Create audit_logs table

Revision ID: 003
Revises: 002
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create audit_logs table for comprehensive activity tracking."""
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        # Primary Key
        sa.Column('id', sa.String(length=36), nullable=False),

        # Action Information
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('resource_type', sa.String(length=100), nullable=False),
        sa.Column('resource_id', sa.String(length=36), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),

        # User Information
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('user_email', sa.String(length=255), nullable=True),
        sa.Column('user_role', sa.String(length=50), nullable=True),

        # Request Information
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.Text(), nullable=True),

        # Additional Data
        sa.Column('old_values', JSON, nullable=True),
        sa.Column('new_values', JSON, nullable=True),
        sa.Column('extra_data', JSON, nullable=True),

        # Status
        sa.Column('success', sa.Boolean(),
                  nullable=False, server_default='true'),
        sa.Column('error_message', sa.Text(), nullable=True),

        # Audit fields
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('updated_by', sa.String(length=36), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id', name='pk_audit_logs'),

        # Table comment
        comment='Comprehensive audit log for all system activities and security events'
    )

    # Create indexes for performance
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_logs_resource_type',
                    'audit_logs', ['resource_type'])
    op.create_index('idx_audit_logs_resource_id',
                    'audit_logs', ['resource_id'])
    op.create_index('idx_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_created_at', 'audit_logs', ['created_at'])

    # Create composite indexes for common query patterns
    op.create_index('idx_audit_user_action',
                    'audit_logs', ['user_id', 'action'])
    op.create_index('idx_audit_resource', 'audit_logs',
                    ['resource_type', 'resource_id'])
    op.create_index('idx_audit_created', 'audit_logs', ['created_at'])

    # Create foreign keys to users table
    op.create_foreign_key(
        'fk_audit_logs_user_id',
        'audit_logs', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_audit_logs_created_by',
        'audit_logs', 'users',
        ['created_by'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_audit_logs_updated_by',
        'audit_logs', 'users',
        ['updated_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Drop audit_logs table."""
    # Drop foreign keys
    op.drop_constraint('fk_audit_logs_updated_by',
                       'audit_logs', type_='foreignkey')
    op.drop_constraint('fk_audit_logs_created_by',
                       'audit_logs', type_='foreignkey')
    op.drop_constraint('fk_audit_logs_user_id',
                       'audit_logs', type_='foreignkey')

    # Drop composite indexes
    op.drop_index('idx_audit_created', 'audit_logs')
    op.drop_index('idx_audit_resource', 'audit_logs')
    op.drop_index('idx_audit_user_action', 'audit_logs')

    # Drop regular indexes
    op.drop_index('idx_audit_logs_created_at', 'audit_logs')
    op.drop_index('idx_audit_logs_user_id', 'audit_logs')
    op.drop_index('idx_audit_logs_resource_id', 'audit_logs')
    op.drop_index('idx_audit_logs_resource_type', 'audit_logs')
    op.drop_index('idx_audit_logs_action', 'audit_logs')

    # Drop table
    op.drop_table('audit_logs')

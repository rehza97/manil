"""create settings tables for role management

Revision ID: 025
Revises: 024
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('slug', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(50), nullable=False, index=True),
        sa.Column('resource', sa.String(50), nullable=False, index=True),
        sa.Column('action', sa.String(50), nullable=False, index=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('slug', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_role_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('hierarchy_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('settings', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by_id', sa.String(36), nullable=True),
        sa.Column('updated_by_id', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['parent_role_id'], ['roles.id'], ondelete='SET NULL'),
    )

    # Create role_permissions association table
    op.create_table(
        'role_permissions',
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
    )

    # Create system_settings table
    op.create_table(
        'system_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('key', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('value', postgresql.JSONB(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by_id', sa.String(36), nullable=True),
    )

    # Create indexes
    op.create_index('idx_permissions_resource_action', 'permissions', ['resource', 'action'])
    op.create_index('idx_roles_hierarchy', 'roles', ['parent_role_id', 'hierarchy_level'])
    op.create_index('idx_role_permissions_role', 'role_permissions', ['role_id'])
    op.create_index('idx_role_permissions_permission', 'role_permissions', ['permission_id'])


def downgrade() -> None:
    op.drop_table('system_settings')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')

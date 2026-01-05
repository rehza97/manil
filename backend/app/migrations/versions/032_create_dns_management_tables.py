"""create dns management tables

Revision ID: 032
Revises: 031
Create Date: 2025-12-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = '032'
down_revision = '031'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create DNS management tables for VPS hosting."""

    # ============================================================================
    # Create DNS Zones table
    # ============================================================================
    # Note: Enums are created automatically by SQLAlchemy

    op.create_table(
        'dns_zones',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('subscription_id', sa.String(36), nullable=True, index=True),
        sa.Column('zone_name', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('zone_type', sa.Enum(
            'FORWARD', 'REVERSE',
            name='dns_zone_type'
        ), nullable=False, server_default='FORWARD'),
        sa.Column('status', sa.Enum(
            'PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED',
            name='dns_zone_status'
        ), nullable=False, server_default='PENDING', index=True),
        sa.Column('ttl_default', sa.Integer(), nullable=False, server_default='3600'),
        sa.Column('nameservers', JSONB, nullable=True, server_default='[]'),
        sa.Column('soa_record', JSONB, nullable=True),
        sa.Column('is_system_managed', sa.Boolean(), nullable=False, server_default='false', index=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_updated_serial', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), index=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['subscription_id'], ['vps_subscriptions.id'], ondelete='SET NULL'),
    )

    # ============================================================================
    # Create DNS Records table
    # ============================================================================

    op.create_table(
        'dns_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('zone_id', sa.String(36), nullable=False, index=True),
        sa.Column('record_name', sa.String(255), nullable=False),
        sa.Column('record_type', sa.Enum(
            'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'PTR', 'SOA',
            name='dns_record_type'
        ), nullable=False, index=True),
        sa.Column('record_value', sa.String(500), nullable=False),
        sa.Column('ttl', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('weight', sa.Integer(), nullable=True),
        sa.Column('port', sa.Integer(), nullable=True),
        sa.Column('is_system_managed', sa.Boolean(), nullable=False, server_default='false', index=True),
        sa.Column('record_metadata', JSONB, nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by_id', sa.String(36), nullable=True),
        sa.Column('last_modified_by_id', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['zone_id'], ['dns_zones.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['last_modified_by_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create composite unique constraint for (zone_id, record_name, record_type)
    op.create_unique_constraint(
        'uq_dns_records_zone_name_type',
        'dns_records',
        ['zone_id', 'record_name', 'record_type']
    )

    # Create composite indexes for efficient queries
    op.create_index(
        'ix_dns_records_zone_type',
        'dns_records',
        ['zone_id', 'record_type']
    )

    # ============================================================================
    # Create DNS Zone Templates table
    # ============================================================================

    op.create_table(
        'dns_zone_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('template_type', sa.Enum(
            'WEB_SERVER', 'MAIL_SERVER', 'FULL_STACK', 'CUSTOM',
            name='dns_template_type'
        ), nullable=False, server_default='CUSTOM'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('record_definitions', JSONB, nullable=False, server_default='[]'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # ============================================================================
    # Create DNS Sync Log table
    # ============================================================================

    op.create_table(
        'dns_sync_log',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('zone_id', sa.String(36), nullable=True, index=True),
        sa.Column('sync_type', sa.Enum(
            'ZONE_CREATE', 'ZONE_UPDATE', 'ZONE_DELETE',
            'RECORD_UPDATE', 'FULL_RELOAD', 'CONFIG_UPDATE',
            name='dns_sync_type'
        ), nullable=False),
        sa.Column('status', sa.Enum(
            'SUCCESS', 'FAILED', 'PENDING',
            name='dns_sync_status'
        ), nullable=False, server_default='PENDING', index=True),
        sa.Column('config_snapshot', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('triggered_by_id', sa.String(36), nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), index=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['zone_id'], ['dns_zones.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['triggered_by_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create composite indexes for sync log queries
    op.create_index(
        'ix_dns_sync_log_zone_status',
        'dns_sync_log',
        ['zone_id', 'status']
    )


def downgrade() -> None:
    """Drop DNS management tables."""

    # Drop tables in reverse order (respecting foreign keys)
    # Enums are dropped automatically by SQLAlchemy when tables are dropped
    op.drop_index('ix_dns_sync_log_zone_status', table_name='dns_sync_log')
    op.drop_table('dns_sync_log')
    op.drop_table('dns_zone_templates')

    op.drop_index('ix_dns_records_zone_type', table_name='dns_records')
    op.drop_constraint('uq_dns_records_zone_name_type', 'dns_records', type_='unique')
    op.drop_table('dns_records')

    op.drop_table('dns_zones')

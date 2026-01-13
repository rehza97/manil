"""create vps service domains

Revision ID: 040_create_vps_service_domains
Revises: 039_product_quote_requests
Create Date: 2026-01-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '040_create_vps_service_domains'
down_revision = '039_product_quote_requests'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type for domain_type (if it doesn't exist)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE domain_type AS ENUM ('AUTO', 'CUSTOM');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create vps_service_domains table
    op.create_table(
        'vps_service_domains',
        sa.Column('id', sa.String(36), primary_key=True, server_default=sa.text('gen_random_uuid()::text')),
        sa.Column('subscription_id', sa.String(36), sa.ForeignKey('vps_subscriptions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_name', sa.String(255), nullable=False),
        sa.Column('service_port', sa.Integer(), nullable=False),
        sa.Column('domain_type', postgresql.ENUM('AUTO', 'CUSTOM', name='domain_type', create_type=False), nullable=False),
        sa.Column('domain_name', sa.String(255), nullable=False, unique=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('dns_zone_id', sa.String(36), sa.ForeignKey('dns_zones.id', ondelete='SET NULL'), nullable=True),
        sa.Column('dns_record_id', sa.String(36), sa.ForeignKey('dns_records.id', ondelete='SET NULL'), nullable=True),
        sa.Column('proxy_configured', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes
    op.create_index('ix_vps_service_domains_subscription_id', 'vps_service_domains', ['subscription_id'])
    op.create_index('ix_vps_service_domains_domain_name', 'vps_service_domains', ['domain_name'])
    op.create_index('ix_vps_service_domains_is_active', 'vps_service_domains', ['is_active'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_vps_service_domains_is_active', table_name='vps_service_domains')
    op.drop_index('ix_vps_service_domains_domain_name', table_name='vps_service_domains')
    op.drop_index('ix_vps_service_domains_subscription_id', table_name='vps_service_domains')

    # Drop table
    op.drop_table('vps_service_domains')

    # Drop enum type
    op.execute('DROP TYPE domain_type')

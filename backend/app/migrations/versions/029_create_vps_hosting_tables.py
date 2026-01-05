"""create vps hosting tables

Revision ID: 029
Revises: 028
Create Date: 2025-12-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '029'
down_revision = '028'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create VPS Plans table
    op.create_table(
        'vps_plans',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, index=True),
        sa.Column('slug', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cpu_cores', sa.Float(), nullable=False),
        sa.Column('ram_gb', sa.Integer(), nullable=False),
        sa.Column('storage_gb', sa.Integer(), nullable=False),
        sa.Column('bandwidth_tb', sa.Float(), nullable=False),
        sa.Column('monthly_price', sa.Numeric(10, 2), nullable=False),
        sa.Column('setup_fee', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('features', postgresql.JSONB(), nullable=True, server_default='{}'),
        sa.Column('docker_image', sa.String(255), nullable=False, server_default='ubuntu:22.04'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create VPS Subscriptions table
    op.create_table(
        'vps_subscriptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('subscription_number', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('customer_id', sa.String(36), nullable=False, index=True),
        sa.Column('plan_id', sa.String(36), nullable=False, index=True),
        sa.Column('quote_id', sa.String(36), nullable=True),
        sa.Column('status', sa.Enum(
            'PENDING', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'TERMINATED',
            name='subscription_status'
        ), nullable=False, server_default='PENDING'),
        sa.Column('status_reason', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('next_billing_date', sa.Date(), nullable=True),
        sa.Column('billing_cycle', sa.Enum(
            'MONTHLY', 'QUARTERLY', 'ANNUALLY',
            name='billing_cycle'
        ), nullable=False, server_default='MONTHLY'),
        sa.Column('last_billed_date', sa.Date(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('terminated_at', sa.DateTime(), nullable=True),
        sa.Column('is_trial', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('grace_period_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('total_invoiced', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('total_paid', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), index=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['vps_plans.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create Container Instances table
    op.create_table(
        'container_instances',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('subscription_id', sa.String(36), nullable=False, unique=True),
        sa.Column('container_id', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('container_name', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('ip_address', sa.String(15), nullable=False, unique=True, index=True),
        sa.Column('network_name', sa.String(255), nullable=False),
        sa.Column('hostname', sa.String(255), nullable=False),
        sa.Column('ssh_port', sa.Integer(), nullable=False, unique=True),
        sa.Column('root_password', sa.String(255), nullable=False),
        sa.Column('ssh_public_key', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum(
            'CREATING', 'RUNNING', 'STOPPED', 'REBOOTING', 'ERROR', 'TERMINATED',
            name='container_status'
        ), nullable=False, server_default='CREATING'),
        sa.Column('docker_state', sa.Text(), nullable=True),
        sa.Column('cpu_limit', sa.Float(), nullable=False),
        sa.Column('memory_limit_gb', sa.Integer(), nullable=False),
        sa.Column('storage_limit_gb', sa.Integer(), nullable=False),
        sa.Column('data_volume_path', sa.String(500), nullable=False),
        sa.Column('first_started_at', sa.DateTime(), nullable=True),
        sa.Column('last_started_at', sa.DateTime(), nullable=True),
        sa.Column('last_stopped_at', sa.DateTime(), nullable=True),
        sa.Column('uptime_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['subscription_id'], ['vps_subscriptions.id'], ondelete='CASCADE'),
    )

    # Create Container Metrics table
    op.create_table(
        'container_metrics',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('subscription_id', sa.String(36), nullable=False, index=True),
        sa.Column('container_id', sa.String(36), nullable=False, index=True),
        sa.Column('cpu_usage_percent', sa.Float(), nullable=False),
        sa.Column('memory_usage_mb', sa.Integer(), nullable=False),
        sa.Column('memory_usage_percent', sa.Float(), nullable=False),
        sa.Column('storage_usage_mb', sa.Integer(), nullable=False),
        sa.Column('storage_usage_percent', sa.Float(), nullable=False),
        sa.Column('network_rx_bytes', sa.BigInteger(), nullable=False),
        sa.Column('network_tx_bytes', sa.BigInteger(), nullable=False),
        sa.Column('block_read_bytes', sa.BigInteger(), nullable=False),
        sa.Column('block_write_bytes', sa.BigInteger(), nullable=False),
        sa.Column('process_count', sa.Integer(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), index=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['vps_subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['container_id'], ['container_instances.id'], ondelete='CASCADE'),
    )

    # Create Subscription Timeline table
    op.create_table(
        'subscription_timeline',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('subscription_id', sa.String(36), nullable=False, index=True),
        sa.Column('event_type', sa.Enum(
            'CREATED', 'APPROVED', 'PROVISIONED', 'STARTED', 'STOPPED', 'REBOOTED',
            'UPGRADED', 'DOWNGRADED', 'SUSPENDED', 'REACTIVATED', 'CANCELLED',
            'TERMINATED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'INVOICE_GENERATED',
            name='timeline_event_type'
        ), nullable=False),
        sa.Column('event_description', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('actor_id', sa.String(36), nullable=True),
        sa.Column('actor_type', sa.Enum(
            'CUSTOMER', 'ADMIN', 'SYSTEM',
            name='actor_type'
        ), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'), index=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['vps_subscriptions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create composite indexes for efficient queries
    op.create_index(
        'ix_metrics_subscription_recorded',
        'container_metrics',
        ['subscription_id', 'recorded_at']
    )
    op.create_index(
        'ix_metrics_container_recorded',
        'container_metrics',
        ['container_id', 'recorded_at']
    )

    # Add VPS subscription foreign key to invoices table if not exists
    op.add_column(
        'invoices',
        sa.Column('vps_subscription_id', sa.String(36), nullable=True)
    )
    op.create_foreign_key(
        'fk_invoices_vps_subscription',
        'invoices',
        'vps_subscriptions',
        ['vps_subscription_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        'ix_invoices_vps_subscription_id',
        'invoices',
        ['vps_subscription_id']
    )


def downgrade() -> None:
    # Drop invoice foreign key and column
    op.drop_index('ix_invoices_vps_subscription_id', table_name='invoices')
    op.drop_constraint('fk_invoices_vps_subscription', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'vps_subscription_id')

    # Drop composite indexes
    op.drop_index('ix_metrics_container_recorded', table_name='container_metrics')
    op.drop_index('ix_metrics_subscription_recorded', table_name='container_metrics')

    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('subscription_timeline')
    op.drop_table('container_metrics')
    op.drop_table('container_instances')
    op.drop_table('vps_subscriptions')
    op.drop_table('vps_plans')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS actor_type')
    op.execute('DROP TYPE IF EXISTS timeline_event_type')
    op.execute('DROP TYPE IF EXISTS container_status')
    op.execute('DROP TYPE IF EXISTS billing_cycle')
    op.execute('DROP TYPE IF EXISTS subscription_status')

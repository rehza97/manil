"""enhance container metrics with cgroup data

Revision ID: 036_enhance_container_metrics
Revises: 035_update_response_templates_schema
Create Date: 2026-01-05

Adds advanced container metrics from cgroup monitoring:
- CPU throttling statistics
- Memory pressure indicators (PSI)
- OOM kill counters
- CPU steal time tracking
- Network/Block I/O rate fields
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '036_enhance_container_metrics'
down_revision = '035'  # Use the actual revision ID, not the filename
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add advanced cgroup metrics columns to container_metrics table"""

    # CPU Throttling Metrics
    op.add_column(
        'container_metrics',
        sa.Column('cpu_throttle_periods', sa.Integer(), nullable=True, comment='Number of enforcement periods where container was throttled')
    )
    op.add_column(
        'container_metrics',
        sa.Column('cpu_throttled_time_ms', sa.BigInteger(), nullable=True, comment='Total time container was throttled (milliseconds)')
    )
    op.add_column(
        'container_metrics',
        sa.Column('cpu_steal_percent', sa.Float(), nullable=True, comment='CPU steal time percentage (host overcommitment indicator)')
    )

    # Memory Pressure Metrics (PSI - Pressure Stall Information)
    op.add_column(
        'container_metrics',
        sa.Column('memory_pressure_some_avg10', sa.Float(), nullable=True, comment='Memory pressure: % time some tasks stalled (10s avg)')
    )
    op.add_column(
        'container_metrics',
        sa.Column('memory_pressure_full_avg10', sa.Float(), nullable=True, comment='Memory pressure: % time all tasks stalled (10s avg)')
    )

    # OOM Kill Tracking
    op.add_column(
        'container_metrics',
        sa.Column('oom_kill_count', sa.Integer(), nullable=True, server_default='0', comment='Number of OOM kill events')
    )

    # Network I/O Rate Fields (calculated from deltas)
    op.add_column(
        'container_metrics',
        sa.Column('network_rx_bytes_per_sec', sa.BigInteger(), nullable=True, comment='Network receive rate (bytes/sec)')
    )
    op.add_column(
        'container_metrics',
        sa.Column('network_tx_bytes_per_sec', sa.BigInteger(), nullable=True, comment='Network transmit rate (bytes/sec)')
    )

    # Block I/O Rate Fields (calculated from deltas)
    op.add_column(
        'container_metrics',
        sa.Column('block_read_bytes_per_sec', sa.BigInteger(), nullable=True, comment='Block device read rate (bytes/sec)')
    )
    op.add_column(
        'container_metrics',
        sa.Column('block_write_bytes_per_sec', sa.BigInteger(), nullable=True, comment='Block device write rate (bytes/sec)')
    )

    # Create indexes for performance on high-value columns
    # Index throttled containers for quick alert queries
    op.create_index(
        'ix_metrics_throttle',
        'container_metrics',
        ['cpu_throttle_periods'],
        postgresql_where=sa.text('cpu_throttle_periods > 0')
    )

    # Index OOM events for critical alerts
    op.create_index(
        'ix_metrics_oom',
        'container_metrics',
        ['oom_kill_count'],
        postgresql_where=sa.text('oom_kill_count > 0')
    )

    # Index memory pressure for performance monitoring
    op.create_index(
        'ix_metrics_mem_pressure',
        'container_metrics',
        ['memory_pressure_full_avg10'],
        postgresql_where=sa.text('memory_pressure_full_avg10 > 1.0')
    )


def downgrade() -> None:
    """Remove advanced cgroup metrics columns"""

    # Drop indexes first
    op.drop_index('ix_metrics_mem_pressure', table_name='container_metrics')
    op.drop_index('ix_metrics_oom', table_name='container_metrics')
    op.drop_index('ix_metrics_throttle', table_name='container_metrics')

    # Drop columns
    op.drop_column('container_metrics', 'block_write_bytes_per_sec')
    op.drop_column('container_metrics', 'block_read_bytes_per_sec')
    op.drop_column('container_metrics', 'network_tx_bytes_per_sec')
    op.drop_column('container_metrics', 'network_rx_bytes_per_sec')
    op.drop_column('container_metrics', 'oom_kill_count')
    op.drop_column('container_metrics', 'memory_pressure_full_avg10')
    op.drop_column('container_metrics', 'memory_pressure_some_avg10')
    op.drop_column('container_metrics', 'cpu_steal_percent')
    op.drop_column('container_metrics', 'cpu_throttled_time_ms')
    op.drop_column('container_metrics', 'cpu_throttle_periods')

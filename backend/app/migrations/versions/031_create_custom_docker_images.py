"""Create custom docker images tables

Revision ID: 031
Revises: 030
Create Date: 2025-01-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ENUM

# revision identifiers, used by Alembic.
revision = '031'
down_revision = '030'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum for image build status (only if it doesn't exist)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE imagebuildstatus AS ENUM (
                'PENDING',
                'VALIDATING',
                'BUILDING',
                'SCANNING',
                'COMPLETED',
                'FAILED',
                'REJECTED'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create custom_docker_images table
    op.create_table(
        'custom_docker_images',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('customer_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('subscription_id', sa.String(36), sa.ForeignKey('vps_subscriptions.id', ondelete='SET NULL'), nullable=True, index=True),

        # Image identification
        sa.Column('image_name', sa.String(255), nullable=False, index=True),
        sa.Column('image_tag', sa.String(100), default='latest'),
        sa.Column('docker_image_id', sa.String(255), nullable=True),

        # Upload information
        sa.Column('upload_archive_path', sa.String(500), nullable=False),
        sa.Column('upload_size_bytes', sa.BigInteger, nullable=False),
        sa.Column('upload_filename', sa.String(255), nullable=False),

        # Dockerfile info
        sa.Column('dockerfile_path', sa.String(255), default='Dockerfile'),
        sa.Column('dockerfile_content', sa.Text, nullable=True),

        # Build configuration
        sa.Column('build_args', JSONB, default={}),
        sa.Column('build_context_path', sa.String(255), default='.'),
        sa.Column('target_stage', sa.String(100), nullable=True),

        # Build status (enum created manually above, so use create_type=False)
        sa.Column('status', ENUM('PENDING', 'VALIDATING', 'BUILDING', 'SCANNING', 'COMPLETED', 'FAILED', 'REJECTED', name='imagebuildstatus', create_type=False), nullable=False, default='PENDING'),
        sa.Column('build_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('build_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('build_duration_seconds', sa.Integer, nullable=True),

        # Build output
        sa.Column('build_logs', sa.Text, nullable=True),
        sa.Column('build_error', sa.Text, nullable=True),

        # Security scanning
        sa.Column('security_scan_results', JSONB, nullable=True),
        sa.Column('scan_completed_at', sa.DateTime(timezone=True), nullable=True),

        # Image metadata
        sa.Column('image_size_mb', sa.Float, nullable=True),
        sa.Column('base_image', sa.String(255), nullable=True),
        sa.Column('exposed_ports', JSONB, default=[]),

        # Version control
        sa.Column('version', sa.Integer, default=1),
        sa.Column('previous_version_id', sa.String(36), sa.ForeignKey('custom_docker_images.id', ondelete='SET NULL'), nullable=True),

        # Approval
        sa.Column('requires_approval', sa.Boolean, default=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),

        # Soft delete
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False)
    )

    # Create indexes for custom_docker_images (only if they don't exist)
    # Note: Some indexes are auto-created by index=True on columns, so we check first
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_custom_docker_images_customer_id') THEN
                CREATE INDEX ix_custom_docker_images_customer_id ON custom_docker_images (customer_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_custom_docker_images_subscription_id') THEN
                CREATE INDEX ix_custom_docker_images_subscription_id ON custom_docker_images (subscription_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_custom_docker_images_status') THEN
                CREATE INDEX ix_custom_docker_images_status ON custom_docker_images (status);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_custom_docker_images_created_at') THEN
                CREATE INDEX ix_custom_docker_images_created_at ON custom_docker_images (created_at);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_custom_docker_images_is_deleted') THEN
                CREATE INDEX ix_custom_docker_images_is_deleted ON custom_docker_images (is_deleted);
            END IF;
        END $$;
    """)

    # Create image_build_logs table
    op.create_table(
        'image_build_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('image_id', sa.String(36), sa.ForeignKey('custom_docker_images.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('log_level', sa.String(20), default='INFO'),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('step', sa.String(100), nullable=True)
    )

    # Create indexes for image_build_logs (only if they don't exist)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_image_build_logs_image_id') THEN
                CREATE INDEX ix_image_build_logs_image_id ON image_build_logs (image_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_image_build_logs_timestamp') THEN
                CREATE INDEX ix_image_build_logs_timestamp ON image_build_logs (timestamp);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_image_build_logs_step') THEN
                CREATE INDEX ix_image_build_logs_step ON image_build_logs (step);
            END IF;
        END $$;
    """)

    # Add custom_image_id to vps_subscriptions
    op.add_column('vps_subscriptions',
        sa.Column('custom_image_id', sa.String(36), sa.ForeignKey('custom_docker_images.id', ondelete='SET NULL'), nullable=True)
    )
    # Create index only if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_vps_subscriptions_custom_image_id') THEN
                CREATE INDEX ix_vps_subscriptions_custom_image_id ON vps_subscriptions (custom_image_id);
            END IF;
        END $$;
    """)


def downgrade():
    # Drop indexes and columns from vps_subscriptions
    op.drop_index('ix_vps_subscriptions_custom_image_id', 'vps_subscriptions')
    op.drop_column('vps_subscriptions', 'custom_image_id')

    # Drop image_build_logs table
    op.drop_index('ix_image_build_logs_step', 'image_build_logs')
    op.drop_index('ix_image_build_logs_timestamp', 'image_build_logs')
    op.drop_index('ix_image_build_logs_image_id', 'image_build_logs')
    op.drop_table('image_build_logs')

    # Drop custom_docker_images table
    op.drop_index('ix_custom_docker_images_is_deleted', 'custom_docker_images')
    op.drop_index('ix_custom_docker_images_created_at', 'custom_docker_images')
    op.drop_index('ix_custom_docker_images_status', 'custom_docker_images')
    op.drop_index('ix_custom_docker_images_subscription_id', 'custom_docker_images')
    op.drop_index('ix_custom_docker_images_customer_id', 'custom_docker_images')
    op.drop_table('custom_docker_images')

    # Drop enum
    op.execute('DROP TYPE imagebuildstatus')

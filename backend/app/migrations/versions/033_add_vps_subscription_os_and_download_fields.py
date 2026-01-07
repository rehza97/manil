"""Add VPS subscription OS fields and image download tracking

Revision ID: 033
Revises: 032
Create Date: 2026-01-03
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum value for subscription_status
    op.execute(
        """
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'subscription_status'
        AND e.enumlabel = 'DOWNLOADING_IMAGE'
    ) THEN
      EXECUTE 'ALTER TYPE subscription_status ADD VALUE ''DOWNLOADING_IMAGE''';
    END IF;
  END IF;
END
$$;
"""
    )

    # Add columns to vps_subscriptions
    op.add_column("vps_subscriptions", sa.Column("os_distro_id", sa.String(length=50), nullable=True))
    op.add_column("vps_subscriptions", sa.Column("os_docker_image", sa.String(length=255), nullable=True))

    op.add_column("vps_subscriptions", sa.Column("image_download_status", sa.String(length=50), nullable=True))
    op.add_column("vps_subscriptions", sa.Column("image_download_progress", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("vps_subscriptions", sa.Column("image_download_logs", sa.Text(), nullable=True))
    op.add_column("vps_subscriptions", sa.Column("image_download_updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Downgrade: drop columns (enum value is not removed, as Postgres doesn't support it safely)
    op.drop_column("vps_subscriptions", "image_download_updated_at")
    op.drop_column("vps_subscriptions", "image_download_logs")
    op.drop_column("vps_subscriptions", "image_download_progress")
    op.drop_column("vps_subscriptions", "image_download_status")
    op.drop_column("vps_subscriptions", "os_docker_image")
    op.drop_column("vps_subscriptions", "os_distro_id")






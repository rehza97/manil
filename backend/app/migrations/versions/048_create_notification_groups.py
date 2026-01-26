"""Create notification_groups table for notification targeting.

Revision ID: 048_notification_groups
Revises: 046_customer_approval
Create Date: 2025-01-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = "048_notification_groups"
down_revision = "046_customer_approval"
branch_labels = None
depends_on = None


def upgrade():
    """Create notification_groups table."""
    op.create_table(
        "notification_groups",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_criteria", JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index("idx_notification_groups_name", "notification_groups", ["name"], unique=True)
    op.create_index("idx_notification_groups_target_type", "notification_groups", ["target_type"])
    op.create_index("idx_notification_groups_is_active", "notification_groups", ["is_active"])


def downgrade():
    """Drop notification_groups table."""
    op.drop_index("idx_notification_groups_is_active", table_name="notification_groups")
    op.drop_index("idx_notification_groups_target_type", table_name="notification_groups")
    op.drop_index("idx_notification_groups_name", table_name="notification_groups")
    op.drop_table("notification_groups")

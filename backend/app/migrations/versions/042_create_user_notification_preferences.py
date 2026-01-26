"""create_user_notification_preferences

Revision ID: 042_user_notification_prefs
Revises: 041_add_http_port
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


revision = "042_user_notification_prefs"
down_revision = "041_add_http_port"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_notification_preferences",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("preferences", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_notification_preferences_user_id", "user_notification_preferences", ["user_id"], unique=True)


def downgrade():
    op.drop_index("ix_user_notification_preferences_user_id", table_name="user_notification_preferences")
    op.drop_table("user_notification_preferences")

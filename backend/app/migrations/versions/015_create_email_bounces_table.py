"""Create email_bounces table for bounce tracking.

Revision ID: 015
Revises: 014
Create Date: 2025-11-12 10:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade():
    """Create email_bounces table."""
    op.create_table(
        "email_bounces",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("email_address", sa.String(255), nullable=False, index=True),
        sa.Column("bounce_type", sa.String(50), nullable=False, server_default="permanent"),
        sa.Column("bounce_reason", sa.Text(), nullable=False),
        sa.Column("bounce_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_invalid", sa.Boolean(), nullable=False, server_default="false", index=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sender_reputation_score", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index("idx_bounces_email_address", "email_bounces", ["email_address"])
    op.create_index("idx_bounces_is_invalid", "email_bounces", ["is_invalid"])
    op.create_index("idx_bounces_created_at", "email_bounces", ["created_at"])


def downgrade():
    """Drop email_bounces table."""
    op.drop_table("email_bounces")

"""Create ticket_watchers table for tracking users watching tickets.

Revision ID: 018
Revises: 017
Create Date: 2025-11-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create ticket_watchers table."""
    op.create_table(
        "ticket_watchers",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("ticket_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("notify_on_reply", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("notify_on_status_change", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("notify_on_assignment", sa.Boolean, nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ticket_watchers_ticket_id"), "ticket_watchers", ["ticket_id"])
    op.create_index(op.f("ix_ticket_watchers_user_id"), "ticket_watchers", ["user_id"])


def downgrade() -> None:
    """Drop ticket_watchers table."""
    op.drop_index(op.f("ix_ticket_watchers_user_id"), table_name="ticket_watchers")
    op.drop_index(op.f("ix_ticket_watchers_ticket_id"), table_name="ticket_watchers")
    op.drop_table("ticket_watchers")

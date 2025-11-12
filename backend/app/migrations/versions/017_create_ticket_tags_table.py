"""Create ticket_tags association table.

Revision ID: 017
Revises: 016
Create Date: 2025-11-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create ticket_tags table."""
    op.create_table(
        "ticket_tags",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("ticket_id", sa.String(36), nullable=False),
        sa.Column("tag_id", sa.String(36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ticket_tags_tag_id"), "ticket_tags", ["tag_id"])
    op.create_index(op.f("ix_ticket_tags_ticket_id"), "ticket_tags", ["ticket_id"])


def downgrade() -> None:
    """Drop ticket_tags table."""
    op.drop_index(op.f("ix_ticket_tags_ticket_id"), table_name="ticket_tags")
    op.drop_index(op.f("ix_ticket_tags_tag_id"), table_name="ticket_tags")
    op.drop_table("ticket_tags")

"""Create ticket_replies table.

Revision ID: 012
Revises: 011
Create Date: 2025-11-09 10:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade():
    """Create ticket_replies table."""
    op.create_table(
        "ticket_replies",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("ticket_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_solution", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["tickets.id"],
            name="fk_replies_tickets",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_replies_users"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_replies_created_by"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name="fk_replies_updated_by"),
        sa.ForeignKeyConstraint(["deleted_by"], ["users.id"], name="fk_replies_deleted_by"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index("idx_replies_ticket_id", "ticket_replies", ["ticket_id"])
    op.create_index("idx_replies_user_id", "ticket_replies", ["user_id"])
    op.create_index("idx_replies_created_at", "ticket_replies", ["created_at"])


def downgrade():
    """Drop ticket_replies table."""
    op.drop_table("ticket_replies")

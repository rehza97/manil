"""Create tickets table.

Revision ID: 011
Revises: 010
Create Date: 2025-11-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    """Create tickets table."""
    op.create_table(
        "tickets",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="open"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("customer_id", sa.String(36), nullable=False),
        sa.Column("assigned_to", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.String(36), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], name="fk_tickets_customers"),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"], name="fk_tickets_users"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_tickets_created_by"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], name="fk_tickets_updated_by"),
        sa.ForeignKeyConstraint(["deleted_by"], ["users.id"], name="fk_tickets_deleted_by"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index("idx_tickets_customer_id", "tickets", ["customer_id"])
    op.create_index("idx_tickets_assigned_to", "tickets", ["assigned_to"])
    op.create_index("idx_tickets_status", "tickets", ["status"])
    op.create_index("idx_tickets_priority", "tickets", ["priority"])
    op.create_index("idx_tickets_created_at", "tickets", ["created_at"])
    op.create_index("idx_tickets_customer_status", "tickets", ["customer_id", "status"])


def downgrade():
    """Drop tickets table."""
    op.drop_table("tickets")

"""Create SLA policy and breach tracking tables.

Revision ID: 019
Revises: 018
Create Date: 2025-11-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create SLA tables."""
    # Create SLA policies table
    op.create_table(
        "sla_policies",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("first_response_time", sa.Integer, nullable=False),
        sa.Column("resolution_time", sa.Integer, nullable=False),
        sa.Column("priority", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_sla_policies_name"), "sla_policies", ["name"], unique=True)
    op.create_index(op.f("ix_sla_policies_priority"), "sla_policies", ["priority"])
    op.create_index(op.f("ix_sla_policies_is_active"), "sla_policies", ["is_active"])

    # Create SLA breaches table
    op.create_table(
        "sla_breaches",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("ticket_id", sa.String(36), nullable=False),
        sa.Column("policy_id", sa.String(36), nullable=False),
        sa.Column("breach_type", sa.String(50), nullable=False),
        sa.Column("expected_by", sa.DateTime(timezone=True), nullable=False),
        sa.Column("breached_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_resolved", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["policy_id"], ["sla_policies.id"]),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sla_breaches_ticket_id"), "sla_breaches", ["ticket_id"])
    op.create_index(op.f("ix_sla_breaches_policy_id"), "sla_breaches", ["policy_id"])


def downgrade() -> None:
    """Drop SLA tables."""
    op.drop_index(op.f("ix_sla_breaches_policy_id"), table_name="sla_breaches")
    op.drop_index(op.f("ix_sla_breaches_ticket_id"), table_name="sla_breaches")
    op.drop_table("sla_breaches")
    op.drop_index(op.f("ix_sla_policies_is_active"), table_name="sla_policies")
    op.drop_index(op.f("ix_sla_policies_priority"), table_name="sla_policies")
    op.drop_index(op.f("ix_sla_policies_name"), table_name="sla_policies")
    op.drop_table("sla_policies")

"""Create support groups and automation rules tables.

Revision ID: 026
Revises: 025
Create Date: 2025-01-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create support groups and automation rules tables."""
    # Create support_groups table
    op.create_table(
        "support_groups",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
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
    op.create_index(op.f("ix_support_groups_name"), "support_groups", ["name"], unique=True)

    # Create support_group_members table
    op.create_table(
        "support_group_members",
        sa.Column("group_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["group_id"], ["support_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("group_id", "user_id"),
    )
    op.create_index(
        op.f("ix_support_group_members_user_id"), "support_group_members", ["user_id"]
    )

    # Create automation_rules table
    op.create_table(
        "automation_rules",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("trigger_type", sa.String(50), nullable=False),
        sa.Column("conditions", JSONB, nullable=False),
        sa.Column("actions", JSONB, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("priority", sa.Integer, nullable=False, server_default="0"),
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
    )
    op.create_index(
        op.f("ix_automation_rules_trigger_type"), "automation_rules", ["trigger_type"]
    )
    op.create_index(
        op.f("ix_automation_rules_is_active"), "automation_rules", ["is_active"]
    )


def downgrade() -> None:
    """Drop support groups and automation rules tables."""
    op.drop_index(op.f("ix_automation_rules_is_active"), table_name="automation_rules")
    op.drop_index(op.f("ix_automation_rules_trigger_type"), table_name="automation_rules")
    op.drop_table("automation_rules")
    op.drop_index(
        op.f("ix_support_group_members_user_id"), table_name="support_group_members"
    )
    op.drop_table("support_group_members")
    op.drop_index(op.f("ix_support_groups_name"), table_name="support_groups")
    op.drop_table("support_groups")












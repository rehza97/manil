"""Add reply_id to ticket_attachments

Revision ID: 053_add_reply_id
Revises: 052_user_role_id
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "053_add_reply_id"
down_revision = "052_user_role_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket_attachments",
        sa.Column(
            "reply_id",
            sa.String(36),
            sa.ForeignKey("ticket_replies.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_ticket_attachments_reply_id",
        "ticket_attachments",
        ["reply_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ticket_attachments_reply_id", table_name="ticket_attachments")
    op.drop_column("ticket_attachments", "reply_id")

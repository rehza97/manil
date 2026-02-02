"""Add file_type to ticket_attachments

Revision ID: 054_add_file_type
Revises: 053_add_reply_id
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "054_add_file_type"
down_revision = "053_add_reply_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket_attachments",
        sa.Column(
            "file_type",
            sa.String(50),
            nullable=False,
            server_default=sa.text("'document'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("ticket_attachments", "file_type")

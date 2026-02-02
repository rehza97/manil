"""Add is_infected, deleted_at, deleted_by to ticket_attachments

Revision ID: 055_add_attachment_columns
Revises: 054_add_file_type
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "055_add_attachment_columns"
down_revision = "054_add_file_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ticket_attachments",
        sa.Column(
            "is_infected",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "ticket_attachments",
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "ticket_attachments",
        sa.Column(
            "deleted_by",
            sa.String(36),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("ticket_attachments", "deleted_by")
    op.drop_column("ticket_attachments", "deleted_at")
    op.drop_column("ticket_attachments", "is_infected")

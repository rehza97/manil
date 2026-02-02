"""Add api_request_logs table for performance metrics

Revision ID: 060_add_api_request_logs
Revises: 059_add_report_history
Create Date: 2026-02-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision = "060_add_api_request_logs"
down_revision = "059_add_report_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if "api_request_logs" in insp.get_table_names():
        return
    op.create_table(
        "api_request_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("request_path", sa.Text(), nullable=False, index=True),
        sa.Column("request_method", sa.String(10), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "idx_api_request_logs_path_created",
        "api_request_logs",
        ["request_path", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_api_request_logs_path_created", "api_request_logs")
    op.drop_table("api_request_logs")

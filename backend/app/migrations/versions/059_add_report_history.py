"""Add report_history table

Revision ID: 059_add_report_history
Revises: 058_null_product_order_items
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


revision = "059_add_report_history"
down_revision = "058_null_product_order_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if "report_history" in insp.get_table_names():
        return
    op.create_table(
        "report_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("report_type", sa.String(100), nullable=False, index=True),
        sa.Column("report_name", sa.String(255), nullable=False),
        sa.Column("format", sa.String(20), nullable=False),
        sa.Column("parameters", JSON, nullable=True),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("generated_by", sa.String(36), nullable=True, index=True),
        sa.Column("generated_at", sa.DateTime(timezone=True),
                  nullable=False, server_default=sa.text("now()")),
        sa.Column("download_count", sa.Integer(),
                  nullable=False, server_default=sa.text("0")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(50), nullable=False,
                  server_default="completed"),
    )
    op.create_foreign_key(
        "fk_report_history_generated_by",
        "report_history", "users",
        ["generated_by"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("idx_report_history_generated_at",
                    "report_history", ["generated_at"])


def downgrade() -> None:
    op.drop_constraint("fk_report_history_generated_by",
                       "report_history", type_="foreignkey")
    op.drop_index("idx_report_history_generated_at", "report_history")
    op.drop_table("report_history")

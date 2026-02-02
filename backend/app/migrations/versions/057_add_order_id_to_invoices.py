"""Add order_id to invoices

Revision ID: 057_order_id_invoices
Revises: 056_sms_enabled_default
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "057_order_id_invoices"
down_revision = "056_sms_enabled_default"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("order_id", sa.String(length=36), nullable=True, index=True),
    )
    op.create_foreign_key(
        "fk_invoices_order_id_orders",
        "invoices",
        "orders",
        ["order_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_invoices_order_id",
        "invoices",
        ["order_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_invoices_order_id", "invoices", type_="unique")
    op.drop_constraint(
        "fk_invoices_order_id_orders",
        "invoices",
        type_="foreignkey",
    )
    op.drop_column("invoices", "order_id")

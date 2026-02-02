"""Allow null product_id on order_items

Revision ID: 058_null_product_order_items
Revises: 057_order_id_invoices
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "058_null_product_order_items"
down_revision = "057_order_id_invoices"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "order_items",
        "product_id",
        existing_type=sa.String(36),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "order_items",
        "product_id",
        existing_type=sa.String(36),
        nullable=False,
    )

"""add deleted_at to product_categories

Revision ID: 045_deleted_at_categories
Revises: 044_sms_messages
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa


revision = "045_deleted_at_categories"
down_revision = "044_sms_messages"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "product_categories",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("product_categories", "deleted_at")

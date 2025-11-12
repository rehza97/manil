"""Create product categories table.

Revision ID: 020
Revises: 019
Create Date: 2025-11-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create product_categories table."""
    op.create_table(
        "product_categories",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("parent_category_id", sa.String(36), nullable=True),
        sa.Column("icon_color", sa.String(7), nullable=False, server_default="#3B82F6"),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
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
        sa.ForeignKeyConstraint(
            ["parent_category_id"], ["product_categories.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_product_categories_name"), "product_categories", ["name"], unique=True)
    op.create_index(op.f("ix_product_categories_slug"), "product_categories", ["slug"], unique=True)
    op.create_index(op.f("ix_product_categories_parent_category_id"), "product_categories", ["parent_category_id"])
    op.create_index(op.f("ix_product_categories_is_active"), "product_categories", ["is_active"])


def downgrade() -> None:
    """Drop product_categories table."""
    op.drop_index(op.f("ix_product_categories_is_active"), table_name="product_categories")
    op.drop_index(op.f("ix_product_categories_parent_category_id"), table_name="product_categories")
    op.drop_index(op.f("ix_product_categories_slug"), table_name="product_categories")
    op.drop_index(op.f("ix_product_categories_name"), table_name="product_categories")
    op.drop_table("product_categories")

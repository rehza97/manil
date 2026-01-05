"""Update response_templates table schema

Rename name to title, subject to description, add is_default field, make category non-nullable

Revision ID: 035
Revises: 034
Create Date: 2026-01-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename name column to title
    op.alter_column("response_templates", "name", new_column_name="title")

    # Rename subject column to description and change type to Text
    op.alter_column("response_templates", "subject", new_column_name="description", type_=sa.Text(), existing_type=sa.String(255))

    # Add is_default column with default False
    op.add_column("response_templates", sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"))

    # Make category non-nullable - set default value for any NULL categories
    op.execute("""
        UPDATE response_templates
        SET category = 'General'
        WHERE category IS NULL;
    """)
    op.alter_column("response_templates", "category", nullable=False, existing_nullable=True)


def downgrade() -> None:
    # Revert category to nullable
    op.alter_column("response_templates", "category", nullable=True, existing_nullable=False)

    # Remove is_default column
    op.drop_column("response_templates", "is_default")

    # Rename description back to subject and change type back to String(255)
    op.alter_column("response_templates", "description", new_column_name="subject", type_=sa.String(255), existing_type=sa.Text())

    # Rename title back to name
    op.alter_column("response_templates", "title", new_column_name="name")


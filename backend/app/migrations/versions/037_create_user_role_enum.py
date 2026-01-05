"""Create user_role enum type

Revision ID: 037
Revises: 036
Create Date: 2026-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '037_create_user_role_enum'
down_revision = '036_enhance_container_metrics'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_role enum and convert role column to use it."""
    # Create the enum type
    op.execute("CREATE TYPE user_role AS ENUM ('admin', 'corporate', 'client')")

    # Drop the default value first
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")

    # Convert the role column from varchar to enum with explicit casting
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN role TYPE user_role
        USING role::user_role
    """)

    # Restore the default value with the correct enum type
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client'::user_role")


def downgrade() -> None:
    """Convert role column back to varchar and drop enum."""
    # Drop the default value first
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")

    # Convert role column back to varchar
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN role TYPE character varying(20)
        USING role::text
    """)

    # Restore the varchar default
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client'::character varying")

    # Drop the enum type
    op.execute("DROP TYPE user_role")

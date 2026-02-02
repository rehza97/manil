"""User role_id - migrate from enum to dynamic roles

Revision ID: 052_user_role_id
Revises: 051_order_validation
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "052_user_role_id"
down_revision = "051_order_validation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add role_id column (nullable initially)
    op.add_column(
        "users",
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="RESTRICT"),
            nullable=True,
        ),
    )

    # 2. Backfill: match users.role enum to roles.slug
    op.execute("""
        UPDATE users
        SET role_id = (SELECT id FROM roles WHERE slug = users.role::text LIMIT 1)
        WHERE role_id IS NULL
    """)

    # 3. Make role_id NOT NULL (users without matching role get first role - fallback)
    op.execute("""
        UPDATE users
        SET role_id = (SELECT id FROM roles WHERE slug = 'client' LIMIT 1)
        WHERE role_id IS NULL
    """)
    op.alter_column(
        "users",
        "role_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    # 4. Drop role column
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.drop_column("users", "role")

    # 5. Drop user_role enum type
    op.execute("DROP TYPE user_role")

    # 6. Create index on role_id for lookups
    op.create_index("ix_users_role_id", "users", ["role_id"], unique=False)


def downgrade() -> None:
    # 1. Recreate user_role enum
    op.execute("CREATE TYPE user_role AS ENUM ('admin', 'corporate', 'client')")

    # 2. Add role column back
    op.add_column(
        "users",
        sa.Column(
            "role",
            postgresql.ENUM("admin", "corporate", "client", name="user_role"),
            nullable=True,
        ),
    )

    # 3. Backfill role from role_id via roles.slug (fallback to client for custom roles)
    op.execute("""
        UPDATE users u
        SET role = CASE
            WHEN r.slug = 'admin' THEN 'admin'::user_role
            WHEN r.slug = 'corporate' THEN 'corporate'::user_role
            WHEN r.slug = 'client' THEN 'client'::user_role
            ELSE 'client'::user_role
        END
        FROM roles r
        WHERE u.role_id = r.id
    """)
    op.execute("UPDATE users SET role = 'client'::user_role WHERE role IS NULL")
    op.alter_column("users", "role", nullable=False)
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client'::user_role")

    # 4. Drop role_id
    op.drop_index("ix_users_role_id", table_name="users")
    op.drop_column("users", "role_id")

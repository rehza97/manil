"""Fix subscription status enum type mismatch (subscription_status vs subscriptionstatus)

Revision ID: 030
Revises: 029
Create Date: 2025-12-22

This migration adds an implicit cast between two PostgreSQL enum types that may
co-exist due to historical naming differences:

- subscription_status (current)
- subscriptionstatus (legacy)

When SQLAlchemy binds parameters as ::subscriptionstatus while the column type is
subscription_status, PostgreSQL raises:
  operator does not exist: subscription_status = subscriptionstatus

Creating an implicit cast resolves the mismatch without changing data.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create casts only when both enum types exist and the cast doesn't already exist.
    op.execute(
        """
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptionstatus') THEN

    -- subscriptionstatus -> subscription_status
    IF NOT EXISTS (
      SELECT 1
      FROM pg_cast c
      JOIN pg_type src ON src.oid = c.castsource
      JOIN pg_type dst ON dst.oid = c.casttarget
      WHERE src.typname = 'subscriptionstatus'
        AND dst.typname = 'subscription_status'
    ) THEN
      EXECUTE 'CREATE CAST (subscriptionstatus AS subscription_status) WITH INOUT AS IMPLICIT';
    END IF;

    -- subscription_status -> subscriptionstatus (optional but helps symmetry)
    IF NOT EXISTS (
      SELECT 1
      FROM pg_cast c
      JOIN pg_type src ON src.oid = c.castsource
      JOIN pg_type dst ON dst.oid = c.casttarget
      WHERE src.typname = 'subscription_status'
        AND dst.typname = 'subscriptionstatus'
    ) THEN
      EXECUTE 'CREATE CAST (subscription_status AS subscriptionstatus) WITH INOUT AS IMPLICIT';
    END IF;
  END IF;
END
$$;
"""
    )


def downgrade() -> None:
    # Best-effort removal (only if the casts exist)
    op.execute(
        """
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_cast c
    JOIN pg_type src ON src.oid = c.castsource
    JOIN pg_type dst ON dst.oid = c.casttarget
    WHERE src.typname = 'subscriptionstatus'
      AND dst.typname = 'subscription_status'
  ) THEN
    EXECUTE 'DROP CAST (subscriptionstatus AS subscription_status)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_cast c
    JOIN pg_type src ON src.oid = c.castsource
    JOIN pg_type dst ON dst.oid = c.casttarget
    WHERE src.typname = 'subscription_status'
      AND dst.typname = 'subscriptionstatus'
  ) THEN
    EXECUTE 'DROP CAST (subscription_status AS subscriptionstatus)';
  END IF;
END
$$;
"""
    )











"""Create email_accounts table for IMAP configuration storage.

Revision ID: 013
Revises: 012
Create Date: 2025-11-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade():
    """Create email_accounts table."""
    op.create_table(
        "email_accounts",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("email_address", sa.String(255), nullable=False, unique=True),
        sa.Column("imap_server", sa.String(255), nullable=False),
        sa.Column("imap_port", sa.Integer(), nullable=False, server_default="993"),
        sa.Column("imap_username", sa.String(255), nullable=False),
        sa.Column("imap_password_encrypted", sa.Text(), nullable=False),
        sa.Column("use_tls", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("polling_interval_minutes", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true", index=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email_address", name="uq_email_accounts_email"),
    )

    # Create indexes
    op.create_index("idx_email_accounts_email", "email_accounts", ["email_address"])
    op.create_index("idx_email_accounts_active", "email_accounts", ["is_active"])


def downgrade():
    """Drop email_accounts table."""
    op.drop_table("email_accounts")

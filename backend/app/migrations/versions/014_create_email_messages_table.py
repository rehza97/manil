"""Create email_messages and email_attachments tables.

Revision ID: 014
Revises: 013
Create Date: 2025-11-12 10:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    """Create email_messages and email_attachments tables."""
    # Create email_messages table
    op.create_table(
        "email_messages",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("email_account_id", sa.String(36), nullable=False, index=True),
        sa.Column("message_id", sa.String(255), nullable=False, index=True),
        sa.Column("from_address", sa.String(255), nullable=False, index=True),
        sa.Column("to_addresses", sa.Text(), nullable=False),
        sa.Column("cc_addresses", sa.Text(), nullable=True),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("raw_email", sa.Text(), nullable=False),
        sa.Column("in_reply_to", sa.String(255), nullable=True),
        sa.Column("references", sa.Text(), nullable=True),
        sa.Column("ticket_id", sa.String(36), nullable=True, index=True),
        sa.Column("thread_id", sa.String(36), nullable=True, index=True),
        sa.Column("spam_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_spam", sa.Boolean(), nullable=False, server_default="false", index=True),
        sa.Column("is_automated", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_attachments", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("attachment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["email_account_id"],
            ["email_accounts.id"],
            name="fk_messages_email_accounts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["tickets.id"],
            name="fk_messages_tickets",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create email_attachments table
    op.create_table(
        "email_attachments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("email_message_id", sa.String(36), nullable=False, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("is_inline", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["email_message_id"],
            ["email_messages.id"],
            name="fk_attachments_messages",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for email_messages
    op.create_index("idx_messages_message_id", "email_messages", ["message_id"])
    op.create_index("idx_messages_from_address", "email_messages", ["from_address"])
    op.create_index("idx_messages_ticket_id", "email_messages", ["ticket_id"])
    op.create_index("idx_messages_is_spam", "email_messages", ["is_spam"])
    op.create_index("idx_messages_created_at", "email_messages", ["created_at"])

    # Create indexes for email_attachments
    op.create_index("idx_attachments_message_id", "email_attachments", ["email_message_id"])


def downgrade():
    """Drop email tables."""
    op.drop_table("email_attachments")
    op.drop_table("email_messages")

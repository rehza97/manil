"""create_sms_messages_table

Revision ID: 044_sms_messages
Revises: 043_notifications
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "044_sms_messages"
down_revision = "043_notifications"
branch_labels = None
depends_on = None


def upgrade():
    # Note: status column uses String type instead of PostgreSQL ENUM.
    # SQLAlchemy's SQLEnum in the model (SMSMessage.status) will handle
    # conversion between Python enum (SMSStatus) and database string values.
    # This approach is simpler and avoids enum type management in migrations.
    op.create_table(
        "sms_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone_number", sa.String(20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_sms_messages_phone_number", "sms_messages", ["phone_number"])
    op.create_index("ix_sms_messages_status", "sms_messages", ["status"])
    op.create_index("ix_sms_messages_device_id", "sms_messages", ["device_id"])
    op.create_index("ix_sms_messages_created_at", "sms_messages", ["created_at"])
    # Composite index for efficient pending message queries
    op.create_index("ix_sms_messages_status_created", "sms_messages", ["status", "created_at"])


def downgrade():
    op.drop_index("ix_sms_messages_status_created", table_name="sms_messages")
    op.drop_index("ix_sms_messages_created_at", table_name="sms_messages")
    op.drop_index("ix_sms_messages_device_id", table_name="sms_messages")
    op.drop_index("ix_sms_messages_status", table_name="sms_messages")
    op.drop_index("ix_sms_messages_phone_number", table_name="sms_messages")
    op.drop_table("sms_messages")

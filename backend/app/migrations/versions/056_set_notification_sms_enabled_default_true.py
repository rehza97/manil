"""Set notification.sms_enabled default to True

Revision ID: 056_sms_enabled_default
Revises: 055_add_attachment_columns
Create Date: 2026-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision = "056_sms_enabled_default"
down_revision = "055_add_attachment_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure notification.sms_enabled is True by default (SMS activated)
    op.execute(
        sa.text("""
            UPDATE system_settings
            SET value = '{"value": true, "type": "boolean"}'::jsonb
            WHERE key = 'notification.sms_enabled'
        """)
    )


def downgrade() -> None:
    # No downgrade: leave value as-is
    pass

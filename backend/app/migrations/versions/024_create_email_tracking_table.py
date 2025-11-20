"""create email tracking table

Revision ID: 024
Revises: 023
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create email_tracking table
    op.create_table(
        'email_tracking',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('recipient_email', sa.String(255), nullable=False, index=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('email_type', sa.String(50), nullable=False, index=True),
        sa.Column('related_entity_type', sa.String(50), nullable=True),
        sa.Column('related_entity_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes
    op.create_index('idx_email_tracking_status_created', 'email_tracking', ['status', 'created_at'])
    op.create_index('idx_email_tracking_type_created', 'email_tracking', ['email_type', 'created_at'])


def downgrade() -> None:
    op.drop_table('email_tracking')

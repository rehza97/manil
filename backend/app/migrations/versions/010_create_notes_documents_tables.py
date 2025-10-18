"""Create customer notes and documents tables

Revision ID: 010
Revises: 009
Create Date: 2025-10-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create customer notes and documents tables."""

    # Create enums
    note_type_enum = sa.Enum(
        'general', 'call', 'meeting', 'email', 'issue', 'followup', 'internal',
        name='note_type_enum'
    )
    note_type_enum.create(op.get_bind())

    document_category_enum = sa.Enum(
        'contract', 'invoice', 'proposal', 'agreement', 'correspondence', 'report', 'other',
        name='document_category_enum'
    )
    document_category_enum.create(op.get_bind())

    # Create customer_notes table
    op.create_table(
        'customer_notes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('customer_id', sa.String(36), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('note_type', note_type_enum, nullable=False, server_default='general'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('is_pinned', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('updated_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
        sa.Column('deleted_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )

    # Create customer_documents table
    op.create_table(
        'customer_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('customer_id', sa.String(36), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', document_category_enum, nullable=False, server_default='other'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('updated_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
        sa.Column('deleted_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
    )

    # Create indexes for customer_notes
    op.create_index('ix_customer_notes_customer_id', 'customer_notes', ['customer_id'])
    op.create_index('ix_customer_notes_note_type', 'customer_notes', ['note_type'])
    op.create_index('ix_customer_notes_deleted_at', 'customer_notes', ['deleted_at'])
    op.create_index('idx_customer_notes_customer_deleted', 'customer_notes', ['customer_id', 'deleted_at'])
    op.create_index('idx_customer_notes_pinned_created', 'customer_notes', ['is_pinned', 'created_at'])

    # Create indexes for customer_documents
    op.create_index('ix_customer_documents_customer_id', 'customer_documents', ['customer_id'])
    op.create_index('ix_customer_documents_category', 'customer_documents', ['category'])
    op.create_index('ix_customer_documents_deleted_at', 'customer_documents', ['deleted_at'])
    op.create_index('idx_customer_documents_customer_deleted', 'customer_documents', ['customer_id', 'deleted_at'])


def downgrade() -> None:
    """Drop customer notes and documents tables."""

    # Drop indexes
    op.drop_index('idx_customer_documents_customer_deleted', table_name='customer_documents')
    op.drop_index('ix_customer_documents_deleted_at', table_name='customer_documents')
    op.drop_index('ix_customer_documents_category', table_name='customer_documents')
    op.drop_index('ix_customer_documents_customer_id', table_name='customer_documents')

    op.drop_index('idx_customer_notes_pinned_created', table_name='customer_notes')
    op.drop_index('idx_customer_notes_customer_deleted', table_name='customer_notes')
    op.drop_index('ix_customer_notes_deleted_at', table_name='customer_notes')
    op.drop_index('ix_customer_notes_note_type', table_name='customer_notes')
    op.drop_index('ix_customer_notes_customer_id', table_name='customer_notes')

    # Drop tables
    op.drop_table('customer_documents')
    op.drop_table('customer_notes')

    # Drop enums
    sa.Enum(name='document_category_enum').drop(op.get_bind())
    sa.Enum(name='note_type_enum').drop(op.get_bind())

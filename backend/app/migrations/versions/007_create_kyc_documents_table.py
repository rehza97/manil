"""Create KYC documents table.

Revision ID: 007
Revises: 006
Create Date: 2025-10-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create KYC documents table and related enums."""

    # Create enum types
    op.execute("""
        CREATE TYPE kyc_document_type_enum AS ENUM (
            'national_id',
            'passport',
            'driver_license',
            'business_registration',
            'tax_certificate',
            'proof_of_address',
            'other'
        )
    """)

    op.execute("""
        CREATE TYPE kyc_status_enum AS ENUM (
            'pending',
            'under_review',
            'approved',
            'rejected',
            'expired'
        )
    """)

    # Create kyc_documents table
    op.create_table(
        'kyc_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('customer_id', sa.String(36), nullable=False),
        sa.Column('document_type', sa.Enum(
            'national_id', 'passport', 'driver_license',
            'business_registration', 'tax_certificate',
            'proof_of_address', 'other',
            name='kyc_document_type_enum'
        ), nullable=False),
        sa.Column('document_number', sa.String(100), nullable=True),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('status', sa.Enum(
            'pending', 'under_review', 'approved', 'rejected', 'expired',
            name='kyc_status_enum'
        ), nullable=False, server_default='pending'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('verified_by', sa.String(36), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('updated_by', sa.String(36), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.String(36), nullable=True),
    )

    # Create foreign keys
    op.create_foreign_key(
        'fk_kyc_documents_customer',
        'kyc_documents', 'customers',
        ['customer_id'], ['id'],
        ondelete='CASCADE'
    )

    op.create_foreign_key(
        'fk_kyc_documents_verified_by',
        'kyc_documents', 'users',
        ['verified_by'], ['id'],
        ondelete='SET NULL'
    )

    op.create_foreign_key(
        'fk_kyc_documents_created_by',
        'kyc_documents', 'users',
        ['created_by'], ['id'],
        ondelete='RESTRICT'
    )

    op.create_foreign_key(
        'fk_kyc_documents_updated_by',
        'kyc_documents', 'users',
        ['updated_by'], ['id'],
        ondelete='SET NULL'
    )

    op.create_foreign_key(
        'fk_kyc_documents_deleted_by',
        'kyc_documents', 'users',
        ['deleted_by'], ['id'],
        ondelete='SET NULL'
    )

    # Create indexes
    op.create_index('idx_kyc_documents_customer_id', 'kyc_documents', ['customer_id'])
    op.create_index('idx_kyc_documents_document_type', 'kyc_documents', ['document_type'])
    op.create_index('idx_kyc_documents_status', 'kyc_documents', ['status'])
    op.create_index('idx_kyc_documents_expires_at', 'kyc_documents', ['expires_at'])
    op.create_index('idx_kyc_documents_deleted_at', 'kyc_documents', ['deleted_at'])

    # Composite index for common queries
    op.create_index(
        'idx_kyc_documents_customer_status',
        'kyc_documents',
        ['customer_id', 'status', 'deleted_at']
    )


def downgrade() -> None:
    """Drop KYC documents table and enums."""

    # Drop indexes
    op.drop_index('idx_kyc_documents_customer_status', 'kyc_documents')
    op.drop_index('idx_kyc_documents_deleted_at', 'kyc_documents')
    op.drop_index('idx_kyc_documents_expires_at', 'kyc_documents')
    op.drop_index('idx_kyc_documents_status', 'kyc_documents')
    op.drop_index('idx_kyc_documents_document_type', 'kyc_documents')
    op.drop_index('idx_kyc_documents_customer_id', 'kyc_documents')

    # Drop foreign keys
    op.drop_constraint('fk_kyc_documents_deleted_by', 'kyc_documents', type_='foreignkey')
    op.drop_constraint('fk_kyc_documents_updated_by', 'kyc_documents', type_='foreignkey')
    op.drop_constraint('fk_kyc_documents_created_by', 'kyc_documents', type_='foreignkey')
    op.drop_constraint('fk_kyc_documents_verified_by', 'kyc_documents', type_='foreignkey')
    op.drop_constraint('fk_kyc_documents_customer', 'kyc_documents', type_='foreignkey')

    # Drop table
    op.drop_table('kyc_documents')

    # Drop enum types
    op.execute('DROP TYPE kyc_status_enum')
    op.execute('DROP TYPE kyc_document_type_enum')

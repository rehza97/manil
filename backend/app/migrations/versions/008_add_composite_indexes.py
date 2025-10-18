"""Add composite indexes for performance optimization

Revision ID: 008
Revises: 007
Create Date: 2025-10-18

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add composite indexes for improved query performance."""

    # KYC Documents composite indexes
    op.create_index(
        'idx_kyc_customer_type_status',
        'kyc_documents',
        ['customer_id', 'document_type', 'status', 'deleted_at'],
        unique=False
    )

    op.create_index(
        'idx_kyc_customer_status',
        'kyc_documents',
        ['customer_id', 'status', 'deleted_at'],
        unique=False
    )

    op.create_index(
        'idx_kyc_expires_status',
        'kyc_documents',
        ['expires_at', 'status', 'deleted_at'],
        unique=False
    )

    # Customers composite indexes
    op.create_index(
        'idx_customers_status_deleted',
        'customers',
        ['status', 'deleted_at'],
        unique=False
    )

    op.create_index(
        'idx_customers_type_deleted',
        'customers',
        ['customer_type', 'deleted_at'],
        unique=False
    )

    op.create_index(
        'idx_customers_email_deleted',
        'customers',
        ['email', 'deleted_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove composite indexes."""

    # Drop KYC Documents indexes
    op.drop_index('idx_kyc_customer_type_status', table_name='kyc_documents')
    op.drop_index('idx_kyc_customer_status', table_name='kyc_documents')
    op.drop_index('idx_kyc_expires_status', table_name='kyc_documents')

    # Drop Customers indexes
    op.drop_index('idx_customers_status_deleted', table_name='customers')
    op.drop_index('idx_customers_type_deleted', table_name='customers')
    op.drop_index('idx_customers_email_deleted', table_name='customers')

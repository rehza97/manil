"""Add check constraints for data validation

Revision ID: 006
Revises: 005
Create Date: 2025-10-13

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add check constraints to ensure data validity at database level."""

    # Users table constraints
    op.create_check_constraint(
        'ck_users_email_format',
        'users',
        "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
    )
    op.create_check_constraint(
        'ck_users_password_hash_not_empty',
        'users',
        "LENGTH(password_hash) >= 8"
    )
    op.create_check_constraint(
        'ck_users_full_name_not_empty',
        'users',
        "LENGTH(TRIM(full_name)) >= 2"
    )

    # Customers table constraints
    op.create_check_constraint(
        'ck_customers_email_format',
        'customers',
        "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
    )
    op.create_check_constraint(
        'ck_customers_phone_format',
        'customers',
        "phone ~* '^[+]?[0-9\\s()-]{7,20}$'"
    )
    op.create_check_constraint(
        'ck_customers_name_not_empty',
        'customers',
        "LENGTH(TRIM(name)) >= 2"
    )
    op.create_check_constraint(
        'ck_customers_postal_code_length',
        'customers',
        "postal_code IS NULL OR LENGTH(postal_code) <= 20"
    )

    # Audit logs table constraints
    op.create_check_constraint(
        'ck_audit_logs_action_not_empty',
        'audit_logs',
        "LENGTH(TRIM(action)) > 0"
    )
    op.create_check_constraint(
        'ck_audit_logs_resource_type_not_empty',
        'audit_logs',
        "LENGTH(TRIM(resource_type)) > 0"
    )
    op.create_check_constraint(
        'ck_audit_logs_description_not_empty',
        'audit_logs',
        "LENGTH(TRIM(description)) > 0"
    )
    op.create_check_constraint(
        'ck_audit_logs_ip_address_format',
        'audit_logs',
        "ip_address IS NULL OR ip_address ~* '^([0-9]{1,3}\\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$'"
    )


def downgrade() -> None:
    """Remove check constraints."""

    # Drop audit logs constraints
    op.drop_constraint('ck_audit_logs_ip_address_format',
                       'audit_logs', type_='check')
    op.drop_constraint('ck_audit_logs_description_not_empty',
                       'audit_logs', type_='check')
    op.drop_constraint('ck_audit_logs_resource_type_not_empty',
                       'audit_logs', type_='check')
    op.drop_constraint('ck_audit_logs_action_not_empty',
                       'audit_logs', type_='check')

    # Drop customers constraints
    op.drop_constraint('ck_customers_postal_code_length',
                       'customers', type_='check')
    op.drop_constraint('ck_customers_name_not_empty',
                       'customers', type_='check')
    op.drop_constraint('ck_customers_phone_format', 'customers', type_='check')
    op.drop_constraint('ck_customers_email_format', 'customers', type_='check')

    # Drop users constraints
    op.drop_constraint('ck_users_full_name_not_empty', 'users', type_='check')
    op.drop_constraint('ck_users_password_hash_not_empty',
                       'users', type_='check')
    op.drop_constraint('ck_users_email_format', 'users', type_='check')

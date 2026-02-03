"""Add invoice_payments and vps_payment_applied for double-payment prevention

Revision ID: 061_payment_idempotency
Revises: 060_add_api_request_logs
Create Date: 2026-02-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision = "061_payment_idempotency"
down_revision = "060_add_api_request_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if "invoice_payments" not in tables:
        op.create_table(
            "invoice_payments",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id"), nullable=False, index=True),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("payment_method", sa.String(50), nullable=False),
            sa.Column("payment_date", sa.DateTime(timezone=True), nullable=False),
            sa.Column("recorded_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("idempotency_key", sa.String(64), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
        op.create_index(
            "uq_invoice_payments_idempotency_key",
            "invoice_payments",
            ["idempotency_key"],
            unique=True,
        )

    if "vps_payment_applied" not in tables:
        op.create_table(
            "vps_payment_applied",
            sa.Column("invoice_id", sa.String(36), primary_key=True),
            sa.Column("subscription_id", sa.String(36), sa.ForeignKey("vps_subscriptions.id"), nullable=False, index=True),
            sa.Column("applied_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        )


def downgrade() -> None:
    op.drop_table("vps_payment_applied")
    op.drop_index("uq_invoice_payments_idempotency_key", "invoice_payments")
    op.drop_table("invoice_payments")

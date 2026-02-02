"""
Create an invoice from a validated order (sync).

Used when order status becomes VALIDATED so the invoice appears in "Mes factures".
"""
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func

from app.modules.orders.models import Order, OrderStatus
from app.modules.invoices.models import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    InvoiceTimeline,
)


def _generate_invoice_number_sync(db: Session) -> str:
    """Generate unique invoice number INV-YYYYMMDD-XXXX."""
    today = datetime.now(timezone.utc)
    date_str = today.strftime("%Y%m%d")
    result = db.execute(
        select(func.max(Invoice.invoice_number)).where(
            Invoice.invoice_number.like(f"INV-{date_str}-%"),
            Invoice.deleted_at.is_(None),
        )
    )
    max_number = result.scalar_one_or_none()
    if max_number:
        seq = int(max_number.split("-")[-1]) + 1
    else:
        seq = 1
    return f"INV-{date_str}-{seq:04d}"


def create_invoice_from_order(
    db: Session,
    order_id: str,
    created_by_id: str,
) -> Optional[Invoice]:
    """
    Create an invoice from a validated order. Idempotent: if an invoice
    already exists for this order_id, returns None without creating a duplicate.
    """
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id, Order.deleted_at.is_(None))
        .first()
    )
    if not order or order.status != OrderStatus.VALIDATED:
        return None

    existing = (
        db.query(Invoice)
        .filter(Invoice.order_id == order_id, Invoice.deleted_at.is_(None))
        .first()
    )
    if existing:
        return None

    now = datetime.now(timezone.utc)
    due = now + timedelta(days=30)
    invoice_number = _generate_invoice_number_sync(db)

    invoice = Invoice(
        id=str(uuid.uuid4()),
        invoice_number=invoice_number,
        order_id=order_id,
        quote_id=order.quote_id,
        vps_subscription_id=None,
        customer_id=str(order.customer_id),
        title=f"Facture commande {order.order_number}",
        description=f"Facture générée à partir de la commande {order.order_number}",
        status=InvoiceStatus.ISSUED.value,
        subtotal_amount=Decimal(str(order.subtotal)),
        tax_rate=Decimal("19.00"),
        tax_amount=Decimal(str(order.tax_amount)),
        discount_amount=Decimal(str(order.discount_amount)),
        total_amount=Decimal(str(order.total_amount)),
        paid_amount=Decimal("0.00"),
        payment_method=None,
        issue_date=now,
        due_date=due,
        sent_at=None,
        paid_at=None,
        notes=None,
        payment_notes=None,
        created_by_id=created_by_id,
        deleted_at=None,
    )
    db.add(invoice)
    db.flush()

    for oi in order.items:
        line_total = Decimal(str(oi.total_price))
        item = InvoiceItem(
            id=str(uuid.uuid4()),
            invoice_id=invoice.id,
            description=f"Article {oi.product_id}",
            quantity=oi.quantity,
            unit_price=Decimal(str(oi.unit_price)),
            line_total=line_total,
            product_id=oi.product_id,
        )
        db.add(item)

    event = InvoiceTimeline(
        id=str(uuid.uuid4()),
        invoice_id=invoice.id,
        event_type="created",
        description=f"Facture créée à partir de la commande {order.order_number}",
        user_id=created_by_id,
    )
    db.add(event)
    db.commit()
    db.refresh(invoice)
    return invoice

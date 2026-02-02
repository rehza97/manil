"""
Production-like invoice seed data for reports.

Seeds 50 invoices (20 from orders, 15 from quotes, 10 from VPS, 5 standalone).
Idempotent: skips if 50+ invoices exist.
"""

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceTimeline, InvoiceStatus, PaymentMethod
from app.modules.orders.models import Order, OrderStatus
from app.modules.quotes.models import Quote
from app.modules.hosting.models import VPSSubscription
from app.core.seed_utils import date_months_ago, random_date_in_range, random_amount, calculate_tax, calculate_total


INVOICE_COUNT_TARGET = 50
STATUS_DIST = [
    (InvoiceStatus.DRAFT, 2), (InvoiceStatus.ISSUED, 3), (InvoiceStatus.SENT, 5),
    (InvoiceStatus.PAID, 25), (InvoiceStatus.PARTIALLY_PAID, 8),
    (InvoiceStatus.OVERDUE, 5), (InvoiceStatus.CANCELLED, 2),
]
PAYMENT_METHODS = [PaymentMethod.BANK_TRANSFER, PaymentMethod.CHECK, PaymentMethod.CASH, PaymentMethod.CREDIT_CARD]


async def _get_seed_user_id(db: AsyncSession) -> str:
    r = await db.execute(select(User.id).where(User.email == "admin@cloudmanager.dz").limit(1))
    uid = r.scalar_one_or_none()
    if uid:
        return str(uid)
    r = await db.execute(select(User.id).limit(1))
    return str(r.scalar_one())


async def seed_production_invoices(
    db: AsyncSession,
    order_ids: list[str],
    vps_subscription_ids: list[str],
) -> None:
    """
    Seed 50 production-like invoices. Idempotent.
    order_ids: delivered order IDs (20). vps_subscription_ids: (10). Fetches 15 quote IDs internally.
    """
    r = await db.execute(select(func.count(Invoice.id)).where(Invoice.deleted_at.is_(None)))
    if r.scalar() >= INVOICE_COUNT_TARGET:
        return

    customer_ids = await _get_production_customer_ids(db)
    if not customer_ids:
        customer_ids = await _get_any_customer_ids(db, 20)
    user_id = await _get_seed_user_id(db)
    if not customer_ids:
        return

    statuses: list[InvoiceStatus] = []
    for st, cnt in STATUS_DIST:
        statuses.extend([st] * cnt)
    random.shuffle(statuses)

    quote_ids = await _get_quote_ids(db, 15)
    start = date_months_ago(12)
    end = datetime.now(timezone.utc)
    sources: list[tuple[str | None, str | None, str | None, str]] = []
    for oid in (order_ids or [])[:20]:
        sources.append((oid, None, None, "order"))
    for qid in quote_ids[:15]:
        sources.append((None, qid, None, "quote"))
    for vid in (vps_subscription_ids or [])[:10]:
        sources.append((None, None, vid, "vps"))
    for _ in range(5):
        sources.append((None, None, None, "standalone"))

    for i in range(min(INVOICE_COUNT_TARGET, len(sources))):
        order_id, quote_id, vps_sub_id, _ = sources[i]
        invoice_number = f"INV-2025-{i + 1:04d}"
        if (await db.execute(select(Invoice.id).where(Invoice.invoice_number == invoice_number))).scalar_one_or_none():
            continue
        customer_id = customer_ids[i % len(customer_ids)]
        status = statuses[i]
        issue_date = random_date_in_range(start, end)
        due_date = issue_date + timedelta(days=30)
        subtotal = Decimal(str(round(random.uniform(5000, 200000), 2)))
        tax = calculate_tax(subtotal)
        discount = Decimal("0") if random.random() > 0.3 else random_amount(100, 3000)
        total = calculate_total(subtotal, tax, discount)
        paid_amount = Decimal("0")
        paid_at = None
        if status == InvoiceStatus.PAID:
            paid_amount = total
            paid_at = issue_date + timedelta(days=random.randint(1, 15))
        elif status == InvoiceStatus.PARTIALLY_PAID:
            paid_amount = (total * Decimal("0.5")).quantize(Decimal("0.01"))
            paid_at = issue_date + timedelta(days=5)
        inv = Invoice(
            invoice_number=invoice_number,
            customer_id=customer_id,
            order_id=order_id,
            quote_id=quote_id,
            vps_subscription_id=vps_sub_id,
            title=f"Invoice {invoice_number}",
            status=status,
            subtotal_amount=subtotal,
            tax_rate=Decimal("19.00"),
            tax_amount=tax,
            discount_amount=discount,
            total_amount=total,
            paid_amount=paid_amount,
            payment_method=random.choice(PAYMENT_METHODS) if paid_amount else None,
            issue_date=issue_date,
            due_date=due_date,
            paid_at=paid_at,
            created_by_id=user_id,
        )
        db.add(inv)
        await db.flush()
        db.add(InvoiceItem(invoice_id=inv.id, description="Services", quantity=1, unit_price=subtotal, line_total=subtotal))
        db.add(InvoiceTimeline(invoice_id=inv.id, event_type="created", description="Invoice created", user_id=user_id))
    await db.commit()


async def _get_production_customer_ids(db: AsyncSession) -> list[str]:
    r = await db.execute(select(Customer.id).where(Customer.email.like("%@production.seed%")).limit(20))
    return [str(row[0]) for row in r.fetchall()]


async def _get_any_customer_ids(db: AsyncSession, limit: int = 20) -> list[str]:
    """Fallback: return up to N customer IDs from any non-deleted customers."""
    r = await db.execute(select(Customer.id).where(Customer.deleted_at.is_(None)).limit(limit))
    return [str(row[0]) for row in r.fetchall()]


async def _get_quote_ids(db: AsyncSession, limit: int) -> list[str]:
    r = await db.execute(select(Quote.id).where(Quote.deleted_at.is_(None)).limit(limit))
    return [str(row[0]) for row in r.fetchall()]

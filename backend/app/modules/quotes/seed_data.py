"""
Production-like quote seed data for reports.

Seeds 40 quotes across 12 customers with items and timeline.
Idempotent: skips if 40+ quotes exist. Returns CONVERTED quote IDs for order seed.
"""

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.products.models import Product
from app.modules.quotes.models import Quote, QuoteItem, QuoteTimeline, QuoteStatus
from app.core.seed_utils import (
    date_months_ago,
    random_date_in_range,
    random_amount,
    calculate_tax,
    calculate_total,
)


QUOTE_COUNT_TARGET = 40
CONVERTED_COUNT = 10
STATUS_DISTRIBUTION = [
    (QuoteStatus.DRAFT, 5),
    (QuoteStatus.SENT, 8),
    (QuoteStatus.ACCEPTED, 6),
    (QuoteStatus.CONVERTED, 10),
    (QuoteStatus.DECLINED, 4),
    (QuoteStatus.EXPIRED, 5),
    (QuoteStatus.REJECTED, 2),
]


async def _get_seed_user_id(db: AsyncSession) -> str:
    q = select(User.id).where(User.email == "admin@cloudmanager.dz").limit(1)
    r = await db.execute(q)
    uid = r.scalar_one_or_none()
    if uid:
        return str(uid)
    r = await db.execute(select(User.id).limit(1))
    return str(r.scalar_one())


async def seed_production_quotes(db: AsyncSession) -> list[str]:
    """
    Seed 40 production-like quotes. Idempotent.
    Returns list of CONVERTED quote IDs for order seed.
    """
    r = await db.execute(select(func.count(Quote.id)).where(Quote.deleted_at.is_(None)))
    if r.scalar() >= QUOTE_COUNT_TARGET:
        q = select(Quote.id).where(Quote.status == QuoteStatus.CONVERTED, Quote.deleted_at.is_(None)).limit(CONVERTED_COUNT)
        r2 = await db.execute(q)
        return [str(row[0]) for row in r2.fetchall()]

    customer_ids = await _get_production_customer_ids(db)
    product_list = await _get_products(db)
    user_id = await _get_seed_user_id(db)
    if not product_list or len(customer_ids) < 12:
        return []

    statuses: list[QuoteStatus] = []
    for status, count in STATUS_DISTRIBUTION:
        statuses.extend([status] * count)
    random.shuffle(statuses)

    converted_ids: list[str] = []
    start = date_months_ago(12)
    end = datetime.now(timezone.utc)

    for i in range(QUOTE_COUNT_TARGET):
        quote_number = f"Q-2025-{i + 1:04d}"
        if (await db.execute(select(Quote.id).where(Quote.quote_number == quote_number))).scalar_one_or_none():
            continue
        customer_id = customer_ids[i % len(customer_ids)]
        status = statuses[i]
        created_at = random_date_in_range(start, end)
        valid_from = created_at
        valid_until = created_at + timedelta(days=random.randint(30, 60))
        num_items = random.randint(2, min(5, len(product_list)))
        chosen = random.sample(product_list, num_items)
        subtotal = Decimal("0")
        items_data = []
        for j, prod in enumerate(chosen):
            qty = random.randint(1, 3)
            up = Decimal(str(prod.regular_price))
            line = up * qty
            subtotal += line
            items_data.append((prod, qty, up, line))
        tax = calculate_tax(subtotal)
        discount = Decimal("0") if random.random() > 0.3 else random_amount(500, 5000)
        total = calculate_total(subtotal, tax, discount)
        quote = Quote(
            quote_number=quote_number,
            customer_id=customer_id,
            title=f"Quote {quote_number}",
            status=status,
            subtotal_amount=subtotal,
            tax_rate=Decimal("19.00"),
            tax_amount=tax,
            discount_amount=discount,
            total_amount=total,
            valid_from=valid_from,
            valid_until=valid_until,
            created_by_id=user_id,
            updated_by_id=user_id,
        )
        if status in (QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.CONVERTED, QuoteStatus.DECLINED):
            quote.sent_at = created_at + timedelta(hours=1)
        if status in (QuoteStatus.ACCEPTED, QuoteStatus.CONVERTED):
            quote.accepted_at = quote.sent_at and quote.sent_at + timedelta(days=2)
        db.add(quote)
        await db.flush()
        for sort_order, (prod, qty, up, line) in enumerate(items_data):
            db.add(QuoteItem(
                quote_id=quote.id,
                product_id=prod.id,
                item_name=prod.name,
                quantity=qty,
                unit_price=up,
                discount_percentage=Decimal("0"),
                line_total=line,
                sort_order=sort_order,
            ))
        db.add(QuoteTimeline(
            quote_id=quote.id,
            event_type="created",
            event_description="Quote created",
            new_value=status.value,
            created_by_id=user_id,
        ))
        if status == QuoteStatus.CONVERTED:
            converted_ids.append(quote.id)
    await db.commit()
    return converted_ids[:CONVERTED_COUNT]


async def _get_production_customer_ids(db: AsyncSession) -> list[str]:
    q = select(Customer.id).where(Customer.email.like("%@production.seed%")).limit(20)
    r = await db.execute(q)
    return [str(row[0]) for row in r.fetchall()]


async def _get_products(db: AsyncSession) -> list:
    r = await db.execute(select(Product).limit(20))
    return list(r.scalars().all())

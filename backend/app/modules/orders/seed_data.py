"""
Production-like order seed data for reports.

Seeds 50 orders (25 from quotes, 25 direct) with items and timeline.
Idempotent: skips if 50+ orders exist. Returns DELIVERED order IDs for invoice seed.
"""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.orders.models import Order, OrderItem, OrderTimeline, OrderStatus
from app.modules.products.models import Product
from app.modules.quotes.models import Quote, QuoteStatus
from app.core.seed_utils import date_months_ago, random_date_in_range, random_amount


ORDER_COUNT_TARGET = 50
DELIVERED_COUNT = 20
STATUS_DIST = [
    (OrderStatus.REQUEST, 5), (OrderStatus.PENDING_COMMERCIAL, 4),
    (OrderStatus.COMMERCIAL_APPROVED, 3), (OrderStatus.PENDING_TECHNICAL, 4),
    (OrderStatus.TECHNICAL_APPROVED, 3), (OrderStatus.VALIDATED, 5),
    (OrderStatus.IN_PROGRESS, 4), (OrderStatus.DELIVERED,
                                   20), (OrderStatus.CANCELLED, 2),
]


async def _get_seed_user_id(db: AsyncSession) -> str:
    r = await db.execute(select(User.id).where(User.email == "admin@cloudmanager.dz").limit(1))
    uid = r.scalar_one_or_none()
    if uid:
        return str(uid)
    r = await db.execute(select(User.id).limit(1))
    return str(r.scalar_one())


async def seed_production_orders(db: AsyncSession) -> list[str]:
    """
    Seed 50 production-like orders. Idempotent.
    Returns list of DELIVERED order IDs for invoice seed.
    """
    r = await db.execute(select(func.count(Order.id)).where(Order.deleted_at.is_(None)))
    if r.scalar() >= ORDER_COUNT_TARGET:
        q = select(Order.id).where(Order.status == OrderStatus.DELIVERED,
                                   Order.deleted_at.is_(None)).limit(DELIVERED_COUNT)
        r2 = await db.execute(q)
        return [str(row[0]) for row in r2.fetchall()]

    customer_ids = await _get_production_customer_ids(db)
    quote_ids = await _get_converted_quote_ids(db)
    products = await _get_products(db)
    user_id = await _get_seed_user_id(db)
    if not products or not customer_ids:
        return []

    statuses: list[OrderStatus] = []
    for st, cnt in STATUS_DIST:
        statuses.extend([st] * cnt)
    random.shuffle(statuses)

    delivered_ids: list[str] = []
    start, end = date_months_ago(12), datetime.now(timezone.utc)
    quote_id_pool = (quote_ids * 2)[:25] if quote_ids else []
    no_quote_count = 25 - len(quote_id_pool)

    for i in range(ORDER_COUNT_TARGET):
        order_number = f"ORD-2025-{i + 1:04d}"
        if (await db.execute(select(Order.id).where(Order.order_number == order_number))).scalar_one_or_none():
            continue
        customer_id = customer_ids[i % len(customer_ids)]
        quote_id = quote_id_pool[i] if i < len(quote_id_pool) else None
        status = statuses[i]
        created_at = random_date_in_range(start, end)
        subtotal = float(random_amount(3000, 200000))
        tax_amount = round(subtotal * get_settings().DEFAULT_TVA_RATE, 2)
        discount_amount = 0.0 if random.random() > 0.3 else float(random_amount(100, 5000))
        total_amount = round(subtotal + tax_amount - discount_amount, 2)
        order = Order(
            customer_id=customer_id,
            quote_id=quote_id,
            order_number=order_number,
            status=status,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            created_by=user_id,
            updated_by=user_id,
            validation_required=True,
        )
        order.created_at = created_at
        order.updated_at = created_at
        if status in (OrderStatus.COMMERCIAL_APPROVED, OrderStatus.TECHNICAL_APPROVED, OrderStatus.VALIDATED,
                      OrderStatus.IN_PROGRESS, OrderStatus.DELIVERED):
            order.commercial_validated_at = created_at + timedelta(hours=2)
            order.commercial_approved = True
            order.technical_validated_at = created_at + timedelta(hours=4)
            order.technical_approved = True
            order.validated_at = created_at + timedelta(hours=5)
        if status == OrderStatus.DELIVERED:
            order.in_progress_at = created_at + timedelta(days=1)
            order.delivered_at = created_at + timedelta(days=3)
            delivered_ids.append(order.id)
        if status == OrderStatus.CANCELLED:
            order.cancelled_at = created_at + timedelta(hours=1)
        db.add(order)
        await db.flush()
        num_items = random.randint(1, min(5, len(products)))
        for j, prod in enumerate(random.sample(products, num_items)):
            qty = random.randint(1, 3)
            up = float(prod.regular_price)
            total_price = round(up * qty, 2)
            db.add(OrderItem(order_id=order.id, product_id=prod.id, unit_price=up, quantity=qty,
                             discount_percentage=0.0, discount_amount=0.0, total_price=total_price))
        db.add(OrderTimeline(order_id=order.id, previous_status=None, new_status=OrderStatus.REQUEST,
                             action_type="order_created", description="Order created", performed_by=user_id))
    await db.commit()
    return delivered_ids[:DELIVERED_COUNT]


async def _get_production_customer_ids(db: AsyncSession) -> list[str]:
    r = await db.execute(select(Customer.id).where(Customer.email.like("%@production.seed%")).limit(20))
    return [str(row[0]) for row in r.fetchall()]


async def _get_converted_quote_ids(db: AsyncSession) -> list[str]:
    r = await db.execute(select(Quote.id).where(Quote.status == QuoteStatus.CONVERTED, Quote.deleted_at.is_(None)).limit(25))
    return [str(row[0]) for row in r.fetchall()]


async def _get_products(db: AsyncSession) -> list:
    r = await db.execute(select(Product).limit(20))
    return list(r.scalars().all())

"""
Production-like ticket seed data for reports.

Seeds 50 tickets with replies and history. Idempotent: skips if 50+ production tickets exist.
"""

import uuid
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.tickets.models import (
    Ticket,
    TicketReply,
    TicketHistory,
    TicketTag,
    Tag,
    TicketStatus,
    TicketPriority,
)
from app.modules.tickets.response_templates import TicketCategory
from app.core.seed_utils import date_months_ago, random_date_in_range


TICKET_COUNT_TARGET = 50
STATUS_DIST = [
    (TicketStatus.OPEN, 8), (TicketStatus.ANSWERED, 6), (TicketStatus.WAITING_FOR_RESPONSE, 5),
    (TicketStatus.ON_HOLD, 3), (TicketStatus.IN_PROGRESS, 5),
    (TicketStatus.RESOLVED, 15), (TicketStatus.CLOSED, 8),
]
PRIORITY_DIST = [
    (TicketPriority.LOW, 15), (TicketPriority.MEDIUM, 20),
    (TicketPriority.HIGH, 10), (TicketPriority.URGENT, 5),
]
TITLES = [
    "VPS slow performance", "DNS not resolving", "Invoice discrepancy",
    "Cannot access panel", "Request new feature", "Bug in backup",
    "Security concern", "Billing question", "Migration help",
    "SSL certificate", "Database timeout", "Email delivery",
]


async def _get_production_customer_ids(db: AsyncSession) -> list[str]:
    r = await db.execute(select(Customer.id).where(Customer.email.like("%@production.seed%")).limit(20))
    return [str(row[0]) for row in r.fetchall()]


async def _get_category_ids(db: AsyncSession) -> list[str]:
    r = await db.execute(select(TicketCategory.id))
    return [str(row[0]) for row in r.fetchall()]


async def _get_tag_ids(db: AsyncSession) -> list[str]:
    r = await db.execute(select(Tag.id).limit(7))
    return [str(row[0]) for row in r.fetchall()]


async def _get_agent_user_ids(db: AsyncSession, limit: int = 5) -> list[str]:
    r = await db.execute(select(User.id).limit(limit))
    return [str(row[0]) for row in r.fetchall()]


async def seed_production_tickets(db: AsyncSession) -> None:
    """Seed 50 production-like tickets with replies and history. Idempotent."""
    r = await db.execute(select(func.count(Ticket.id)).where(Ticket.deleted_at.is_(None)))
    if (r.scalar() or 0) >= TICKET_COUNT_TARGET:
        return

    customer_ids = await _get_production_customer_ids(db)
    category_ids = await _get_category_ids(db)
    tag_ids = await _get_tag_ids(db)
    agent_ids = await _get_agent_user_ids(db, 5)
    if not customer_ids or not category_ids or not agent_ids:
        return

    user_id = agent_ids[0]
    statuses: list[str] = []
    for st, cnt in STATUS_DIST:
        statuses.extend([st.value] * cnt)
    random.shuffle(statuses)
    priorities: list[str] = []
    for p, cnt in PRIORITY_DIST:
        priorities.extend([p.value] * cnt)
    random.shuffle(priorities)
    start = date_months_ago(12)
    end = datetime.now(timezone.utc)

    for i in range(TICKET_COUNT_TARGET):
        tid = str(uuid.uuid4())
        created_at = random_date_in_range(start, end)
        status = statuses[i]
        priority = priorities[i]
        t = Ticket(
            id=tid,
            title=random.choice(TITLES) + f" #{i+1}",
            description="Production seed ticket description for reporting.",
            status=status,
            priority=priority,
            customer_id=customer_ids[i % len(customer_ids)],
            assigned_to=agent_ids[i % len(agent_ids)] if i < 30 else None,
            category_id=category_ids[i % len(category_ids)],
            created_by=user_id,
            updated_by=user_id,
        )
        t.created_at = created_at
        t.updated_at = created_at
        if status in (TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value):
            t.resolved_at = created_at + timedelta(days=random.randint(1, 5))
            t.closed_at = t.resolved_at + timedelta(hours=1) if status == TicketStatus.CLOSED.value else None
        if i < 35:
            t.first_response_at = created_at + timedelta(hours=random.randint(1, 24))
        db.add(t)
        await db.flush()
        db.add(TicketHistory(
            id=str(uuid.uuid4()), ticket_id=tid, action="created",
            description="Ticket created", created_by=user_id,
        ))
        num_replies = random.randint(2, 5)
        for j in range(num_replies):
            reply_at = created_at + timedelta(hours=j + 1)
            rid = str(uuid.uuid4())
            db.add(TicketReply(
                id=rid, ticket_id=tid, user_id=agent_ids[j % len(agent_ids)],
                message=f"Reply {j+1} for production seed ticket.",
                is_internal=False, is_solution=(j == num_replies - 1 and status in (TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value)),
                created_by=user_id, updated_by=user_id,
            ))
        if tag_ids and i % 2 == 0:
            tag_id = tag_ids[i % len(tag_ids)]
            db.add(TicketTag(id=str(uuid.uuid4()), ticket_id=tid, tag_id=tag_id))
    await db.commit()

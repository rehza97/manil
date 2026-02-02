"""
Production-like VPS subscription and container metrics seed data.

Seeds 15 VPS subscriptions (10 ACTIVE with containers), container metrics.
Idempotent: skips if 15+ production subscriptions exist.
"""

import uuid
import random
from datetime import datetime, timedelta, date, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.hosting.models import (
    VPSPlan,
    VPSSubscription,
    ContainerInstance,
    ContainerMetrics,
    SubscriptionTimeline,
    SubscriptionStatus,
    BillingCycle,
    ContainerStatus,
    TimelineEventType,
    ActorType,
)
from app.core.seed_utils import date_months_ago, random_date_in_range


PRODUCTION_SUB_PREFIX = "VPS-PROD-"
SUBSCRIPTION_COUNT_TARGET = 15
ACTIVE_COUNT = 10
METRICS_PER_CONTAINER = 30


async def _get_client_user_ids(db: AsyncSession) -> list[str]:
    from app.modules.settings.models import Role
    r = await db.execute(
        select(User.id).join(Role, User.role_id == Role.id).where(Role.slug.in_(["client", "corporate"])).limit(10)
    )
    return [str(row[0]) for row in r.fetchall()]


async def _get_plans_by_slug(db: AsyncSession) -> dict:
    r = await db.execute(select(VPSPlan).where(VPSPlan.is_active == True))
    plans = {p.slug: p for p in r.scalars().all()}
    return plans


async def seed_production_vps(db: AsyncSession) -> tuple[list[str], list[tuple[str, str]]]:
    """
    Seed 15 production-like VPS subscriptions. Idempotent.
    Returns (all_subscription_ids, [(sub_id, container_id), ...] for active only).
    """
    count_q = select(func.count(VPSSubscription.id)).where(
        VPSSubscription.subscription_number.like(f"{PRODUCTION_SUB_PREFIX}%")
    )
    r = await db.execute(count_q)
    if (r.scalar() or 0) >= SUBSCRIPTION_COUNT_TARGET:
        subs_q = select(VPSSubscription.id).where(
            VPSSubscription.subscription_number.like(f"{PRODUCTION_SUB_PREFIX}%")
        ).limit(15)
        subs = await db.execute(subs_q)
        sub_ids = [str(row[0]) for row in subs.fetchall()]
        cont = await db.execute(
            select(ContainerInstance.subscription_id, ContainerInstance.id).where(ContainerInstance.subscription_id.in_(sub_ids)))
        pairs = [(str(row[0]), str(row[1])) for row in cont.fetchall()]
        return sub_ids, pairs

    user_ids = await _get_client_user_ids(db)
    plans = await _get_plans_by_slug(db)
    if not user_ids or not plans:
        return [], []

    statuses = (
        [SubscriptionStatus.ACTIVE] * ACTIVE_COUNT
        + [SubscriptionStatus.PROVISIONING] * 2
        + [SubscriptionStatus.SUSPENDED] * 1
        + [SubscriptionStatus.CANCELLED] * 2
    )
    plan_slugs = ["starter"] * 8 + ["professional"] * 5 + ["business"] * 2
    cycles = [BillingCycle.MONTHLY, BillingCycle.QUARTERLY, BillingCycle.ANNUALLY]
    subscription_ids: list[str] = []
    container_pairs: list[tuple[str, str]] = []
    start = date_months_ago(12)
    base_date = start.date() if hasattr(start, "date") else start

    for i in range(SUBSCRIPTION_COUNT_TARGET):
        sub_number = f"{PRODUCTION_SUB_PREFIX}{i + 1:05d}"
        if (await db.execute(select(VPSSubscription.id).where(VPSSubscription.subscription_number == sub_number))).scalar_one_or_none():
            continue
        plan_slug = plan_slugs[i]
        plan = plans.get(plan_slug)
        if not plan:
            continue
        customer_id = user_ids[i % len(user_ids)]
        status = statuses[i]
        start_d = base_date + timedelta(days=random.randint(0, 300)) if isinstance(base_date, date) else base_date
        sub = VPSSubscription(
            subscription_number=sub_number,
            customer_id=customer_id,
            plan_id=plan.id,
            status=status,
            billing_cycle=random.choice(cycles),
            start_date=start_d,
            next_billing_date=start_d + timedelta(days=30),
            last_billed_date=start_d,
            auto_renew=True,
            is_trial=False,
        )
        db.add(sub)
        await db.flush()
        subscription_ids.append(sub.id)
        db.add(SubscriptionTimeline(
            subscription_id=sub.id,
            event_type=TimelineEventType.CREATED,
            event_description="Subscription created",
            actor_type=ActorType.SYSTEM,
        ))
        if status == SubscriptionStatus.ACTIVE:
            cid = str(uuid.uuid4())
            cont = ContainerInstance(
                id=cid,
                subscription_id=sub.id,
                container_id=f"seed{cid[:8]}",
                container_name=f"prod-vps-{i + 1}",
                ip_address=f"10.0.0.{i + 1}",
                network_name="bridge",
                hostname=f"vps{i + 1}.prod",
                ssh_port=22000 + i,
                root_password="seed-placeholder",
                status=ContainerStatus.RUNNING,
                cpu_limit=float(plan.cpu_cores),
                memory_limit_gb=plan.ram_gb,
                storage_limit_gb=plan.storage_gb,
                data_volume_path=f"/data/vps-{i + 1}",
            )
            db.add(cont)
            await db.flush()
            container_pairs.append((sub.id, cont.id))
            db.add(SubscriptionTimeline(
                subscription_id=sub.id,
                event_type=TimelineEventType.PROVISIONED,
                event_description="Container provisioned",
                actor_type=ActorType.SYSTEM,
            ))
            db.add(SubscriptionTimeline(
                subscription_id=sub.id,
                event_type=TimelineEventType.STARTED,
                event_description="Container started",
                actor_type=ActorType.SYSTEM,
            ))
        if status == SubscriptionStatus.CANCELLED:
            sub.cancelled_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.add(SubscriptionTimeline(
                subscription_id=sub.id,
                event_type=TimelineEventType.CANCELLED,
                event_description="Subscription cancelled",
                actor_type=ActorType.CUSTOMER,
            ))
    await db.commit()
    return subscription_ids, container_pairs


async def seed_container_metrics(db: AsyncSession, container_pairs: list[tuple[str, str]]) -> None:
    """Seed 30 metric rows per active container. Call after seed_production_vps."""
    if not container_pairs:
        return
    sub_ids = [p[0] for p in container_pairs]
    r = await db.execute(
        select(func.count(ContainerMetrics.id)).where(ContainerMetrics.subscription_id.in_(sub_ids)))
    if r.scalar() >= len(container_pairs) * METRICS_PER_CONTAINER:
        return
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for sub_id, cont_id in container_pairs:
        for j in range(METRICS_PER_CONTAINER):
            t = now - timedelta(hours=j * 2)
            db.add(ContainerMetrics(
                subscription_id=sub_id,
                container_id=cont_id,
                cpu_usage_percent=round(random.uniform(10, 80), 2),
                memory_usage_mb=random.randint(256, 2048),
                memory_usage_percent=round(random.uniform(20, 90), 2),
                storage_usage_mb=random.randint(1024, 20480),
                storage_usage_percent=round(random.uniform(10, 70), 2),
                network_rx_bytes=random.randint(1000000, 500000000),
                network_tx_bytes=random.randint(500000, 200000000),
                block_read_bytes=random.randint(0, 100000000),
                block_write_bytes=random.randint(0, 50000000),
                recorded_at=t,
            ))
    await db.commit()

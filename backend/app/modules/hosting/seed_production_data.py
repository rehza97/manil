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

    NOTE: VPS production seeding is disabled. This function is a no-op.
    """
    print("⚠️  VPS production seeding is disabled. Skipping seed_production_vps.")
    return ([], [])


async def seed_container_metrics(db: AsyncSession, container_pairs: list[tuple[str, str]]) -> None:
    """
    Seed 30 metric rows per active container. Call after seed_production_vps.

    NOTE: Container metrics seeding is disabled. This function is a no-op.
    """
    print("⚠️  Container metrics seeding is disabled. Skipping seed_container_metrics.")
    return

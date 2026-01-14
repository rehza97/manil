"""
VPS Hosting repository layer.

Handles database operations for VPS hosting entities.
"""
from typing import List, Tuple, Optional
from datetime import datetime, timedelta

from sqlalchemy import select, func, and_, or_, desc, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.hosting.models import (
    VPSPlan,
    VPSSubscription,
    ContainerInstance,
    ContainerMetrics,
    SubscriptionTimeline,
    SubscriptionStatus,
    ContainerStatus,
    TimelineEventType,
    VPSServiceDomain,
    DomainType
)


class VPSPlanRepository:
    """Repository for VPS plan database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> Tuple[List[VPSPlan], int]:
        """Get all VPS plans with filters and pagination."""
        query = select(VPSPlan)

        # Apply filters
        if is_active is not None:
            query = query.where(VPSPlan.is_active == is_active)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        query = query.offset(skip).limit(limit).order_by(VPSPlan.display_order, VPSPlan.monthly_price)

        result = await self.db.execute(query)
        plans = result.scalars().all()

        return list(plans), total

    async def get_by_id(self, plan_id: str) -> Optional[VPSPlan]:
        """Get VPS plan by ID."""
        query = select(VPSPlan).where(VPSPlan.id == plan_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[VPSPlan]:
        """Get VPS plan by slug."""
        query = select(VPSPlan).where(VPSPlan.slug == slug)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, plan: VPSPlan) -> VPSPlan:
        """Create a new VPS plan."""
        self.db.add(plan)
        await self.db.flush()
        await self.db.refresh(plan)
        return plan

    async def update(self, plan: VPSPlan) -> VPSPlan:
        """Update VPS plan."""
        await self.db.flush()
        await self.db.refresh(plan)
        return plan

    async def delete(self, plan: VPSPlan) -> None:
        """Soft delete VPS plan (set is_active to False)."""
        plan.is_active = False
        await self.db.flush()


class VPSSubscriptionRepository:
    """Repository for VPS subscription database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[str] = None,
        plan_id: Optional[str] = None,
        status: Optional[SubscriptionStatus] = None,
        is_trial: Optional[bool] = None,
        auto_renew: Optional[bool] = None
    ) -> Tuple[List[VPSSubscription], int]:
        """Get all VPS subscriptions with filters and pagination."""
        query = select(VPSSubscription)

        # Apply filters
        if customer_id:
            query = query.where(VPSSubscription.customer_id == customer_id)
        if plan_id:
            query = query.where(VPSSubscription.plan_id == plan_id)
        if status:
            # Cast the column to text and compare as string to avoid enum type mismatch
            # This works around SQLAlchemy's type inference issue where it uses 
            # 'subscriptionstatus' instead of 'subscription_status'
            query = query.where(
                cast(VPSSubscription.status, String) == status.value
            )
        if is_trial is not None:
            query = query.where(VPSSubscription.is_trial == is_trial)
        if auto_renew is not None:
            query = query.where(VPSSubscription.auto_renew == auto_renew)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination and load relationships
        query = query.options(
            selectinload(VPSSubscription.plan),
            selectinload(VPSSubscription.customer),
            selectinload(VPSSubscription.container)
        ).offset(skip).limit(limit).order_by(desc(VPSSubscription.created_at))

        result = await self.db.execute(query)
        subscriptions = result.scalars().all()

        return list(subscriptions), total

    async def get_by_id(self, subscription_id: str, load_relations: bool = True) -> Optional[VPSSubscription]:
        """Get VPS subscription by ID."""
        query = select(VPSSubscription).where(VPSSubscription.id == subscription_id)

        if load_relations:
            query = query.options(
                selectinload(VPSSubscription.plan),
                selectinload(VPSSubscription.customer),
                selectinload(VPSSubscription.container),
                selectinload(VPSSubscription.timeline)
            )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_subscription_number(self, subscription_number: str) -> Optional[VPSSubscription]:
        """Get VPS subscription by subscription number."""
        query = select(VPSSubscription).where(
            VPSSubscription.subscription_number == subscription_number
        ).options(
            selectinload(VPSSubscription.plan),
            selectinload(VPSSubscription.container)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_pending_approvals(self, skip: int = 0, limit: int = 100) -> Tuple[List[VPSSubscription], int]:
        """Get all pending approval requests."""
        return await self.get_all(
            skip=skip,
            limit=limit,
            status=SubscriptionStatus.PENDING
        )

    async def get_active_subscriptions(self, skip: int = 0, limit: int = 100) -> Tuple[List[VPSSubscription], int]:
        """Get all active subscriptions."""
        return await self.get_all(
            skip=skip,
            limit=limit,
            status=SubscriptionStatus.ACTIVE
        )

    async def get_due_for_billing(self) -> List[VPSSubscription]:
        """Get subscriptions due for billing today."""
        from datetime import date
        today = date.today()

        query = select(VPSSubscription).where(
            and_(
                cast(VPSSubscription.status, String) == SubscriptionStatus.ACTIVE.value,
                VPSSubscription.next_billing_date <= today,
                VPSSubscription.auto_renew == True
            )
        ).options(
            selectinload(VPSSubscription.plan),
            selectinload(VPSSubscription.customer)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_overdue_subscriptions(self) -> List[VPSSubscription]:
        """Get subscriptions with overdue payments."""
        from datetime import date
        today = date.today()

        query = select(VPSSubscription).where(
            and_(
                cast(VPSSubscription.status, String).in_([
                    SubscriptionStatus.ACTIVE.value,
                    SubscriptionStatus.SUSPENDED.value
                ]),
                VPSSubscription.total_paid < VPSSubscription.total_invoiced,
                VPSSubscription.next_billing_date < today
            )
        ).options(
            selectinload(VPSSubscription.plan),
            selectinload(VPSSubscription.customer),
            selectinload(VPSSubscription.container)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, subscription: VPSSubscription) -> VPSSubscription:
        """Create a new VPS subscription."""
        self.db.add(subscription)
        await self.db.flush()
        await self.db.refresh(subscription)
        return subscription

    async def update(self, subscription: VPSSubscription) -> VPSSubscription:
        """Update VPS subscription."""
        await self.db.flush()
        await self.db.refresh(subscription)
        return subscription

    async def delete(self, subscription: VPSSubscription) -> None:
        """Delete VPS subscription."""
        await self.db.delete(subscription)
        await self.db.flush()

    async def generate_subscription_number(self) -> str:
        """Generate unique subscription number in format: VPS-YYYYMMDD-XXXXX."""
        from datetime import datetime

        today = datetime.now().strftime("%Y%m%d")
        prefix = f"VPS-{today}-"

        # Get count of subscriptions created today
        query = select(func.count()).where(
            VPSSubscription.subscription_number.like(f"{prefix}%")
        )
        result = await self.db.execute(query)
        count = result.scalar_one()

        # Generate next number
        next_number = count + 1
        return f"{prefix}{next_number:05d}"


class ContainerInstanceRepository:
    """Repository for container instance database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_by_id(self, container_id: str) -> Optional[ContainerInstance]:
        """Get container instance by ID."""
        query = select(ContainerInstance).where(ContainerInstance.id == container_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_subscription_id(self, subscription_id: str) -> Optional[ContainerInstance]:
        """Get container instance by subscription ID."""
        query = select(ContainerInstance).where(
            ContainerInstance.subscription_id == subscription_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_container_id(self, docker_container_id: str) -> Optional[ContainerInstance]:
        """Get container instance by Docker container ID."""
        query = select(ContainerInstance).where(
            ContainerInstance.container_id == docker_container_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_running_containers(self) -> List[ContainerInstance]:
        """Get all running container instances."""
        query = select(ContainerInstance).where(
            cast(ContainerInstance.status, String) == ContainerStatus.RUNNING.value
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_next_available_ssh_port(self) -> int:
        """
        Get next available SSH port starting from 2222.
        Uses database-level advisory lock to prevent race conditions.
        """
        from sqlalchemy import text

        # Acquire PostgreSQL advisory lock (lock ID: 999001)
        # Lock is automatically released at transaction end
        await self.db.execute(text("SELECT pg_advisory_xact_lock(999001)"))

        query = select(func.max(ContainerInstance.ssh_port))
        result = await self.db.execute(query)
        max_port = result.scalar_one_or_none()

        if max_port is None:
            return 2222
        return max_port + 1

    async def get_next_available_http_port(self) -> int:
        """
        Get next available HTTP port starting from 8100.
        Uses database-level advisory lock to prevent race conditions.
        """
        from sqlalchemy import text

        # Acquire PostgreSQL advisory lock (lock ID: 999003)
        # Lock is automatically released at transaction end
        await self.db.execute(text("SELECT pg_advisory_xact_lock(999003)"))

        query = select(func.max(ContainerInstance.http_port))
        result = await self.db.execute(query)
        max_port = result.scalar_one_or_none()

        if max_port is None:
            return 8100
        return max_port + 1

    async def get_next_available_ip(self) -> str:
        """
        Get next available IP address from 172.20.0.0/16 range.
        Uses database-level advisory lock to prevent race conditions during concurrent provisioning.

        Returns:
            IP address in format 172.20.X.Y

        Raises:
            ValueError: If no IPs available in the range
        """
        from sqlalchemy import text

        # Acquire PostgreSQL advisory lock (lock ID: 999002)
        # This ensures only ONE provisioning process allocates IPs at a time
        # Lock is automatically released when transaction commits/rolls back
        await self.db.execute(text("SELECT pg_advisory_xact_lock(999002)"))

        # Get all used IPs (now safe from race conditions due to lock)
        query = select(ContainerInstance.ip_address)
        result = await self.db.execute(query)
        used_ips = set(result.scalars().all())

        # Find next available IP
        for third_octet in range(1, 256):
            for fourth_octet in range(2, 255):
                ip = f"172.20.{third_octet}.{fourth_octet}"
                if ip not in used_ips:
                    return ip

        raise ValueError("No available IPs in 172.20.0.0/16 range")

    async def create(self, container: ContainerInstance) -> ContainerInstance:
        """Create a new container instance."""
        self.db.add(container)
        await self.db.flush()
        await self.db.refresh(container)
        return container

    async def update(self, container: ContainerInstance) -> ContainerInstance:
        """Update container instance."""
        await self.db.flush()
        await self.db.refresh(container)
        return container

    async def delete(self, container: ContainerInstance) -> None:
        """Delete container instance."""
        await self.db.delete(container)
        await self.db.flush()


class ContainerMetricsRepository:
    """Repository for container metrics database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_recent_metrics(
        self,
        subscription_id: str,
        hours: int = 24,
        limit: int = 288  # 288 = 24h * 12 samples/hour (5min intervals)
    ) -> List[ContainerMetrics]:
        """Get recent metrics for a subscription."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        query = select(ContainerMetrics).where(
            and_(
                ContainerMetrics.subscription_id == subscription_id,
                ContainerMetrics.recorded_at >= cutoff_time
            )
        ).order_by(desc(ContainerMetrics.recorded_at)).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_latest_metrics(self, subscription_id: str) -> Optional[ContainerMetrics]:
        """Get the latest metrics for a subscription."""
        query = select(ContainerMetrics).where(
            ContainerMetrics.subscription_id == subscription_id
        ).order_by(desc(ContainerMetrics.recorded_at)).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, metrics: ContainerMetrics) -> ContainerMetrics:
        """Create new metrics record."""
        self.db.add(metrics)
        await self.db.flush()
        await self.db.refresh(metrics)
        return metrics

    async def bulk_create(self, metrics_list: List[ContainerMetrics]) -> None:
        """Bulk create metrics records."""
        self.db.add_all(metrics_list)
        await self.db.flush()

    async def delete_old_metrics(self, days: int = 30) -> int:
        """Delete metrics older than specified days."""
        cutoff_time = datetime.utcnow() - timedelta(days=days)

        query = select(ContainerMetrics).where(
            ContainerMetrics.recorded_at < cutoff_time
        )
        result = await self.db.execute(query)
        old_metrics = result.scalars().all()

        count = len(old_metrics)
        for metric in old_metrics:
            await self.db.delete(metric)

        await self.db.flush()
        return count


class SubscriptionTimelineRepository:
    """Repository for subscription timeline database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_by_subscription_id(
        self,
        subscription_id: str,
        limit: int = 100
    ) -> List[SubscriptionTimeline]:
        """Get timeline events for a subscription."""
        query = select(SubscriptionTimeline).where(
            SubscriptionTimeline.subscription_id == subscription_id
        ).order_by(desc(SubscriptionTimeline.created_at)).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, timeline_event: SubscriptionTimeline) -> SubscriptionTimeline:
        """Create a new timeline event."""
        self.db.add(timeline_event)
        await self.db.flush()
        await self.db.refresh(timeline_event)
        return timeline_event

    async def create_event(
        self,
        subscription_id: str,
        event_type: TimelineEventType,
        event_description: str,
        actor_id: Optional[str] = None,
        actor_type: str = "SYSTEM",
        metadata: Optional[dict] = None
    ) -> SubscriptionTimeline:
        """Helper method to create timeline event."""
        from app.modules.hosting.models import ActorType

        event = SubscriptionTimeline(
            subscription_id=subscription_id,
            event_type=event_type,
            event_description=event_description,
            actor_id=actor_id,
            actor_type=ActorType(actor_type),
            event_metadata=metadata or {}
        )

        return await self.create(event)


class VPSServiceDomainRepository:
    """Repository for VPS Service Domain database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        subscription_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[VPSServiceDomain], int]:
        """Get all service domains with filters and pagination."""
        query = select(VPSServiceDomain)

        # Apply filters
        if subscription_id:
            query = query.where(VPSServiceDomain.subscription_id == subscription_id)
        if is_active is not None:
            query = query.where(VPSServiceDomain.is_active == is_active)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination and ordering
        query = query.offset(skip).limit(limit).order_by(desc(VPSServiceDomain.created_at))

        result = await self.db.execute(query)
        domains = result.scalars().all()

        return list(domains), total

    async def get_by_id(self, domain_id: str) -> Optional[VPSServiceDomain]:
        """Get service domain by ID."""
        query = select(VPSServiceDomain).where(VPSServiceDomain.id == domain_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_domain_name(self, domain_name: str) -> Optional[VPSServiceDomain]:
        """Get service domain by domain name."""
        query = select(VPSServiceDomain).where(VPSServiceDomain.domain_name == domain_name)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_subscription(
        self,
        subscription_id: str,
        is_active: Optional[bool] = None
    ) -> List[VPSServiceDomain]:
        """Get all service domains for a subscription."""
        query = select(VPSServiceDomain).where(
            VPSServiceDomain.subscription_id == subscription_id
        )

        if is_active is not None:
            query = query.where(VPSServiceDomain.is_active == is_active)

        query = query.order_by(VPSServiceDomain.service_name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_subscription_and_service(
        self,
        subscription_id: str,
        service_name: str
    ) -> Optional[VPSServiceDomain]:
        """Get service domain by subscription and service name."""
        query = select(VPSServiceDomain).where(
            and_(
                VPSServiceDomain.subscription_id == subscription_id,
                VPSServiceDomain.service_name == service_name
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def domain_exists(self, domain_name: str) -> bool:
        """Check if domain name already exists."""
        query = select(func.count()).where(VPSServiceDomain.domain_name == domain_name)
        result = await self.db.execute(query)
        count = result.scalar_one()
        return count > 0

    async def create(self, domain: VPSServiceDomain) -> VPSServiceDomain:
        """Create a new service domain."""
        self.db.add(domain)
        await self.db.flush()
        await self.db.refresh(domain)
        return domain

    async def update(self, domain: VPSServiceDomain) -> VPSServiceDomain:
        """Update service domain."""
        await self.db.flush()
        await self.db.refresh(domain)
        return domain

    async def delete(self, domain: VPSServiceDomain) -> None:
        """Delete service domain."""
        await self.db.delete(domain)
        await self.db.flush()

    async def get_active_domains_with_subscription(self) -> List[VPSServiceDomain]:
        """Get all active domains with their subscription info loaded."""
        query = (
            select(VPSServiceDomain)
            .where(VPSServiceDomain.is_active == True)
            .options(selectinload(VPSServiceDomain.subscription))
            .order_by(VPSServiceDomain.domain_name)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

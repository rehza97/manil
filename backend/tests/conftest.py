"""
Shared pytest fixtures for all tests.

Provides database sessions, test users, test data, and mocks for Docker and Celery.
"""
import os
import pytest
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.pool import StaticPool

from app.config.database import Base
from app.modules.auth.models import User
from app.modules.hosting.models import (
    VPSPlan,
    VPSSubscription,
    ContainerInstance,
    ContainerMetrics,
    SubscriptionTimeline,
    SubscriptionStatus,
    ContainerStatus,
    BillingCycle,
    TimelineEventType,
    ActorType,
)


# ============================================================================
# Test Database Setup
# ============================================================================

# Use in-memory SQLite for testing (faster than PostgreSQL)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a test database session with transaction rollback.
    
    Creates all tables, yields a session, then rolls back all changes.
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    
    # Drop all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ============================================================================
# Test Users
# ============================================================================

@pytest.fixture
async def test_client_user(db_session: AsyncSession) -> User:
    """Create a test client user."""
    user = User(
        id=str(uuid.uuid4()),
        email="client@test.com",
        full_name="Test Client",
        role="client",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_admin_user(db_session: AsyncSession) -> User:
    """Create a test admin user."""
    user = User(
        id=str(uuid.uuid4()),
        email="admin@test.com",
        full_name="Test Admin",
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_corporate_user(db_session: AsyncSession) -> User:
    """Create a test corporate user."""
    user = User(
        id=str(uuid.uuid4()),
        email="corporate@test.com",
        full_name="Test Corporate",
        role="corporate",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# ============================================================================
# Test VPS Plans
# ============================================================================

@pytest.fixture
async def test_starter_plan(db_session: AsyncSession) -> VPSPlan:
    """Create a test Starter VPS plan."""
    plan = VPSPlan(
        id=str(uuid.uuid4()),
        name="Starter VPS",
        slug="starter",
        description="Entry-level VPS hosting",
        cpu_cores=1.0,
        ram_gb=2,
        storage_gb=25,
        bandwidth_tb=1.0,
        monthly_price=Decimal("10.00"),
        setup_fee=Decimal("0.00"),
        features={"ssh": True, "ipv4": True, "backup": False},
        docker_image="ubuntu:22.04",
        is_active=True,
        display_order=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    return plan


@pytest.fixture
async def test_professional_plan(db_session: AsyncSession) -> VPSPlan:
    """Create a test Professional VPS plan."""
    plan = VPSPlan(
        id=str(uuid.uuid4()),
        name="Professional VPS",
        slug="professional",
        description="Mid-tier VPS hosting",
        cpu_cores=2.0,
        ram_gb=4,
        storage_gb=50,
        bandwidth_tb=2.0,
        monthly_price=Decimal("20.00"),
        setup_fee=Decimal("0.00"),
        features={"ssh": True, "ipv4": True, "backup": True, "snapshots": True},
        docker_image="ubuntu:22.04",
        is_active=True,
        display_order=1,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    return plan


@pytest.fixture
async def test_business_plan(db_session: AsyncSession) -> VPSPlan:
    """Create a test Business VPS plan."""
    plan = VPSPlan(
        id=str(uuid.uuid4()),
        name="Business VPS",
        slug="business",
        description="High-tier VPS hosting",
        cpu_cores=4.0,
        ram_gb=8,
        storage_gb=100,
        bandwidth_tb=3.0,
        monthly_price=Decimal("40.00"),
        setup_fee=Decimal("0.00"),
        features={
            "ssh": True,
            "ipv4": True,
            "backup": True,
            "snapshots": True,
            "priority_support": True,
        },
        docker_image="ubuntu:22.04",
        is_active=True,
        display_order=2,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    return plan


# ============================================================================
# Test Subscriptions
# ============================================================================

@pytest.fixture
async def test_pending_subscription(
    db_session: AsyncSession,
    test_client_user: User,
    test_starter_plan: VPSPlan,
) -> VPSSubscription:
    """Create a test subscription in PENDING status."""
    subscription = VPSSubscription(
        id=str(uuid.uuid4()),
        subscription_number=f"VPS-{datetime.utcnow().strftime('%Y%m%d')}-00001",
        customer_id=test_client_user.id,
        plan_id=test_starter_plan.id,
        status=SubscriptionStatus.PENDING,
        billing_cycle=BillingCycle.MONTHLY,
        auto_renew=True,
        grace_period_days=7,
        total_invoiced=Decimal("0.00"),
        total_paid=Decimal("0.00"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(subscription)
    await db_session.commit()
    await db_session.refresh(subscription)
    return subscription


@pytest.fixture
async def test_active_subscription(
    db_session: AsyncSession,
    test_client_user: User,
    test_starter_plan: VPSPlan,
) -> VPSSubscription:
    """Create a test subscription in ACTIVE status."""
    subscription = VPSSubscription(
        id=str(uuid.uuid4()),
        subscription_number=f"VPS-{datetime.utcnow().strftime('%Y%m%d')}-00002",
        customer_id=test_client_user.id,
        plan_id=test_starter_plan.id,
        status=SubscriptionStatus.ACTIVE,
        billing_cycle=BillingCycle.MONTHLY,
        start_date=date.today(),
        next_billing_date=date.today() + timedelta(days=30),
        auto_renew=True,
        grace_period_days=7,
        total_invoiced=Decimal("10.00"),
        total_paid=Decimal("10.00"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(subscription)
    await db_session.commit()
    await db_session.refresh(subscription)
    return subscription


@pytest.fixture
async def test_suspended_subscription(
    db_session: AsyncSession,
    test_client_user: User,
    test_starter_plan: VPSPlan,
) -> VPSSubscription:
    """Create a test subscription in SUSPENDED status."""
    subscription = VPSSubscription(
        id=str(uuid.uuid4()),
        subscription_number=f"VPS-{datetime.utcnow().strftime('%Y%m%d')}-00003",
        customer_id=test_client_user.id,
        plan_id=test_starter_plan.id,
        status=SubscriptionStatus.SUSPENDED,
        status_reason="Payment overdue",
        billing_cycle=BillingCycle.MONTHLY,
        start_date=date.today() - timedelta(days=60),
        next_billing_date=date.today() + timedelta(days=10),
        auto_renew=True,
        grace_period_days=7,
        total_invoiced=Decimal("30.00"),
        total_paid=Decimal("20.00"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(subscription)
    await db_session.commit()
    await db_session.refresh(subscription)
    return subscription


# ============================================================================
# Test Container Instances
# ============================================================================

@pytest.fixture
async def test_running_container(
    db_session: AsyncSession,
    test_active_subscription: VPSSubscription,
) -> ContainerInstance:
    """Create a test container in RUNNING status."""
    container = ContainerInstance(
        id=str(uuid.uuid4()),
        subscription_id=test_active_subscription.id,
        container_id="test-container-id-123",
        container_name=f"vps-{test_active_subscription.customer_id}-starter",
        ip_address="172.20.1.2",
        network_name=f"vps-net-{test_active_subscription.customer_id}",
        hostname="vps-starter-test.example.com",
        ssh_port=2222,
        root_password="encrypted-password-here",
        status=ContainerStatus.RUNNING,
        cpu_limit=1.0,
        memory_limit_gb=2,
        storage_limit_gb=25,
        data_volume_path="/var/lib/vps-volumes/test-container",
        first_started_at=datetime.utcnow() - timedelta(days=1),
        last_started_at=datetime.utcnow() - timedelta(hours=1),
        uptime_seconds=86400,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(container)
    await db_session.commit()
    await db_session.refresh(container)
    return container


@pytest.fixture
async def test_stopped_container(
    db_session: AsyncSession,
    test_active_subscription: VPSSubscription,
) -> ContainerInstance:
    """Create a test container in STOPPED status."""
    container = ContainerInstance(
        id=str(uuid.uuid4()),
        subscription_id=test_active_subscription.id,
        container_id="test-container-id-456",
        container_name=f"vps-{test_active_subscription.customer_id}-stopped",
        ip_address="172.20.1.3",
        network_name=f"vps-net-{test_active_subscription.customer_id}",
        hostname="vps-starter-stopped.example.com",
        ssh_port=2223,
        root_password="encrypted-password-here",
        status=ContainerStatus.STOPPED,
        cpu_limit=1.0,
        memory_limit_gb=2,
        storage_limit_gb=25,
        data_volume_path="/var/lib/vps-volumes/test-container-stopped",
        first_started_at=datetime.utcnow() - timedelta(days=2),
        last_started_at=datetime.utcnow() - timedelta(days=1),
        last_stopped_at=datetime.utcnow() - timedelta(hours=12),
        uptime_seconds=43200,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(container)
    await db_session.commit()
    await db_session.refresh(container)
    return container


# ============================================================================
# Docker Client Mock
# ============================================================================

@pytest.fixture
def mock_docker_client():
    """Create a mock Docker client for testing."""
    client = MagicMock()
    
    # Mock container operations
    container = MagicMock()
    container.id = "test-container-id-123"
    container.name = "test-container"
    container.status = "running"
    container.attrs = {
        "State": {"Status": "running"},
        "NetworkSettings": {
            "Networks": {
                "vps-net-test": {
                    "IPAddress": "172.20.1.2"
                }
            }
        }
    }
    
    # Mock container methods
    container.start = MagicMock(return_value=None)
    container.stop = MagicMock(return_value=None)
    container.restart = MagicMock(return_value=None)
    container.wait = MagicMock(return_value={"StatusCode": 0})
    container.stats = MagicMock(return_value={
        "cpu_stats": {
            "cpu_usage": {"total_usage": 1000000000},
            "system_cpu_usage": 2000000000,
            "online_cpus": 1
        },
        "precpu_stats": {
            "cpu_usage": {"total_usage": 500000000},
            "system_cpu_usage": 1000000000
        },
        "memory_stats": {
            "usage": 1073741824,  # 1GB
            "limit": 2147483648   # 2GB
        },
        "networks": {
            "eth0": {
                "rx_bytes": 1000000,
                "tx_bytes": 500000
            }
        },
        "blkio_stats": {
            "io_service_bytes_recursive": [
                {"op": "Read", "value": 2000000},
                {"op": "Write", "value": 1000000}
            ]
        },
        "pids_stats": {"current": 10}
    })
    container.logs = MagicMock(return_value=b"Container logs here...")
    container.exec_run = MagicMock(return_value=(0, b"df output"))
    
    # Mock client methods
    client.containers.get = MagicMock(return_value=container)
    client.containers.create = MagicMock(return_value=container)
    client.containers.list = MagicMock(return_value=[container])
    client.networks.create = MagicMock(return_value=MagicMock())
    client.networks.get = MagicMock(return_value=MagicMock())
    client.images.pull = MagicMock(return_value=None)
    
    return client


# ============================================================================
# Celery Task Mocking
# ============================================================================

@pytest.fixture
def mock_celery_task():
    """Mock Celery task execution."""
    with patch("app.modules.hosting.tasks.provision_vps_async.delay") as mock_delay:
        mock_delay.return_value = MagicMock(id="test-task-id")
        yield mock_delay


@pytest.fixture
def mock_celery_apply_async():
    """Mock Celery apply_async for background tasks."""
    with patch("celery.Task.apply_async") as mock_apply:
        mock_apply.return_value = MagicMock(id="test-task-id")
        yield mock_apply


# ============================================================================
# Email Service Mock
# ============================================================================

@pytest.fixture
def mock_email_service():
    """Mock email service for testing."""
    with patch("app.infrastructure.email.service.EmailService.send_email") as mock_send:
        mock_send.return_value = AsyncMock(return_value=True)
        yield mock_send










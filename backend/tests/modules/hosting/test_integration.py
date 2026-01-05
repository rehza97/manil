"""
Integration tests for VPS Hosting Module.

Tests complete workflows end-to-end:
- VPS request → approval → provisioning
- Container control operations
- Upgrade with pro-rated billing
- Suspend/reactivate cycle
- Terminate with data deletion
- Recurring invoice generation
- Overdue payment suspension
- Metrics collection
"""
import pytest
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hosting.models import (
    VPSSubscription,
    ContainerInstance,
    SubscriptionStatus,
    ContainerStatus,
    TimelineEventType,
    ActorType,
    SubscriptionTimeline,
    ContainerMetrics,
)
from app.modules.hosting.services.provisioning_service import VPSProvisioningService
from app.modules.hosting.services.billing_service import SubscriptionBillingService
from app.modules.hosting.services.monitoring_service import ContainerMonitoringService
from app.modules.hosting.repository import (
    VPSSubscriptionRepository,
    ContainerInstanceRepository,
    ContainerMetricsRepository,
    SubscriptionTimelineRepository,
)
from app.modules.invoices.models import Invoice, InvoiceStatus
from app.modules.quotes.models import Quote, QuoteStatus


# ============================================================================
# Full VPS Request → Approval → Provisioning Flow
# ============================================================================

@pytest.mark.asyncio
async def test_full_vps_request_approval_provisioning_flow(
    db_session: AsyncSession,
    test_client_user,
    test_starter_plan,
    mock_docker_client,
    mock_email_service,
):
    """Test complete flow: request → approve → provision → active."""
    provisioning_service = VPSProvisioningService(db_session)
    
    # Step 1: Request VPS
    quote = await provisioning_service.request_vps(
        customer_id=test_client_user.id,
        plan_id=test_starter_plan.id
    )
    
    assert quote is not None
    assert quote.status == QuoteStatus.PENDING
    
    # Find created subscription
    subscription_repo = VPSSubscriptionRepository(db_session)
    subscriptions, _ = await subscription_repo.get_all(
        skip=0,
        limit=10,
        customer_id=test_client_user.id,
        status=SubscriptionStatus.PENDING
    )
    subscription = subscriptions[0] if subscriptions else None
    
    assert subscription is not None
    assert subscription.status == SubscriptionStatus.PENDING
    assert subscription.plan_id == test_starter_plan.id
    
    # Step 2: Approve request
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.create_container = AsyncMock(return_value=MagicMock(
            id=str(uuid.uuid4()),
            container_id="test-container-123",
            container_name="vps-test-container",
            ip_address="172.20.1.2",
            ssh_port=2222,
            status=ContainerStatus.RUNNING,
        ))
        
        approved_subscription = await provisioning_service.approve_vps_request(
            subscription_id=subscription.id,
            approved_by_id=test_client_user.id
        )
        
        assert approved_subscription.status == SubscriptionStatus.PROVISIONING
    
    # Step 3: Provision VPS (simulate Celery task)
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_container = MagicMock()
        mock_container.id = "test-container-123"
        mock_container.container_id = "docker-container-id-123"
        mock_container.container_name = "vps-test-container"
        mock_container.ip_address = "172.20.1.2"
        mock_container.ssh_port = 2222
        mock_container.status = ContainerStatus.RUNNING
        mock_container.cpu_limit = 1.0
        mock_container.memory_limit_gb = 2
        mock_container.storage_limit_gb = 25
        mock_container.data_volume_path = "/var/lib/vps-volumes/test"
        mock_container.first_started_at = datetime.utcnow()
        mock_container.last_started_at = datetime.utcnow()
        
        mock_docker.return_value.create_container = AsyncMock(return_value=mock_container)
        
        # Mock billing service
        with patch("app.modules.hosting.services.provisioning_service.SubscriptionBillingService") as mock_billing:
            mock_billing.return_value.generate_initial_invoice = AsyncMock(return_value=MagicMock(
                id=str(uuid.uuid4()),
                invoice_number="INV-001",
                status=InvoiceStatus.ISSUED,
            ))
            
            container = await provisioning_service.provision_vps(subscription.id)
            
            assert container is not None
            assert container.status == ContainerStatus.RUNNING
    
    # Verify subscription is now ACTIVE
    await db_session.refresh(subscription)
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.start_date is not None
    assert subscription.next_billing_date is not None
    
    # Verify timeline events created
    timeline_repo = SubscriptionTimelineRepository(db_session)
    events = await timeline_repo.get_by_subscription(subscription.id)
    event_types = [e.event_type for e in events]
    assert TimelineEventType.CREATED in event_types
    assert TimelineEventType.APPROVED in event_types
    assert TimelineEventType.PROVISIONED in event_types


# ============================================================================
# Container Control Tests
# ============================================================================

@pytest.mark.asyncio
async def test_container_start_stop_reboot(
    db_session: AsyncSession,
    test_active_subscription,
    test_running_container,
    mock_docker_client,
):
    """Test container control operations: start, stop, reboot."""
    provisioning_service = VPSProvisioningService(db_session)
    
    # Test stop container
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.stop_container = AsyncMock(return_value=True)
        
        updated_container = await provisioning_service.stop_container(
            subscription_id=test_active_subscription.id
        )
        
        assert updated_container.status == ContainerStatus.STOPPED
    
    # Test start container
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.start_container = AsyncMock(return_value=True)
        
        updated_container = await provisioning_service.start_container(
            subscription_id=test_active_subscription.id
        )
        
        assert updated_container.status == ContainerStatus.RUNNING
    
    # Test reboot container
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.reboot_container = AsyncMock(return_value=True)
        
        updated_container = await provisioning_service.reboot_container(
            subscription_id=test_active_subscription.id
        )
        
        assert updated_container.status == ContainerStatus.RUNNING


# ============================================================================
# Upgrade with Pro-Rated Billing
# ============================================================================

@pytest.mark.asyncio
async def test_upgrade_with_prorated_billing(
    db_session: AsyncSession,
    test_active_subscription,
    test_starter_plan,
    test_professional_plan,
    test_running_container,
    mock_docker_client,
):
    """Test subscription upgrade with pro-rated billing calculation."""
    provisioning_service = VPSProvisioningService(db_session)
    billing_service = SubscriptionBillingService(db_session)
    
    # Set next_billing_date to 15 days from now (mid-cycle upgrade)
    test_active_subscription.next_billing_date = date.today() + timedelta(days=15)
    await db_session.commit()
    
    # Calculate pro-rated amount
    prorated_amount = await billing_service.calculate_prorated_amount(
        subscription=test_active_subscription,
        new_plan=test_professional_plan
    )
    
    assert prorated_amount > 0  # Should be positive for upgrade
    
    # Perform upgrade
    with patch("app.modules.hosting.services.provisioning_service.SubscriptionBillingService") as mock_billing:
        mock_billing.return_value.generate_prorated_invoice = AsyncMock(return_value=MagicMock(
            id=str(uuid.uuid4()),
            invoice_number="INV-PRORATED-001",
        ))
        
        updated_subscription = await provisioning_service.upgrade_subscription(
            subscription_id=test_active_subscription.id,
            new_plan_id=test_professional_plan.id
        )
        
        assert updated_subscription.plan_id == test_professional_plan.id
        
        # Verify container limits updated
        await db_session.refresh(test_running_container)
        assert test_running_container.cpu_limit == test_professional_plan.cpu_cores
        assert test_running_container.memory_limit_gb == test_professional_plan.ram_gb
    
    # Verify timeline event
    timeline_repo = SubscriptionTimelineRepository(db_session)
    events = await timeline_repo.get_by_subscription(test_active_subscription.id)
    upgrade_events = [e for e in events if e.event_type == TimelineEventType.UPGRADED]
    assert len(upgrade_events) > 0


# ============================================================================
# Suspend/Reactivate Cycle
# ============================================================================

@pytest.mark.asyncio
async def test_suspend_reactivate_cycle(
    db_session: AsyncSession,
    test_active_subscription,
    test_running_container,
    mock_docker_client,
    mock_email_service,
):
    """Test suspend and reactivate subscription cycle."""
    provisioning_service = VPSProvisioningService(db_session)
    
    # Suspend subscription
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.stop_container = AsyncMock(return_value=True)
        
        suspended_subscription = await provisioning_service.suspend_subscription(
            subscription_id=test_active_subscription.id,
            reason="Payment overdue"
        )
        
        assert suspended_subscription.status == SubscriptionStatus.SUSPENDED
        assert suspended_subscription.status_reason == "Payment overdue"
        assert suspended_subscription.container.status == ContainerStatus.STOPPED
    
    # Reactivate subscription
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.start_container = AsyncMock(return_value=True)
        
        reactivated_subscription = await provisioning_service.reactivate_subscription(
            subscription_id=test_active_subscription.id
        )
        
        assert reactivated_subscription.status == SubscriptionStatus.ACTIVE
        assert reactivated_subscription.status_reason is None
        assert reactivated_subscription.container.status == ContainerStatus.RUNNING


# ============================================================================
# Terminate with Data Deletion
# ============================================================================

@pytest.mark.asyncio
async def test_terminate_with_data_deletion(
    db_session: AsyncSession,
    test_active_subscription,
    test_running_container,
    mock_docker_client,
    mock_email_service,
):
    """Test subscription termination with container and data deletion."""
    provisioning_service = VPSProvisioningService(db_session)
    
    with patch("app.modules.hosting.services.provisioning_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.delete_container = AsyncMock(return_value=True)
        
        terminated_subscription = await provisioning_service.terminate_subscription(
            subscription_id=test_active_subscription.id
        )
        
        assert terminated_subscription.status == SubscriptionStatus.TERMINATED
    
    # Verify subscription is TERMINATED
    await db_session.refresh(test_active_subscription)
    assert test_active_subscription.status == SubscriptionStatus.TERMINATED
    assert test_active_subscription.terminated_at is not None
    
    # Verify container is TERMINATED
    await db_session.refresh(test_running_container)
    assert test_running_container.status == ContainerStatus.TERMINATED


# ============================================================================
# Recurring Invoice Generation
# ============================================================================

@pytest.mark.asyncio
async def test_recurring_invoice_generation(
    db_session: AsyncSession,
    test_active_subscription,
    mock_email_service,
):
    """Test recurring invoice generation for active subscriptions."""
    billing_service = SubscriptionBillingService(db_session)
    
    # Set next_billing_date to today
    test_active_subscription.next_billing_date = date.today()
    await db_session.commit()
    
    # Generate recurring invoice
    invoice = await billing_service.generate_recurring_invoice(
        subscription_id=test_active_subscription.id
    )
    
    assert invoice is not None
    assert invoice.vps_subscription_id == test_active_subscription.id
    assert invoice.status == InvoiceStatus.ISSUED
    
    # Verify next_billing_date updated
    await db_session.refresh(test_active_subscription)
    assert test_active_subscription.next_billing_date > date.today()
    assert test_active_subscription.last_billed_date == date.today()
    
    # Verify timeline event
    timeline_repo = SubscriptionTimelineRepository(db_session)
    events = await timeline_repo.get_by_subscription(test_active_subscription.id)
    invoice_events = [e for e in events if e.event_type == TimelineEventType.INVOICE_GENERATED]
    assert len(invoice_events) > 0


# ============================================================================
# Overdue Payment Suspension
# ============================================================================

@pytest.mark.asyncio
async def test_overdue_payment_suspension(
    db_session: AsyncSession,
    test_active_subscription,
    test_running_container,
    mock_docker_client,
    mock_email_service,
):
    """Test overdue payment detection and subscription suspension."""
    billing_service = SubscriptionBillingService(db_session)
    provisioning_service = VPSProvisioningService(db_session)
    
    # Create overdue invoice
    from app.modules.invoices.models import Invoice, InvoiceItem, InvoiceStatus
    overdue_invoice = Invoice(
        id=str(uuid.uuid4()),
        invoice_number="INV-OVERDUE-001",
        customer_id=test_active_subscription.customer_id,
        vps_subscription_id=test_active_subscription.id,
        status=InvoiceStatus.OVERDUE,
        issue_date=date.today() - timedelta(days=10),
        due_date=date.today() - timedelta(days=3),  # 3 days overdue
        subtotal_amount=Decimal("10.00"),
        total_amount=Decimal("10.00"),
        paid_amount=Decimal("0.00"),
        created_at=datetime.utcnow(),
    )
    db_session.add(overdue_invoice)
    await db_session.commit()
    
    # Check overdue invoices (should suspend)
    with patch("app.modules.hosting.services.billing_service.VPSProvisioningService") as mock_provisioning:
        mock_provisioning.return_value.suspend_subscription = AsyncMock(return_value=test_active_subscription)
        
        suspended_subs = await billing_service.check_overdue_invoices()
        
        assert len(suspended_subs) > 0


# ============================================================================
# Metrics Collection
# ============================================================================

@pytest.mark.asyncio
async def test_metrics_collection(
    db_session: AsyncSession,
    test_active_subscription,
    test_running_container,
    mock_docker_client,
):
    """Test metrics collection for running containers."""
    monitoring_service = ContainerMonitoringService(db_session)
    
    with patch("app.modules.hosting.services.monitoring_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.get_container_stats = AsyncMock(return_value={
            "cpu_usage_percent": 45.5,
            "memory_usage_mb": 1024,
            "memory_usage_percent": 50.0,
            "storage_usage_mb": 5120,
            "storage_usage_percent": 20.0,
            "network_rx_bytes": 1000000,
            "network_tx_bytes": 500000,
            "block_read_bytes": 2000000,
            "block_write_bytes": 1000000,
            "process_count": 10,
        })
        mock_docker.return_value.exec_command = AsyncMock(return_value={
            "exit_code": 0,
            "output": "5120000 25000000"  # used total (in KB)
        })
        
        metrics = await monitoring_service.collect_metrics(
            container_id=test_running_container.id
        )
        
        assert metrics is not None
        assert metrics.subscription_id == test_active_subscription.id
        assert metrics.container_id == test_running_container.id
        assert metrics.cpu_usage_percent == 45.5
        assert metrics.memory_usage_percent == 50.0
        assert metrics.storage_usage_percent == 20.0


@pytest.mark.asyncio
async def test_collect_all_metrics_multiple_containers(
    db_session: AsyncSession,
    test_active_subscription,
    test_running_container,
    mock_docker_client,
):
    """Test metrics collection for multiple containers."""
    monitoring_service = ContainerMonitoringService(db_session)
    
    # Create additional containers
    container_repo = ContainerInstanceRepository(db_session)
    for i in range(3):
        container = ContainerInstance(
            id=str(uuid.uuid4()),
            subscription_id=test_active_subscription.id,
            container_id=f"test-container-{i}",
            container_name=f"vps-test-{i}",
            ip_address=f"172.20.1.{i+10}",
            network_name="vps-net-test",
            hostname=f"vps-test-{i}.example.com",
            ssh_port=2222 + i,
            root_password="encrypted",
            status=ContainerStatus.RUNNING,
            cpu_limit=1.0,
            memory_limit_gb=2,
            storage_limit_gb=25,
            data_volume_path=f"/var/lib/vps-volumes/test-{i}",
            created_at=datetime.utcnow(),
        )
        db_session.add(container)
    await db_session.commit()
    
    with patch("app.modules.hosting.services.monitoring_service.DockerManagementService") as mock_docker:
        mock_docker.return_value = mock_docker_client
        mock_docker.return_value.get_container_stats = AsyncMock(return_value={
            "cpu_usage_percent": 30.0,
            "memory_usage_mb": 512,
            "memory_usage_percent": 25.0,
            "storage_usage_mb": 2560,
            "storage_usage_percent": 10.0,
            "network_rx_bytes": 500000,
            "network_tx_bytes": 250000,
            "block_read_bytes": 1000000,
            "block_write_bytes": 500000,
            "process_count": 5,
        })
        mock_docker.return_value.exec_command = AsyncMock(return_value={
            "exit_code": 0,
            "output": "2560000 25000000"
        })
        
        count = await monitoring_service.collect_all_metrics()
        
        assert count >= 1  # At least one container should have metrics collected


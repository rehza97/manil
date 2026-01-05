"""
Unit tests for SubscriptionBillingService.

Tests all billing service methods including invoice generation,
pro-rated calculations, payment processing, and overdue checks.
"""
import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.modules.hosting.services.billing_service import SubscriptionBillingService
from app.modules.hosting.models import (
    VPSSubscription,
    VPSPlan,
    SubscriptionStatus,
    BillingCycle,
    TimelineEventType
)
from app.modules.invoices.models import Invoice, InvoiceStatus
from app.core.exceptions import NotFoundException, BadRequestException


@pytest.fixture
def mock_db():
    """Mock database session."""
    return AsyncMock()


@pytest.fixture
def mock_subscription_repo():
    """Mock subscription repository."""
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_timeline_repo():
    """Mock timeline repository."""
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_invoice_service():
    """Mock invoice service."""
    service = AsyncMock()
    return service


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    service = AsyncMock()
    service.send_email = AsyncMock(return_value=True)
    return service


@pytest.fixture
def sample_plan():
    """Sample VPS plan for testing."""
    plan = MagicMock(spec=VPSPlan)
    plan.id = str(uuid4())
    plan.name = "Starter VPS"
    plan.monthly_price = Decimal("10.00")
    plan.setup_fee = Decimal("0.00")
    return plan


@pytest.fixture
def sample_subscription(sample_plan):
    """Sample VPS subscription for testing."""
    subscription = MagicMock(spec=VPSSubscription)
    subscription.id = str(uuid4())
    subscription.subscription_number = "VPS-20251221-00001"
    subscription.customer_id = str(uuid4())
    subscription.plan_id = sample_plan.id
    subscription.plan = sample_plan
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.billing_cycle = BillingCycle.MONTHLY
    subscription.grace_period_days = 7
    subscription.total_invoiced = Decimal("0.00")
    subscription.total_paid = Decimal("0.00")
    subscription.start_date = date.today()
    subscription.next_billing_date = date.today() + timedelta(days=30)
    subscription.last_billed_date = None
    subscription.quote_id = None
    subscription.customer = MagicMock()
    subscription.customer.email = "customer@example.com"
    return subscription


@pytest.fixture
def sample_invoice(sample_subscription):
    """Sample invoice for testing."""
    invoice = MagicMock(spec=Invoice)
    invoice.id = str(uuid4())
    invoice.invoice_number = "INV-20251221-00001"
    invoice.customer_id = sample_subscription.customer_id
    invoice.vps_subscription_id = sample_subscription.id
    invoice.total_amount = Decimal("10.00")
    invoice.paid_amount = Decimal("0.00")
    invoice.status = InvoiceStatus.ISSUED
    invoice.payment_method = None
    invoice.due_date = datetime.utcnow() + timedelta(days=7)
    return invoice


@pytest.mark.asyncio
async def test_generate_initial_invoice(
    mock_db, mock_subscription_repo, mock_timeline_repo, 
    mock_invoice_service, mock_email_service, sample_subscription, sample_plan
):
    """Test initial invoice generation with setup fee and first month."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.timeline_repo = mock_timeline_repo
    service.invoice_service = mock_invoice_service
    service.email_service = mock_email_service

    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_subscription_repo.update = AsyncMock(return_value=sample_subscription)

    created_invoice = MagicMock(spec=Invoice)
    created_invoice.id = str(uuid4())
    created_invoice.invoice_number = "INV-001"
    created_invoice.total_amount = Decimal("10.00")
    created_invoice.due_date = datetime.utcnow() + timedelta(days=7)
    mock_invoice_service.create = AsyncMock(return_value=created_invoice)

    # Execute
    invoice = await service.generate_initial_invoice(sample_subscription.id)

    # Assert
    assert invoice is not None
    assert invoice.invoice_number == "INV-001"
    mock_invoice_service.create.assert_called_once()
    call_args = mock_invoice_service.create.call_args
    invoice_data = call_args[0][0]
    assert invoice_data.vps_subscription_id == sample_subscription.id
    assert len(invoice_data.items) == 2  # Setup fee + first month
    assert invoice_data.items[0].description == f"VPS Setup Fee - {sample_plan.name}"
    assert invoice_data.items[1].description == f"VPS Monthly Subscription - {sample_plan.name}"
    mock_subscription_repo.update.assert_called_once()
    mock_email_service.send_email.assert_called_once()


@pytest.mark.asyncio
async def test_generate_recurring_invoice(
    mock_db, mock_subscription_repo, mock_timeline_repo,
    mock_invoice_service, mock_email_service, sample_subscription, sample_plan
):
    """Test recurring invoice generation."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.timeline_repo = mock_timeline_repo
    service.invoice_service = mock_invoice_service
    service.email_service = mock_email_service

    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_subscription_repo.update = AsyncMock(return_value=sample_subscription)
    mock_timeline_repo.create_event = AsyncMock()

    created_invoice = MagicMock(spec=Invoice)
    created_invoice.id = str(uuid4())
    created_invoice.invoice_number = "INV-002"
    created_invoice.total_amount = Decimal("10.00")
    created_invoice.due_date = datetime.utcnow() + timedelta(days=7)
    mock_invoice_service.create = AsyncMock(return_value=created_invoice)

    # Execute
    invoice = await service.generate_recurring_invoice(sample_subscription.id)

    # Assert
    assert invoice is not None
    mock_invoice_service.create.assert_called_once()
    call_args = mock_invoice_service.create.call_args
    invoice_data = call_args[0][0]
    assert invoice_data.vps_subscription_id == sample_subscription.id
    assert len(invoice_data.items) == 1  # Only monthly subscription
    assert invoice_data.items[0].description == f"VPS Monthly Subscription - {sample_plan.name}"
    mock_timeline_repo.create_event.assert_called_once()
    assert mock_timeline_repo.create_event.call_args[1]['event_type'] == TimelineEventType.INVOICE_GENERATED
    mock_email_service.send_email.assert_called_once()


@pytest.mark.asyncio
async def test_generate_recurring_invoice_invalid_status(
    mock_db, mock_subscription_repo, sample_subscription
):
    """Test recurring invoice generation fails for non-active subscription."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo

    sample_subscription.status = SubscriptionStatus.SUSPENDED
    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)

    # Execute & Assert
    with pytest.raises(BadRequestException):
        await service.generate_recurring_invoice(sample_subscription.id)


@pytest.mark.asyncio
async def test_calculate_prorated_amount_halfway_through_month(
    mock_db, sample_subscription, sample_plan
):
    """Test pro-rated calculation for upgrade halfway through month."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    
    # Set subscription to 15 days remaining
    sample_subscription.next_billing_date = date.today() + timedelta(days=15)
    
    new_plan = MagicMock(spec=VPSPlan)
    new_plan.monthly_price = Decimal("20.00")  # Double the price

    # Execute
    prorated = await service.calculate_prorated_amount(sample_subscription, new_plan)

    # Assert
    # Old daily rate: 10/30 = 0.333, New daily rate: 20/30 = 0.667
    # Difference: 0.333 per day * 15 days = 5.00
    expected = Decimal("5.00")
    assert prorated == expected


@pytest.mark.asyncio
async def test_calculate_prorated_amount_five_days_before_renewal(
    mock_db, sample_subscription, sample_plan
):
    """Test pro-rated calculation 5 days before renewal."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    
    sample_subscription.next_billing_date = date.today() + timedelta(days=5)
    
    new_plan = MagicMock(spec=VPSPlan)
    new_plan.monthly_price = Decimal("20.00")

    # Execute
    prorated = await service.calculate_prorated_amount(sample_subscription, new_plan)

    # Assert
    # Difference: 0.333 per day * 5 days = 1.67
    expected = Decimal("1.67")
    assert prorated == expected


@pytest.mark.asyncio
async def test_calculate_prorated_amount_last_day(
    mock_db, sample_subscription, sample_plan
):
    """Test pro-rated calculation on last day of cycle."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    
    sample_subscription.next_billing_date = date.today() + timedelta(days=1)
    
    new_plan = MagicMock(spec=VPSPlan)
    new_plan.monthly_price = Decimal("20.00")

    # Execute
    prorated = await service.calculate_prorated_amount(sample_subscription, new_plan)

    # Assert
    # Difference: 0.333 per day * 1 day = 0.33
    expected = Decimal("0.33")
    assert prorated == expected


@pytest.mark.asyncio
async def test_calculate_prorated_amount_same_day_upgrade(
    mock_db, sample_subscription, sample_plan
):
    """Test pro-rated calculation for same-day upgrade (edge case)."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    
    sample_subscription.next_billing_date = date.today()
    
    new_plan = MagicMock(spec=VPSPlan)
    new_plan.monthly_price = Decimal("20.00")

    # Execute
    prorated = await service.calculate_prorated_amount(sample_subscription, new_plan)

    # Assert
    # 0 days remaining = 0.00
    assert prorated == Decimal("0.00")


@pytest.mark.asyncio
async def test_process_payment_webhook(
    mock_db, mock_subscription_repo, mock_timeline_repo,
    mock_invoice_service, mock_email_service, sample_subscription, sample_invoice
):
    """Test payment webhook processing updates subscription and reactivates if suspended."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.timeline_repo = mock_timeline_repo
    service.invoice_service = mock_invoice_service
    service.email_service = mock_email_service

    sample_invoice.total_amount = Decimal("10.00")
    mock_invoice_service.get_by_id = AsyncMock(return_value=sample_invoice)
    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_subscription_repo.update = AsyncMock(return_value=sample_subscription)
    mock_timeline_repo.create_event = AsyncMock()

    # Execute
    await service.process_payment_webhook(sample_invoice.id)

    # Assert
    mock_subscription_repo.update.assert_called_once()
    updated_subscription = mock_subscription_repo.update.call_args[0][0]
    assert updated_subscription.total_paid == sample_invoice.total_amount
    mock_timeline_repo.create_event.assert_called_once()
    assert mock_timeline_repo.create_event.call_args[1]['event_type'] == TimelineEventType.PAYMENT_RECEIVED
    mock_email_service.send_email.assert_called_once()


@pytest.mark.asyncio
async def test_process_payment_webhook_reactivates_suspended(
    mock_db, mock_subscription_repo, mock_timeline_repo,
    mock_invoice_service, mock_email_service, sample_subscription, sample_invoice
):
    """Test payment webhook reactivates suspended subscription."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.timeline_repo = mock_timeline_repo
    service.invoice_service = mock_invoice_service
    service.email_service = mock_email_service

    sample_subscription.status = SubscriptionStatus.SUSPENDED
    sample_subscription.status_reason = "Payment overdue"
    sample_invoice.total_amount = Decimal("10.00")
    
    mock_invoice_service.get_by_id = AsyncMock(return_value=sample_invoice)
    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_subscription_repo.update = AsyncMock(return_value=sample_subscription)

    # Mock provisioning service reactivation
    with patch('app.modules.hosting.services.billing_service.VPSProvisioningService') as mock_provisioning:
        mock_provisioning_instance = AsyncMock()
        mock_provisioning_instance.reactivate_subscription = AsyncMock()
        mock_provisioning.return_value = mock_provisioning_instance

        # Execute
        await service.process_payment_webhook(sample_invoice.id)

        # Assert
        mock_provisioning_instance.reactivate_subscription.assert_called_once_with(sample_subscription.id)


@pytest.mark.asyncio
async def test_check_overdue_invoices(
    mock_db, mock_subscription_repo, mock_timeline_repo,
    mock_email_service, sample_subscription
):
    """Test overdue invoice check suspends subscriptions after grace period."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.timeline_repo = mock_timeline_repo
    service.email_service = mock_email_service

    # Subscription is 10 days overdue (past 7-day grace period)
    sample_subscription.next_billing_date = date.today() - timedelta(days=10)
    sample_subscription.status = SubscriptionStatus.ACTIVE
    sample_subscription.total_invoiced = Decimal("10.00")
    sample_subscription.total_paid = Decimal("0.00")

    mock_subscription_repo.get_overdue_subscriptions = AsyncMock(return_value=[sample_subscription])

    # Mock provisioning service suspension
    with patch('app.modules.hosting.services.billing_service.VPSProvisioningService') as mock_provisioning:
        mock_provisioning_instance = AsyncMock()
        mock_provisioning_instance.suspend_subscription = AsyncMock()
        mock_provisioning.return_value = mock_provisioning_instance

        # Execute
        suspended = await service.check_overdue_invoices()

        # Assert
        assert len(suspended) == 1
        assert suspended[0].id == sample_subscription.id
        mock_provisioning_instance.suspend_subscription.assert_called_once()
        mock_email_service.send_email.assert_called_once()


@pytest.mark.asyncio
async def test_check_overdue_invoices_within_grace_period(
    mock_db, mock_subscription_repo, sample_subscription
):
    """Test overdue check doesn't suspend if within grace period."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo

    # Subscription is 5 days overdue (within 7-day grace period)
    sample_subscription.next_billing_date = date.today() - timedelta(days=5)
    sample_subscription.grace_period_days = 7

    mock_subscription_repo.get_overdue_subscriptions = AsyncMock(return_value=[sample_subscription])

    # Execute
    suspended = await service.check_overdue_invoices()

    # Assert
    assert len(suspended) == 0  # Not suspended yet


@pytest.mark.asyncio
async def test_process_recurring_billing(
    mock_db, mock_subscription_repo, mock_timeline_repo,
    mock_invoice_service, mock_email_service, sample_subscription
):
    """Test recurring billing processes all due subscriptions."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.timeline_repo = mock_timeline_repo
    service.invoice_service = mock_invoice_service
    service.email_service = mock_email_service

    # Subscription is due for billing today
    sample_subscription.next_billing_date = date.today()
    sample_subscription.status = SubscriptionStatus.ACTIVE
    sample_subscription.auto_renew = True

    # Mock query result
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [sample_subscription]
    mock_db.execute = AsyncMock(return_value=mock_result)

    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_subscription_repo.update = AsyncMock(return_value=sample_subscription)
    mock_timeline_repo.create_event = AsyncMock()

    created_invoice = MagicMock(spec=Invoice)
    created_invoice.id = str(uuid4())
    created_invoice.invoice_number = "INV-003"
    created_invoice.total_amount = Decimal("10.00")
    created_invoice.due_date = datetime.utcnow() + timedelta(days=7)
    mock_invoice_service.create = AsyncMock(return_value=created_invoice)

    # Execute
    invoice_count = await service.process_recurring_billing()

    # Assert
    assert invoice_count == 1
    mock_invoice_service.create.assert_called_once()


@pytest.mark.asyncio
async def test_schedule_next_billing_monthly(mock_db, sample_subscription):
    """Test next billing date calculation for monthly cycle."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    sample_subscription.billing_cycle = BillingCycle.MONTHLY
    sample_subscription.start_date = date(2025, 1, 15)

    # Execute
    next_date = await service.schedule_next_billing(sample_subscription)

    # Assert
    assert next_date == date(2025, 2, 15)


@pytest.mark.asyncio
async def test_schedule_next_billing_quarterly(mock_db, sample_subscription):
    """Test next billing date calculation for quarterly cycle."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    sample_subscription.billing_cycle = BillingCycle.QUARTERLY
    sample_subscription.start_date = date(2025, 1, 15)

    # Execute
    next_date = await service.schedule_next_billing(sample_subscription)

    # Assert
    assert next_date == date(2025, 4, 15)


@pytest.mark.asyncio
async def test_schedule_next_billing_annually(mock_db, sample_subscription):
    """Test next billing date calculation for annual cycle."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    sample_subscription.billing_cycle = BillingCycle.ANNUALLY
    sample_subscription.start_date = date(2025, 1, 15)

    # Execute
    next_date = await service.schedule_next_billing(sample_subscription)

    # Assert
    assert next_date == date(2026, 1, 15)


@pytest.mark.asyncio
async def test_generate_initial_invoice_not_found(mock_db, mock_subscription_repo):
    """Test initial invoice generation raises NotFoundException for invalid subscription."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo

    mock_subscription_repo.get_by_id = AsyncMock(return_value=None)

    # Execute & Assert
    with pytest.raises(NotFoundException):
        await service.generate_initial_invoice("invalid_id")


@pytest.mark.asyncio
async def test_generate_prorated_invoice(
    mock_db, mock_subscription_repo, mock_invoice_service,
    sample_subscription, sample_plan
):
    """Test pro-rated invoice generation for plan upgrade."""
    # Setup
    service = SubscriptionBillingService(mock_db)
    service.subscription_repo = mock_subscription_repo
    service.invoice_service = mock_invoice_service

    mock_subscription_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_subscription_repo.update = AsyncMock(return_value=sample_subscription)

    old_plan = sample_plan
    new_plan = MagicMock(spec=VPSPlan)
    new_plan.name = "Professional VPS"
    new_plan.monthly_price = Decimal("20.00")

    prorated_amount = Decimal("5.00")

    created_invoice = MagicMock(spec=Invoice)
    created_invoice.id = str(uuid4())
    created_invoice.invoice_number = "INV-004"
    created_invoice.total_amount = prorated_amount
    mock_invoice_service.create = AsyncMock(return_value=created_invoice)

    # Execute
    invoice = await service.generate_prorated_invoice(
        sample_subscription.id,
        prorated_amount,
        old_plan,
        new_plan
    )

    # Assert
    assert invoice is not None
    mock_invoice_service.create.assert_called_once()
    call_args = mock_invoice_service.create.call_args
    invoice_data = call_args[0][0]
    assert invoice_data.vps_subscription_id == sample_subscription.id
    assert len(invoice_data.items) == 1
    assert "Upgrade" in invoice_data.items[0].description
    assert invoice_data.items[0].unit_price == prorated_amount


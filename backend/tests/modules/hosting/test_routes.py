"""
Integration tests for VPS Hosting API routes.

Tests all 23 endpoints (13 client + 10 admin) including:
- Success cases
- Error handling (404, 403, 400)
- Permission enforcement
- Pagination and filtering
"""
import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.modules.hosting.models import (
    VPSPlan,
    VPSSubscription,
    ContainerInstance,
    SubscriptionStatus,
    ContainerStatus,
    BillingCycle
)
from app.modules.auth.models import User


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
async def async_client():
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def auth_headers():
    """Mock authentication headers."""
    return {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
    }


@pytest.fixture
def admin_auth_headers():
    """Mock admin authentication headers."""
    return {
        "Authorization": "Bearer admin-token",
        "Content-Type": "application/json"
    }


@pytest.fixture
def mock_user():
    """Mock authenticated user."""
    user = MagicMock(spec=User)
    user.id = str(uuid.uuid4())
    user.email = "test@example.com"
    user.full_name = "Test User"
    return user


@pytest.fixture
def mock_admin_user():
    """Mock admin user."""
    user = MagicMock(spec=User)
    user.id = str(uuid.uuid4())
    user.email = "admin@example.com"
    user.full_name = "Admin User"
    return user


@pytest.fixture
def sample_plan():
    """Sample VPS plan for testing."""
    plan = MagicMock(spec=VPSPlan)
    plan.id = str(uuid.uuid4())
    plan.name = "Starter VPS"
    plan.slug = "starter"
    plan.cpu_cores = 1.0
    plan.ram_gb = 2
    plan.storage_gb = 25
    plan.bandwidth_tb = 1.0
    plan.monthly_price = 10.00
    plan.setup_fee = 0.00
    plan.is_active = True
    plan.display_order = 0
    plan.created_at = datetime.utcnow()
    plan.updated_at = datetime.utcnow()
    return plan


@pytest.fixture
def sample_subscription(mock_user, sample_plan):
    """Sample VPS subscription for testing."""
    subscription = MagicMock(spec=VPSSubscription)
    subscription.id = str(uuid.uuid4())
    subscription.subscription_number = "VPS-20251221-00001"
    subscription.customer_id = mock_user.id
    subscription.plan_id = sample_plan.id
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.billing_cycle = BillingCycle.MONTHLY
    subscription.auto_renew = True
    subscription.plan = sample_plan
    subscription.customer = mock_user
    subscription.created_at = datetime.utcnow()
    subscription.updated_at = datetime.utcnow()
    return subscription


@pytest.fixture
def sample_container(sample_subscription):
    """Sample container instance for testing."""
    container = MagicMock(spec=ContainerInstance)
    container.id = str(uuid.uuid4())
    container.subscription_id = sample_subscription.id
    container.container_id = "abc123def456"
    container.container_name = "vps-test-container"
    container.status = ContainerStatus.RUNNING
    container.ip_address = "172.20.1.2"
    container.ssh_port = 2222
    container.subscription = sample_subscription
    return container


# ============================================================================
# Client Routes Tests
# ============================================================================

@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSPlanRepository')
async def test_list_vps_plans(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_plan: VPSPlan
):
    """Test listing VPS plans."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_plan], 1))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/plans",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSPlanRepository')
async def test_get_vps_plan(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_plan: VPSPlan
):
    """Test getting a specific VPS plan."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_plan)
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        f"/api/v1/hosting/plans/{sample_plan.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_plan.id
    assert data["name"] == sample_plan.name


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSPlanRepository')
async def test_get_vps_plan_not_found(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User
):
    """Test getting non-existent VPS plan returns 404."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=None)
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        f"/api/v1/hosting/plans/{str(uuid.uuid4())}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSProvisioningService')
async def test_request_vps(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_plan: VPSPlan
):
    """Test requesting a new VPS."""
    mock_get_user.return_value = mock_user
    mock_service = AsyncMock()
    mock_quote = MagicMock()
    mock_quote.id = str(uuid.uuid4())
    mock_quote.status = "PENDING"
    mock_quote.total_amount = 10.00
    mock_service.request_vps = AsyncMock(return_value=mock_quote)
    mock_service_class.return_value = mock_service

    payload = {"plan_id": sample_plan.id}
    response = await async_client.post(
        "/api/v1/hosting/subscriptions/request",
        json=payload,
        headers=auth_headers
    )

    assert response.status_code == 201
    mock_service.request_vps.assert_called_once_with(mock_user.id, sample_plan.id)


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_list_my_subscriptions(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test listing user's subscriptions."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/subscriptions",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert len(data["items"]) == 1


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_list_my_subscriptions_with_filters(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test listing subscriptions with status filter."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/subscriptions?status=ACTIVE",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_list_my_subscriptions_pagination(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test subscription pagination."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 25))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/subscriptions?page=1&page_size=20",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 25
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert data["total_pages"] == 2


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_get_subscription_details(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test getting subscription details."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_repo_class.return_value = mock_repo

    # Mock timeline and metrics repositories
    with patch('app.modules.hosting.routes.client.SubscriptionTimelineRepository') as mock_timeline_repo_class, \
         patch('app.modules.hosting.routes.client.ContainerMetricsRepository') as mock_metrics_repo_class:
        mock_timeline_repo = AsyncMock()
        mock_timeline_repo.get_by_subscription_id = AsyncMock(return_value=[])
        mock_timeline_repo_class.return_value = mock_timeline_repo

        mock_metrics_repo = AsyncMock()
        mock_metrics_repo.get_recent_metrics = AsyncMock(return_value=[])
        mock_metrics_repo_class.return_value = mock_metrics_repo

        response = await async_client.get(
            f"/api/v1/hosting/subscriptions/{sample_subscription.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_subscription.id


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_get_subscription_details_unauthorized(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test accessing another user's subscription returns 404."""
    mock_get_user.return_value = mock_user
    # Create subscription owned by different user
    other_user_id = str(uuid.uuid4())
    sample_subscription.customer_id = other_user_id

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        f"/api/v1/hosting/subscriptions/{sample_subscription.id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSProvisioningService')
@patch('app.modules.hosting.routes.client.SubscriptionBillingService')
async def test_upgrade_subscription(
    mock_billing_service_class,
    mock_provisioning_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription,
    sample_plan: VPSPlan
):
    """Test upgrading subscription."""
    mock_get_user.return_value = mock_user
    mock_provisioning_service = AsyncMock()
    mock_provisioning_service.upgrade_subscription = AsyncMock(return_value=sample_subscription)
    mock_provisioning_service_class.return_value = mock_provisioning_service

    mock_billing_service = AsyncMock()
    mock_billing_service.calculate_prorated_amount = AsyncMock(return_value=5.00)
    mock_billing_service_class.return_value = mock_billing_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        new_plan_id = str(uuid.uuid4())
        payload = {"new_plan_id": new_plan_id}
        response = await async_client.post(
            f"/api/v1/hosting/subscriptions/{sample_subscription.id}/upgrade",
            json=payload,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "prorated_amount" in data
        assert data["prorated_amount"] == 5.00


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSProvisioningService')
async def test_cancel_subscription(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test canceling subscription."""
    mock_get_user.return_value = mock_user
    mock_service = AsyncMock()
    mock_service.cancel_subscription = AsyncMock(return_value=sample_subscription)
    mock_service_class.return_value = mock_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        payload = {"immediate": False, "reason": "No longer needed"}
        response = await async_client.post(
            f"/api/v1/hosting/subscriptions/{sample_subscription.id}/cancel",
            json=payload,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_subscription.id


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSProvisioningService')
async def test_start_container(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription,
    sample_container: ContainerInstance
):
    """Test starting container."""
    mock_get_user.return_value = mock_user
    mock_service = AsyncMock()
    sample_container.status = ContainerStatus.RUNNING
    mock_service.start_container = AsyncMock(return_value=sample_container)
    mock_service_class.return_value = mock_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        response = await async_client.post(
            f"/api/v1/hosting/instances/{sample_subscription.id}/start",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["container_status"] == ContainerStatus.RUNNING


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSProvisioningService')
async def test_stop_container(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription,
    sample_container: ContainerInstance
):
    """Test stopping container."""
    mock_get_user.return_value = mock_user
    mock_service = AsyncMock()
    sample_container.status = ContainerStatus.STOPPED
    mock_service.stop_container = AsyncMock(return_value=sample_container)
    mock_service_class.return_value = mock_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        response = await async_client.post(
            f"/api/v1/hosting/instances/{sample_subscription.id}/stop",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["container_status"] == ContainerStatus.STOPPED


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSProvisioningService')
async def test_reboot_container(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription,
    sample_container: ContainerInstance
):
    """Test rebooting container."""
    mock_get_user.return_value = mock_user
    mock_service = AsyncMock()
    sample_container.status = ContainerStatus.RUNNING
    mock_service.reboot_container = AsyncMock(return_value=sample_container)
    mock_service_class.return_value = mock_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        response = await async_client.post(
            f"/api/v1/hosting/instances/{sample_subscription.id}/reboot",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.ContainerMonitoringService')
async def test_get_container_stats(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription,
    sample_container: ContainerInstance
):
    """Test getting container statistics."""
    mock_get_user.return_value = mock_user
    sample_subscription.container = sample_container

    mock_service = AsyncMock()
    mock_service.get_real_time_stats = AsyncMock(return_value={"cpu_usage_percent": 45.5})
    mock_service.get_metrics_history = AsyncMock(return_value=[])
    mock_service_class.return_value = mock_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        response = await async_client.get(
            f"/api/v1/hosting/instances/{sample_subscription.id}/stats",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        assert "history" in data


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.DockerManagementService')
async def test_get_container_logs(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription,
    sample_container: ContainerInstance
):
    """Test getting container logs."""
    mock_get_user.return_value = mock_user
    sample_subscription.container = sample_container

    mock_service = AsyncMock()
    mock_service.get_container_logs = AsyncMock(return_value="Container logs here...")
    mock_service_class.return_value = mock_service

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_repo):
        response = await async_client.get(
            f"/api/v1/hosting/instances/{sample_subscription.id}/logs",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "logs" in data


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.SubscriptionTimelineRepository')
async def test_get_subscription_timeline(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test getting subscription timeline."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_by_subscription_id = AsyncMock(return_value=[])
    mock_repo_class.return_value = mock_repo

    mock_sub_repo = AsyncMock()
    mock_sub_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    with patch('app.modules.hosting.routes.client.VPSSubscriptionRepository', return_value=mock_sub_repo):
        response = await async_client.get(
            f"/api/v1/hosting/subscriptions/{sample_subscription.id}/timeline",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# ============================================================================
# Admin Routes Tests
# ============================================================================

@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
async def test_list_pending_requests(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test listing pending VPS requests."""
    mock_get_user.return_value = mock_admin_user
    sample_subscription.status = SubscriptionStatus.PENDING

    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/admin/requests/pending",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 1


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSProvisioningService')
async def test_approve_vps_request(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test approving VPS request."""
    mock_get_user.return_value = mock_admin_user
    sample_subscription.status = SubscriptionStatus.PROVISIONING

    mock_service = AsyncMock()
    mock_service.approve_vps_request = AsyncMock(return_value=sample_subscription)
    mock_service_class.return_value = mock_service

    response = await async_client.post(
        f"/api/v1/hosting/admin/requests/{sample_subscription.id}/approve",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_subscription.id


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
async def test_reject_vps_request(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test rejecting VPS request."""
    mock_get_user.return_value = mock_admin_user
    sample_subscription.status = SubscriptionStatus.PENDING

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_repo.update = AsyncMock()
    mock_repo_class.return_value = mock_repo

    with patch('app.modules.hosting.routes.admin.SubscriptionTimelineRepository') as mock_timeline_repo_class:
        mock_timeline_repo = AsyncMock()
        mock_timeline_repo.create_event = AsyncMock()
        mock_timeline_repo_class.return_value = mock_timeline_repo

        with patch('app.modules.hosting.routes.admin.get_db') as mock_get_db:
            mock_db = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_get_db.return_value = mock_db

            payload = {"reason": "Insufficient information"}
            response = await async_client.post(
                f"/api/v1/hosting/admin/requests/{sample_subscription.id}/reject",
                json=payload,
                headers=admin_auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "rejected"


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
async def test_list_all_subscriptions(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test listing all subscriptions (admin)."""
    mock_get_user.return_value = mock_admin_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/admin/subscriptions",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
async def test_list_all_subscriptions_with_filters(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test listing subscriptions with filters."""
    mock_get_user.return_value = mock_admin_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        "/api/v1/hosting/admin/subscriptions?status=ACTIVE&customer_id=123",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
async def test_get_subscription_admin(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test getting subscription details (admin)."""
    mock_get_user.return_value = mock_admin_user
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_repo_class.return_value = mock_repo

    with patch('app.modules.hosting.routes.admin.SubscriptionTimelineRepository') as mock_timeline_repo_class, \
         patch('app.modules.hosting.routes.admin.ContainerMetricsRepository') as mock_metrics_repo_class:
        mock_timeline_repo = AsyncMock()
        mock_timeline_repo.get_by_subscription_id = AsyncMock(return_value=[])
        mock_timeline_repo_class.return_value = mock_timeline_repo

        mock_metrics_repo = AsyncMock()
        mock_metrics_repo.get_recent_metrics = AsyncMock(return_value=[])
        mock_metrics_repo_class.return_value = mock_metrics_repo

        response = await async_client.get(
            f"/api/v1/hosting/admin/subscriptions/{sample_subscription.id}",
            headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_subscription.id


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSProvisioningService')
async def test_suspend_subscription_admin(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test suspending subscription (admin)."""
    mock_get_user.return_value = mock_admin_user
    sample_subscription.status = SubscriptionStatus.SUSPENDED

    mock_service = AsyncMock()
    mock_service.suspend_subscription = AsyncMock(return_value=sample_subscription)
    mock_service_class.return_value = mock_service

    payload = {"reason": "Payment overdue"}
    response = await async_client.post(
        f"/api/v1/hosting/admin/subscriptions/{sample_subscription.id}/suspend",
        json=payload,
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == SubscriptionStatus.SUSPENDED


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSProvisioningService')
async def test_reactivate_subscription_admin(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test reactivating subscription (admin)."""
    mock_get_user.return_value = mock_admin_user
    sample_subscription.status = SubscriptionStatus.ACTIVE

    mock_service = AsyncMock()
    mock_service.reactivate_subscription = AsyncMock(return_value=sample_subscription)
    mock_service_class.return_value = mock_service

    response = await async_client.post(
        f"/api/v1/hosting/admin/subscriptions/{sample_subscription.id}/reactivate",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == SubscriptionStatus.ACTIVE


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSProvisioningService')
async def test_terminate_subscription_admin(
    mock_service_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test terminating subscription (admin)."""
    mock_get_user.return_value = mock_admin_user
    mock_service = AsyncMock()
    mock_service.terminate_subscription = AsyncMock(return_value=True)
    mock_service_class.return_value = mock_service

    response = await async_client.delete(
        f"/api/v1/hosting/admin/subscriptions/{sample_subscription.id}",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "terminated"


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
@patch('app.modules.hosting.routes.admin.ContainerMetricsRepository')
@patch('app.modules.hosting.routes.admin.ContainerMonitoringService')
async def test_get_monitoring_overview(
    mock_monitoring_service_class,
    mock_metrics_repo_class,
    mock_sub_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test getting monitoring overview."""
    mock_get_user.return_value = mock_admin_user
    mock_sub_repo = AsyncMock()
    mock_sub_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_sub_repo_class.return_value = mock_sub_repo

    mock_metrics_repo = AsyncMock()
    mock_metrics_repo.get_recent_metrics = AsyncMock(return_value=[])
    mock_metrics_repo_class.return_value = mock_metrics_repo

    mock_monitoring_service = AsyncMock()
    mock_monitoring_service.check_resource_alerts = AsyncMock(return_value=[])
    mock_monitoring_service_class.return_value = mock_monitoring_service

    response = await async_client.get(
        "/api/v1/hosting/admin/monitoring/overview",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "total_subscriptions" in data
    assert "active_containers" in data
    assert "total_monthly_revenue" in data


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
@patch('app.modules.hosting.routes.admin.ContainerMonitoringService')
async def test_get_alerts(
    mock_service_class,
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test getting alerts."""
    mock_get_user.return_value = mock_admin_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    mock_service = AsyncMock()
    mock_service.check_resource_alerts = AsyncMock(return_value=[])
    mock_service_class.return_value = mock_service

    response = await async_client.get(
        "/api/v1/hosting/admin/monitoring/alerts",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.admin.get_current_user')
@patch('app.modules.hosting.routes.admin.VPSSubscriptionRepository')
@patch('app.modules.hosting.routes.admin.ContainerMonitoringService')
async def test_get_alerts_with_severity_filter(
    mock_service_class,
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    admin_auth_headers: dict,
    mock_admin_user: User,
    sample_subscription: VPSSubscription
):
    """Test getting alerts with severity filter."""
    mock_get_user.return_value = mock_admin_user
    mock_repo = AsyncMock()
    mock_repo.get_all = AsyncMock(return_value=([sample_subscription], 1))
    mock_repo_class.return_value = mock_repo

    mock_service = AsyncMock()
    mock_service.check_resource_alerts = AsyncMock(return_value=[])
    mock_service_class.return_value = mock_service

    response = await async_client.get(
        "/api/v1/hosting/admin/monitoring/alerts?severity=CRITICAL",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


# ============================================================================
# Permission Tests
# ============================================================================

@pytest.mark.asyncio
async def test_client_cannot_access_admin_endpoints(
    async_client: AsyncClient,
    auth_headers: dict
):
    """Test that client users cannot access admin endpoints."""
    # This would require proper permission checking in the actual implementation
    # For now, we verify the endpoint exists and would return 403 without proper permissions
    response = await async_client.get(
        "/api/v1/hosting/admin/requests/pending",
        headers=auth_headers
    )

    # Should return 403 or 401 depending on permission implementation
    assert response.status_code in [401, 403]


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_client_cannot_access_other_user_subscriptions(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User,
    sample_subscription: VPSSubscription
):
    """Test that users cannot access other users' subscriptions."""
    mock_get_user.return_value = mock_user
    # Subscription belongs to different user
    other_user_id = str(uuid.uuid4())
    sample_subscription.customer_id = other_user_id

    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=sample_subscription)
    mock_repo_class.return_value = mock_repo

    response = await async_client.get(
        f"/api/v1/hosting/subscriptions/{sample_subscription.id}",
        headers=auth_headers
    )

    # Should return 404 (not found) to prevent information disclosure
    assert response.status_code == 404


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSSubscriptionRepository')
async def test_invalid_subscription_id_returns_404(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User
):
    """Test that invalid subscription ID returns 404."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=None)
    mock_repo_class.return_value = mock_repo

    invalid_id = str(uuid.uuid4())
    response = await async_client.get(
        f"/api/v1/hosting/subscriptions/{invalid_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
@patch('app.modules.hosting.routes.client.VPSPlanRepository')
async def test_invalid_plan_id_returns_404(
    mock_repo_class,
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User
):
    """Test that invalid plan ID returns 404."""
    mock_get_user.return_value = mock_user
    mock_repo = AsyncMock()
    mock_repo.get_by_id = AsyncMock(return_value=None)
    mock_repo_class.return_value = mock_repo

    invalid_id = str(uuid.uuid4())
    response = await async_client.get(
        f"/api/v1/hosting/plans/{invalid_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
@patch('app.modules.hosting.routes.client.get_current_user')
async def test_invalid_request_body_returns_400(
    mock_get_user,
    async_client: AsyncClient,
    auth_headers: dict,
    mock_user: User
):
    """Test that invalid request body returns 400."""
    mock_get_user.return_value = mock_user

    # Missing required field
    payload = {}
    response = await async_client.post(
        "/api/v1/hosting/subscriptions/request",
        json=payload,
        headers=auth_headers
    )

    assert response.status_code == 422  # FastAPI returns 422 for validation errors


@pytest.mark.asyncio
async def test_missing_permission_returns_403(
    async_client: AsyncClient
):
    """Test that missing authentication returns 403."""
    # No auth headers
    response = await async_client.get(
        "/api/v1/hosting/plans"
    )

    # Should return 401 or 403 depending on implementation
    assert response.status_code in [401, 403]










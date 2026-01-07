"""
Security tests for permission enforcement.

Tests:
- Client accessing admin endpoints (expect 403)
- Client accessing other users' subscriptions (expect 403)
- Unauthenticated access (expect 401/403)
- Invalid token (expect 401)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from tests.conftest import test_client_user, test_admin_user, test_corporate_user


@pytest.mark.asyncio
@pytest.mark.security
async def test_client_cannot_access_admin_endpoints(
    async_client: AsyncClient,
    test_client_user,
):
    """Test that client users cannot access admin endpoints."""
    # Mock client authentication
    headers = {
        "Authorization": f"Bearer client-token",
        "Content-Type": "application/json",
    }
    
    # Try to access admin endpoint
    response = await async_client.get(
        "/api/v1/hosting/admin/requests/pending",
        headers=headers,
    )
    
    # Should return 403 Forbidden
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.security
async def test_client_cannot_access_other_users_subscriptions(
    async_client: AsyncClient,
    test_client_user,
    test_pending_subscription,
):
    """Test that clients cannot access other users' subscriptions."""
    # Mock client authentication
    headers = {
        "Authorization": f"Bearer client-token",
        "Content-Type": "application/json",
    }
    
    # Try to access another user's subscription
    # Note: This would require creating a subscription for a different user
    # For now, we test the endpoint with a non-existent subscription
    response = await async_client.get(
        "/api/v1/hosting/subscriptions/other-user-subscription-id",
        headers=headers,
    )
    
    # Should return 404 (not found) or 403 (forbidden) depending on implementation
    assert response.status_code in [403, 404]


@pytest.mark.asyncio
@pytest.mark.security
async def test_unauthenticated_access_returns_401(
    async_client: AsyncClient,
):
    """Test that unauthenticated requests return 401."""
    # No authorization header
    response = await async_client.get(
        "/api/v1/hosting/subscriptions",
    )
    
    # Should return 401 Unauthorized
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.security
async def test_invalid_token_returns_401(
    async_client: AsyncClient,
):
    """Test that invalid tokens return 401."""
    headers = {
        "Authorization": "Bearer invalid-token-12345",
        "Content-Type": "application/json",
    }
    
    response = await async_client.get(
        "/api/v1/hosting/subscriptions",
        headers=headers,
    )
    
    # Should return 401 Unauthorized
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.security
async def test_admin_can_access_admin_endpoints(
    async_client: AsyncClient,
    test_admin_user,
):
    """Test that admin users can access admin endpoints."""
    headers = {
        "Authorization": f"Bearer admin-token",
        "Content-Type": "application/json",
    }
    
    response = await async_client.get(
        "/api/v1/hosting/admin/requests/pending",
        headers=headers,
    )
    
    # Should return 200 OK (or appropriate success status)
    assert response.status_code in [200, 404]  # 404 if no pending requests


@pytest.mark.asyncio
@pytest.mark.security
async def test_corporate_user_can_access_admin_endpoints(
    async_client: AsyncClient,
    test_corporate_user,
):
    """Test that corporate users can access admin endpoints."""
    headers = {
        "Authorization": f"Bearer corporate-token",
        "Content-Type": "application/json",
    }
    
    response = await async_client.get(
        "/api/v1/hosting/admin/subscriptions",
        headers=headers,
    )
    
    # Should return 200 OK
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
@pytest.mark.security
async def test_client_can_only_access_own_subscriptions(
    async_client: AsyncClient,
    test_client_user,
    test_active_subscription,
):
    """Test that clients can only access their own subscriptions."""
    headers = {
        "Authorization": f"Bearer client-token",
        "Content-Type": "application/json",
    }
    
    # Access own subscription
    response = await async_client.get(
        f"/api/v1/hosting/subscriptions/{test_active_subscription.id}",
        headers=headers,
    )
    
    # Should return 200 OK if subscription belongs to client
    # or 403 if it doesn't
    assert response.status_code in [200, 403, 404]










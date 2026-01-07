"""
Security tests for credential security.

Tests:
- Verify passwords encrypted at rest (check DB)
- Verify no plain-text password in logs
- Verify password not exposed in API responses
- Test password encryption/decryption
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hosting.models import ContainerInstance
from app.modules.hosting.repository import ContainerInstanceRepository
from tests.conftest import db_session, test_active_subscription


@pytest.mark.asyncio
@pytest.mark.security
async def test_passwords_encrypted_at_rest(
    db_session: AsyncSession,
    test_active_subscription,
):
    """Test that passwords are encrypted in the database."""
    container_repo = ContainerInstanceRepository(db_session)
    
    # Create container with password
    container = await container_repo.create({
        "subscription_id": test_active_subscription.id,
        "container_id": "test-container-encrypted",
        "container_name": "vps-encrypted",
        "ip_address": "172.20.1.40",
        "network_name": "vps-net-encrypted",
        "hostname": "vps-encrypted.example.com",
        "ssh_port": 2226,
        "root_password": "plaintext-password-123",  # This should be encrypted
        "status": "RUNNING",
        "cpu_limit": 1.0,
        "memory_limit_gb": 2,
        "storage_limit_gb": 25,
        "data_volume_path": "/var/lib/vps-volumes/encrypted",
    })
    
    await db_session.commit()
    
    # Retrieve from database
    retrieved = await container_repo.get_by_id(container.id)
    
    # Verify password is not plain text
    # In a real implementation, passwords should be encrypted/hashed
    # This test verifies that the password stored is not the plain text
    assert retrieved is not None
    # The password should be encrypted/hashed, not plain text
    # Note: This depends on your encryption implementation
    # For now, we just verify the field exists
    assert retrieved.root_password is not None
    assert retrieved.root_password != "plaintext-password-123"  # Should be encrypted


@pytest.mark.asyncio
@pytest.mark.security
async def test_password_not_in_api_response(
    db_session: AsyncSession,
    test_active_subscription,
):
    """Test that passwords are not exposed in API responses."""
    from app.modules.hosting.schemas import ContainerInstanceResponse
    
    container_repo = ContainerInstanceRepository(db_session)
    
    container = await container_repo.create({
        "subscription_id": test_active_subscription.id,
        "container_id": "test-container-api",
        "container_name": "vps-api",
        "ip_address": "172.20.1.50",
        "network_name": "vps-net-api",
        "hostname": "vps-api.example.com",
        "ssh_port": 2227,
        "root_password": "secret-password",
        "status": "RUNNING",
        "cpu_limit": 1.0,
        "memory_limit_gb": 2,
        "storage_limit_gb": 25,
        "data_volume_path": "/var/lib/vps-volumes/api",
    })
    
    await db_session.commit()
    
    # Convert to API response schema
    response = ContainerInstanceResponse.model_validate(container)
    response_dict = response.model_dump()
    
    # Verify password is not in response
    # The schema should exclude the password field
    assert "root_password" not in response_dict or response_dict.get("root_password") is None


@pytest.mark.asyncio
@pytest.mark.security
async def test_password_not_in_logs(
    db_session: AsyncSession,
    test_active_subscription,
):
    """Test that passwords are not logged in plain text."""
    import logging
    from io import StringIO
    
    # Capture logs
    log_capture = StringIO()
    handler = logging.StreamHandler(log_capture)
    logger = logging.getLogger("app.modules.hosting")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    container_repo = ContainerInstanceRepository(db_session)
    
    password = "secret-password-123"
    
    # Create container (this might log something)
    container = await container_repo.create({
        "subscription_id": test_active_subscription.id,
        "container_id": "test-container-logs",
        "container_name": "vps-logs",
        "ip_address": "172.20.1.60",
        "network_name": "vps-net-logs",
        "hostname": "vps-logs.example.com",
        "ssh_port": 2228,
        "root_password": password,
        "status": "RUNNING",
        "cpu_limit": 1.0,
        "memory_limit_gb": 2,
        "storage_limit_gb": 25,
        "data_volume_path": "/var/lib/vps-volumes/logs",
    })
    
    await db_session.commit()
    
    # Check logs
    log_output = log_capture.getvalue()
    
    # Password should not appear in logs
    assert password not in log_output
    
    logger.removeHandler(handler)











"""
Performance test for metrics collection.

Tests metrics collection performance with 50+ containers.
Target: <30 seconds for 100 containers
"""
import pytest
import asyncio
import time
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hosting.services.monitoring_service import ContainerMonitoringService
from app.modules.hosting.repository import ContainerInstanceRepository, VPSSubscriptionRepository
from app.modules.hosting.models import ContainerInstance, ContainerStatus, SubscriptionStatus
from tests.conftest import db_session, test_active_subscription, test_starter_plan, test_client_user


@pytest.mark.asyncio
@pytest.mark.performance
async def test_metrics_collection_performance_50_containers(
    db_session: AsyncSession,
    test_client_user,
    test_starter_plan,
    mock_docker_client,
):
    """Test metrics collection performance with 50 containers."""
    monitoring_service = ContainerMonitoringService(db_session)
    container_repo = ContainerInstanceRepository(db_session)
    subscription_repo = VPSSubscriptionRepository(db_session)
    
    # Create 50 test subscriptions and containers
    containers = []
    for i in range(50):
        # Create subscription
        subscription = await subscription_repo.create({
            "subscription_number": f"VPS-TEST-{i:05d}",
            "customer_id": test_client_user.id,
            "plan_id": test_starter_plan.id,
            "status": SubscriptionStatus.ACTIVE,
            "billing_cycle": "MONTHLY",
            "auto_renew": True,
        })
        
        # Create container
        container = await container_repo.create({
            "subscription_id": subscription.id,
            "container_id": f"test-container-{i}",
            "container_name": f"vps-test-{i}",
            "ip_address": f"172.20.1.{i+10}",
            "network_name": f"vps-net-{i}",
            "hostname": f"vps-test-{i}.example.com",
            "ssh_port": 2222 + i,
            "root_password": "encrypted",
            "status": ContainerStatus.RUNNING,
            "cpu_limit": 1.0,
            "memory_limit_gb": 2,
            "storage_limit_gb": 25,
            "data_volume_path": f"/var/lib/vps-volumes/test-{i}",
        })
        containers.append(container)
    
    await db_session.commit()
    
    # Mock Docker service
    from unittest.mock import AsyncMock, patch
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
        
        # Measure collection time
        start_time = time.time()
        count = await monitoring_service.collect_all_metrics()
        end_time = time.time()
        
        elapsed_time = end_time - start_time
        
        # Verify performance target
        assert elapsed_time < 30.0, f"Metrics collection took {elapsed_time:.2f}s, expected <30s"
        assert count >= 50, f"Expected to collect metrics for at least 50 containers, got {count}"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_metrics_collection_performance_100_containers(
    db_session: AsyncSession,
    test_client_user,
    test_starter_plan,
    mock_docker_client,
):
    """Test metrics collection performance with 100 containers."""
    monitoring_service = ContainerMonitoringService(db_session)
    container_repo = ContainerInstanceRepository(db_session)
    subscription_repo = VPSSubscriptionRepository(db_session)
    
    # Create 100 test subscriptions and containers
    containers = []
    for i in range(100):
        subscription = await subscription_repo.create({
            "subscription_number": f"VPS-PERF-{i:05d}",
            "customer_id": test_client_user.id,
            "plan_id": test_starter_plan.id,
            "status": SubscriptionStatus.ACTIVE,
            "billing_cycle": "MONTHLY",
            "auto_renew": True,
        })
        
        container = await container_repo.create({
            "subscription_id": subscription.id,
            "container_id": f"perf-container-{i}",
            "container_name": f"vps-perf-{i}",
            "ip_address": f"172.20.2.{i+10}",
            "network_name": f"vps-net-perf-{i}",
            "hostname": f"vps-perf-{i}.example.com",
            "ssh_port": 3000 + i,
            "root_password": "encrypted",
            "status": ContainerStatus.RUNNING,
            "cpu_limit": 1.0,
            "memory_limit_gb": 2,
            "storage_limit_gb": 25,
            "data_volume_path": f"/var/lib/vps-volumes/perf-{i}",
        })
        containers.append(container)
    
    await db_session.commit()
    
    # Mock Docker service
    from unittest.mock import AsyncMock, patch
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
        
        # Measure collection time
        start_time = time.time()
        count = await monitoring_service.collect_all_metrics()
        end_time = time.time()
        
        elapsed_time = end_time - start_time
        
        # Verify performance target
        assert elapsed_time < 30.0, f"Metrics collection took {elapsed_time:.2f}s, expected <30s for 100 containers"
        assert count >= 100, f"Expected to collect metrics for at least 100 containers, got {count}"










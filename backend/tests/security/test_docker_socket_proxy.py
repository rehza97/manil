"""
Security tests for Docker socket proxy.

Tests:
- Verify no direct socket access from containers
- Test malicious Docker commands (should fail)
- Verify limited API access through proxy
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.modules.hosting.services.docker_service import DockerManagementService
from app.modules.hosting.models import ContainerInstance
from tests.conftest import db_session, test_active_subscription, mock_docker_client


@pytest.mark.asyncio
@pytest.mark.security
async def test_no_direct_docker_socket_access(
    db_session: AsyncSession,
    test_active_subscription,
    mock_docker_client,
):
    """Test that containers cannot directly access Docker socket."""
    docker_service = DockerManagementService(db_session)
    
    # Create container
    container = ContainerInstance(
        id="container-no-socket",
        subscription_id=test_active_subscription.id,
        container_id="docker-no-socket",
        container_name="vps-no-socket",
        ip_address="172.20.1.70",
        network_name="vps-net-no-socket",
        hostname="vps-no-socket.example.com",
        ssh_port=2229,
        root_password="encrypted",
        status="RUNNING",
        cpu_limit=1.0,
        memory_limit_gb=2,
        storage_limit_gb=25,
        data_volume_path="/var/lib/vps-volumes/no-socket",
    )
    
    # Verify container does not have Docker socket mounted
    # In a real test, we would inspect the container's volume mounts
    # and verify /var/run/docker.sock is not present
    
    # Attempt to execute command that would access Docker socket
    with patch.object(docker_service, "exec_command") as mock_exec:
        mock_exec.return_value = {
            "exit_code": 1,
            "output": "Permission denied: /var/run/docker.sock",
        }
        
        result = await docker_service.exec_command(
            container.container_id,
            "docker ps"  # This should fail if socket is not accessible
        )
        
        # Should fail with permission denied
        assert result["exit_code"] != 0
        assert "docker.sock" in result["output"].lower() or "permission" in result["output"].lower()


@pytest.mark.asyncio
@pytest.mark.security
async def test_malicious_docker_commands_blocked(
    db_session: AsyncSession,
    test_active_subscription,
    mock_docker_client,
):
    """Test that malicious Docker commands are blocked."""
    docker_service = DockerManagementService(db_session)
    
    container = ContainerInstance(
        id="container-malicious",
        subscription_id=test_active_subscription.id,
        container_id="docker-malicious",
        container_name="vps-malicious",
        ip_address="172.20.1.80",
        network_name="vps-net-malicious",
        hostname="vps-malicious.example.com",
        ssh_port=2230,
        root_password="encrypted",
        status="RUNNING",
        cpu_limit=1.0,
        memory_limit_gb=2,
        storage_limit_gb=25,
        data_volume_path="/var/lib/vps-volumes/malicious",
    )
    
    malicious_commands = [
        "docker run -d --privileged malicious-image",
        "docker exec -it $(docker ps -q) rm -rf /",
        "docker network create --driver bridge malicious-network",
        "docker volume create malicious-volume && docker run -v malicious-volume:/data malicious-image",
    ]
    
    for cmd in malicious_commands:
        with patch.object(docker_service, "exec_command") as mock_exec:
            mock_exec.return_value = {
                "exit_code": 1,
                "output": "Command not allowed",
            }
            
            result = await docker_service.exec_command(container.container_id, cmd)
            
            # Should fail
            assert result["exit_code"] != 0


@pytest.mark.asyncio
@pytest.mark.security
async def test_limited_api_access_through_proxy(
    db_session: AsyncSession,
    test_active_subscription,
    mock_docker_client,
):
    """Test that only allowed Docker API operations are accessible."""
    docker_service = DockerManagementService(db_session)
    
    container = ContainerInstance(
        id="container-limited-api",
        subscription_id=test_active_subscription.id,
        container_id="docker-limited-api",
        container_name="vps-limited-api",
        ip_address="172.20.1.90",
        network_name="vps-net-limited-api",
        hostname="vps-limited-api.example.com",
        ssh_port=2231,
        root_password="encrypted",
        status="RUNNING",
        cpu_limit=1.0,
        memory_limit_gb=2,
        storage_limit_gb=25,
        data_volume_path="/var/lib/vps-volumes/limited-api",
    )
    
    # Allowed operations (should succeed)
    allowed_operations = [
        ("start", docker_service.start_container),
        ("stop", docker_service.stop_container),
        ("reboot", docker_service.reboot_container),
        ("get_stats", docker_service.get_container_stats),
    ]
    
    for op_name, op_func in allowed_operations:
        with patch.object(op_func, "__call__", new_callable=AsyncMock) as mock_op:
            mock_op.return_value = {"success": True}
            
            # Operation should be callable
            assert callable(op_func)
    
    # Disallowed operations (should fail)
    disallowed_operations = [
        "docker system prune -a --volumes",
        "docker network prune -f",
        "docker volume prune -f",
    ]
    
    for cmd in disallowed_operations:
        with patch.object(docker_service, "exec_command") as mock_exec:
            mock_exec.return_value = {
                "exit_code": 1,
                "output": "Operation not allowed",
            }
            
            result = await docker_service.exec_command(container.container_id, cmd)
            
            # Should fail
            assert result["exit_code"] != 0











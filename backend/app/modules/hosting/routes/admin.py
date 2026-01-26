"""
VPS Hosting Admin API routes.

Admin-only endpoints for managing all VPS subscriptions.
"""
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse
import json
import tempfile
import os

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.hosting.models import (
    VPSSubscription,
    ContainerInstance,
    ContainerMetrics,
    SubscriptionStatus,
    ContainerStatus
)
from app.modules.hosting.repository import (
    VPSSubscriptionRepository,
    ContainerMetricsRepository
)
from app.modules.hosting.services import (
    VPSProvisioningService,
    ContainerMonitoringService,
    DockerManagementService
)
from app.modules.hosting.schemas import (
    VPSSubscriptionResponse,
    VPSSubscriptionDetailResponse,
    VPSSubscriptionListResponse,
    VPSApprovalRequest,
    RejectRequestBody,
    SuspendSubscriptionBody,
    VPSReactivateRequest,
    MonitoringOverviewSchema,
    AlertSchema
)
from pydantic import BaseModel, Field
from app.modules.hosting.routes.client import CreateVPSRequestBody
from app.modules.hosting.distros import SUPPORTED_DISTROS

router = APIRouter(prefix="/api/v1/hosting/admin", tags=["VPS Hosting - Admin"])


@router.get(
    "/distros",
    summary="List Supported Distros (Admin)",
    description="""
    Return the curated list of supported VPS distros (mapped to Docker images).

    **Permissions Required:** `hosting:admin`
    """
)
async def list_supported_distros_admin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    return SUPPORTED_DISTROS


# ============================================================================
# Pending Requests
# ============================================================================

@router.get(
    "/requests/pending",
    response_model=VPSSubscriptionListResponse,
    summary="List Pending VPS Requests",
    description="""
    Retrieve all pending VPS subscription requests awaiting admin approval.
    
    Returns a paginated list of VPS requests that are in PENDING status. These requests
    were created by customers and need admin approval before provisioning can begin.
    
    **Permissions Required:** `hosting:approve`
    
    **Query Parameters:**
    - page: Page number (default: 1, minimum: 1)
    - page_size: Number of items per page (default: 20, range: 1-100)
    
    **Response:** Paginated list of pending subscriptions with customer and plan details.
    """
)
async def list_pending_requests(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_APPROVE))
):
    """
    List all pending VPS requests.
    
    Args:
        page: Page number (starts at 1)
        page_size: Number of items per page (1-100)
        db: Database session
        current_user: Authenticated user (requires hosting:approve permission)
    
    Returns:
        Paginated list of pending subscriptions
    
    Raises:
        403: If user lacks hosting:approve permission
    """
    repo = VPSSubscriptionRepository(db)
    skip = (page - 1) * page_size
    
    subscriptions, total = await repo.get_all(
        skip=skip,
        limit=page_size,
        status=SubscriptionStatus.PENDING
    )
    
    total_pages = (total + page_size - 1) // page_size
    
    return VPSSubscriptionListResponse(
        items=[VPSSubscriptionResponse.model_validate(sub) for sub in subscriptions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post(
    "/requests/{subscription_id}/approve",
    response_model=VPSSubscriptionResponse,
    summary="Approve VPS Request",
    description="""
    Approve a pending VPS request and trigger provisioning.
    
    Approves the VPS request, changes status from PENDING to PROVISIONING, and triggers
    an asynchronous Celery task to provision the container. The container will be ready
    within 60 seconds after approval.
    
    **Permissions Required:** `hosting:approve`
    
    **Response:** Updated subscription with PROVISIONING status.
    
    **Note:** Provisioning happens asynchronously. Check subscription status to track progress.
    """
)
async def approve_vps_request(
    subscription_id: str,
    request: Optional[VPSApprovalRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_APPROVE))
):
    """
    Approve VPS request (triggers async provisioning).
    
    Args:
        subscription_id: Unique identifier of the subscription
        request: Optional approval request body
        db: Database session
        current_user: Authenticated user (requires hosting:approve permission)
    
    Returns:
        Updated subscription with PROVISIONING status
    
    Raises:
        404: If subscription not found
        400: If subscription is not in PENDING status
        403: If user lacks hosting:approve permission
    """
    provisioning_service = VPSProvisioningService(db)
    subscription = await provisioning_service.approve_vps_request(subscription_id, current_user.id)
    
    return VPSSubscriptionResponse.model_validate(subscription)


@router.post(
    "/requests/{subscription_id}/reject",
    status_code=status.HTTP_200_OK,
    summary="Reject VPS Request",
    description="""
    Reject a pending VPS request.
    
    Rejects the VPS request with a provided reason, changes status to CANCELLED, and
    creates a timeline event. The customer will be notified of the rejection.
    
    **Permissions Required:** `hosting:approve`
    
    **Request Body:**
    - reason: Reason for rejection (required)
    
    **Response:** Success message with rejection status.
    """
)
async def reject_vps_request(
    subscription_id: str,
    request: RejectRequestBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_APPROVE))
):
    """
    Reject VPS request with reason.
    
    Args:
        subscription_id: Unique identifier of the subscription
        request: Rejection request body with reason
        db: Database session
        current_user: Authenticated user (requires hosting:approve permission)
    
    Returns:
        Success response with rejection status
    
    Raises:
        404: If subscription not found
        400: If subscription is not in PENDING status
        403: If user lacks hosting:approve permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if subscription.status != SubscriptionStatus.PENDING:
        raise BadRequestException(f"Subscription is not pending (current status: {subscription.status})")
    
    # Update subscription status
    subscription.status = SubscriptionStatus.CANCELLED
    subscription.status_reason = f"Request rejected: {request.reason}"
    subscription.cancelled_at = datetime.utcnow()
    await repo.update(subscription)
    
    # Create timeline event
    from app.modules.hosting.repository import SubscriptionTimelineRepository
    from app.modules.hosting.models import TimelineEventType, ActorType
    
    timeline_repo = SubscriptionTimelineRepository(db)
    await timeline_repo.create_event(
        subscription_id=subscription.id,
        event_type=TimelineEventType.CANCELLED,
        event_description=f"Request rejected: {request.reason}",
        actor_id=current_user.id,
        actor_type="ADMIN",
        metadata={"reason": request.reason}
    )
    
    await db.commit()
    
    logger.info(f"VPS request rejected: {subscription.subscription_number} by {current_user.id}")
    
    return {"status": "rejected", "message": "VPS request has been rejected"}


# ============================================================================
# All Subscriptions
# ============================================================================

@router.get(
    "/subscriptions",
    response_model=VPSSubscriptionListResponse,
    summary="List All VPS Subscriptions",
    description="""
    Retrieve all VPS subscriptions across all customers.
    
    Admin-only endpoint that returns subscriptions from all customers. Supports filtering
    by status, customer ID, and plan ID. Useful for system-wide subscription management.
    
    **Permissions Required:** `hosting:admin`
    
    **Query Parameters:**
    - status: Optional filter by subscription status
    - customer_id: Optional filter by customer ID
    - plan_id: Optional filter by plan ID
    - page: Page number (default: 1, minimum: 1)
    - page_size: Number of items per page (default: 20, range: 1-100)
    
    **Response:** Paginated list of all subscriptions with metadata.
    """
)
async def list_all_subscriptions(
    status: Optional[SubscriptionStatus] = Query(None, description="Filter by status"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    plan_id: Optional[str] = Query(None, description="Filter by plan ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    List all VPS subscriptions (all customers, filtered).
    
    Args:
        status: Optional subscription status filter
        customer_id: Optional customer ID filter
        plan_id: Optional plan ID filter
        page: Page number (starts at 1)
        page_size: Number of items per page (1-100)
        db: Database session
        current_user: Authenticated user (requires hosting:admin permission)
    
    Returns:
        Paginated list of all subscriptions
    
    Raises:
        403: If user lacks hosting:admin permission
    """
    repo = VPSSubscriptionRepository(db)
    skip = (page - 1) * page_size
    
    subscriptions, total = await repo.get_all(
        skip=skip,
        limit=page_size,
        customer_id=customer_id,
        plan_id=plan_id,
        status=status
    )
    
    total_pages = (total + page_size - 1) // page_size
    
    return VPSSubscriptionListResponse(
        items=[VPSSubscriptionResponse.model_validate(sub) for sub in subscriptions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/subscriptions/{subscription_id}",
    response_model=VPSSubscriptionDetailResponse,
    summary="Get Subscription Details (Admin)",
    description="""
    Retrieve detailed subscription information (admin view).
    
    Admin-only endpoint that returns complete subscription details including sensitive
    information like container credentials, IP addresses, and full timeline. This endpoint
    can access any subscription regardless of customer ownership.
    
    **Permissions Required:** `hosting:admin`
    
    **Response:** Detailed subscription object with container, plan, metrics, and timeline.
    """
)
async def get_subscription_admin(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Get full subscription details (admin view, includes sensitive data).
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:admin permission)
    
    Returns:
        Detailed subscription object with all information
    
    Raises:
        404: If subscription not found
        403: If user lacks hosting:admin permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Get timeline
    from app.modules.hosting.repository import SubscriptionTimelineRepository
    from app.modules.hosting.schemas import SubscriptionTimelineResponse, ContainerMetricsResponse
    timeline_repo = SubscriptionTimelineRepository(db)
    timeline_events = await timeline_repo.get_by_subscription_id(subscription_id, limit=100)
    
    # Get recent metrics
    metrics_repo = ContainerMetricsRepository(db)
    recent_metrics = await metrics_repo.get_recent_metrics(subscription_id, hours=24)
    recent_metrics_response = [ContainerMetricsResponse.model_validate(m) for m in recent_metrics] if recent_metrics else []
    
    # Build response
    response = VPSSubscriptionDetailResponse.model_validate(subscription)
    response.timeline = [SubscriptionTimelineResponse.model_validate(e) for e in timeline_events]
    response.recent_metrics = recent_metrics_response
    
    return response


@router.get(
    "/subscriptions/{subscription_id}/logs/stream",
    summary="Stream VPS Container Logs (Admin, SSE)",
    description="""
    Stream VPS container logs in real-time using Server-Sent Events (SSE).

    Admin-only endpoint: can access any subscription.

    **Permissions Required:** `hosting:admin`
    """
)
async def stream_subscription_logs_admin(
    subscription_id: str,
    tail: int = Query(100, ge=1, le=1000, description="Number of initial log lines"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)

    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")

    docker_service = DockerManagementService(db)
    container_id = subscription.container.container_id

    def event_stream():
        import time

        # Always yield the open event first to ensure a response is returned
        try:
            yield "event: open\ndata: connected\n\n"
        except GeneratorExit:
            logger.info(f"Client disconnected during open event for container {container_id}")
            raise

        try:
            if not docker_service.docker_available:
                yield f"event: error\ndata: {json.dumps({'error': 'Docker not available'})}\n\n"
                return

            last_activity = time.time()
            keepalive_interval = 15  # Send keepalive every 15 seconds

            # Use a non-blocking approach to iterate logs
            log_iterator = docker_service.iter_container_logs(container_id, tail=tail)

            while True:
                try:
                    # Try to get next log chunk with a timeout mechanism
                    chunk = next(log_iterator)

                    if chunk:
                        last_activity = time.time()
                        for line in chunk.splitlines():
                            if line:
                                try:
                                    # Properly escape the line for SSE
                                    escaped_line = line.replace('\r', '').strip()
                                    if escaped_line:
                                        yield f"data: {escaped_line}\n\n"
                                except GeneratorExit:
                                    logger.info(f"Client disconnected while streaming logs for container {container_id}")
                                    raise

                    # Send keepalive if no activity for a while
                    if time.time() - last_activity > keepalive_interval:
                        try:
                            yield ": keepalive\n\n"
                            last_activity = time.time()
                        except GeneratorExit:
                            logger.info(f"Client disconnected during keepalive for container {container_id}")
                            raise

                except StopIteration:
                    # Logs stream ended - send close event and exit gracefully
                    logger.info(f"Log stream ended for container {container_id}")
                    try:
                        yield "event: close\ndata: stream_ended\n\n"
                    except GeneratorExit:
                        pass
                    break
                except GeneratorExit:
                    # Client disconnected - let it propagate for proper cleanup
                    raise
                except Exception as chunk_error:
                    logger.error(f"Error processing log chunk for container {container_id}: {chunk_error}")
                    # Continue streaming despite chunk errors
                    continue

        except GeneratorExit:
            # Client disconnected - let it propagate for proper cleanup
            logger.info(f"Client disconnected, cleaning up log stream for container {container_id}")
            raise
        except Exception as e:
            logger.error(f"Error streaming logs for container {container_id}: {e}", exc_info=True)
            try:
                payload = json.dumps({"error": str(e)})
                yield f"event: error\ndata: {payload}\n\n"
            except GeneratorExit:
                raise
            except Exception as final_error:
                logger.error(f"Failed to send error event: {final_error}")
                pass  # Ignore other errors when client has disconnected

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/subscriptions/{subscription_id}/stats",
    summary="Get VPS Container Stats (Admin)",
    description="""
    Get real-time Docker stats + history for a subscription (admin view).

    **Permissions Required:** `hosting:admin`
    """
)
async def get_subscription_stats_admin(
    subscription_id: str,
    hours: int = Query(24, ge=1, le=168, description="Hours of history to retrieve"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)

    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")

    monitoring_service = ContainerMonitoringService(db)
    current_stats = await monitoring_service.get_real_time_stats(subscription.container.id)
    history = await monitoring_service.get_metrics_history(subscription_id, hours)

    from app.modules.hosting.schemas import ContainerMetricsResponse, ContainerStatsResponse

    history_response = [ContainerMetricsResponse.model_validate(m) for m in history] if history else []
    return ContainerStatsResponse(current=current_stats, history=history_response)


@router.post(
    "/subscriptions/{subscription_id}/download-image",
    summary="Download VPS OS Image (Admin)",
    description="""
    Start the OS image download phase (Docker pull) for a subscription.

    **Permissions Required:** `hosting:admin`
    """
)
async def download_subscription_image_admin(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    # Mark phase and kick task
    subscription.status = SubscriptionStatus.DOWNLOADING_IMAGE
    subscription.image_download_status = "QUEUED"
    subscription.image_download_progress = 0
    subscription.image_download_updated_at = datetime.utcnow()
    await repo.update(subscription)
    await db.commit()

    from app.modules.hosting.tasks import download_vps_image_async
    task = download_vps_image_async.delay(str(subscription.id))

    return {"status": "started", "task_id": task.id}


@router.get(
    "/subscriptions/{subscription_id}/download-status",
    summary="Get VPS OS Image Download Status (Admin)",
    description="""
    Fetch current download phase status/progress/log tail for a subscription.

    **Permissions Required:** `hosting:admin`
    """
)
async def get_subscription_download_status_admin(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    logs = getattr(subscription, "image_download_logs", None) or ""
    # Return last 200 lines max to keep payload small
    tail = "\n".join(logs.splitlines()[-200:]) if logs else ""

    return {
        "subscription_id": subscription_id,
        "status": subscription.status.value,
        "download_status": getattr(subscription, "image_download_status", None),
        "progress": int(getattr(subscription, "image_download_progress", 0) or 0),
        "updated_at": getattr(subscription, "image_download_updated_at", None),
        "logs": tail,
        "os_distro_id": getattr(subscription, "os_distro_id", None),
        "os_docker_image": getattr(subscription, "os_docker_image", None),
    }


# ============================================================================
# Command Execution Endpoints
# ============================================================================

class ExecCommandRequest(BaseModel):
    """Schema for executing a command in VPS container."""
    command: str = Field(..., min_length=1, max_length=1000, description="Command to execute")
    tty: bool = Field(default=False, description="Allocate pseudo-TTY for interactive commands")


@router.post(
    "/subscriptions/{subscription_id}/exec",
    summary="Execute Command in VPS Container (Admin)",
    description="""
    Execute a command in the VPS container and return output.
    
    **Permissions Required:** `hosting:admin`
    
    **Security Note:** Commands are executed as root. Use with caution.
    """
)
async def exec_container_command_admin(
    subscription_id: str,
    request: ExecCommandRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """Execute command in VPS container."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    docker_service = DockerManagementService(db)
    result = await docker_service.exec_command(
        container_id=subscription.container.container_id,
        command=request.command,
        tty=request.tty
    )
    
    if result is None:
        raise BadRequestException("Failed to execute command. Docker may not be available.")
    
    return {
        "subscription_id": subscription_id,
        "command": request.command,
        "exit_code": result.get("exit_code", -1),
        "output": result.get("output", ""),
        "executed_at": datetime.utcnow().isoformat()
    }


@router.get(
    "/subscriptions/{subscription_id}/exec/stream",
    summary="Stream Command Execution Output (Admin)",
    description="""
    Execute a command in the VPS container and stream output via SSE.
    
    **Permissions Required:** `hosting:admin`
    
    **Query Parameters:**
    - command: Command to execute (required)
    - tty: Allocate pseudo-TTY (default: false)
    
    **Use Case:** For long-running commands or interactive terminal sessions.
    """
)
async def stream_exec_command_admin(
    subscription_id: str,
    command: str = Query(..., min_length=1, max_length=1000, description="Command to execute"),
    tty: bool = Query(False, description="Allocate pseudo-TTY"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """Stream command execution output."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    docker_service = DockerManagementService(db)
    container_id = subscription.container.container_id
    
    def event_stream():
        # Always yield the open event first to ensure a response is returned
        try:
            yield "event: open\ndata: connected\n\n"
        except GeneratorExit:
            raise
        
        try:
            if not docker_service.docker_available:
                yield f"event: error\ndata: {json.dumps({'error': 'Docker not available'})}\n\n"
                return
            
            output_gen = docker_service.exec_command_stream(
                container_id=container_id,
                command=command,
                tty=tty
            )
            
            for chunk in output_gen:
                if chunk:
                    # Escape newlines for SSE
                    escaped = chunk.replace('\n', '\\n').replace('\r', '\\r')
                    try:
                        yield f"data: {escaped}\n\n"
                    except GeneratorExit:
                        raise
            
            try:
                yield "event: close\ndata: command_completed\n\n"
            except GeneratorExit:
                raise
        except GeneratorExit:
            # Client disconnected - let it propagate for proper cleanup
            raise
        except Exception as e:
            logger.error(f"Error executing command in container {container_id}: {e}")
            try:
                payload = json.dumps({"error": str(e)})
                yield f"event: error\ndata: {payload}\n\n"
            except GeneratorExit:
                raise
            except:
                pass  # Ignore other errors when client has disconnected
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ============================================================================
# File Deployment Endpoints
# ============================================================================

@router.post(
    "/subscriptions/{subscription_id}/deploy/files",
    summary="Deploy Files to VPS Container (Admin)",
    description="""
    Upload and deploy project files directly to the VPS container's /data directory.
    
    **Permissions Required:** `hosting:admin`
    
    **Process:**
    1. Upload archive (zip, tar, tar.gz)
    2. Extract archive
    3. Copy files to container's /data directory
    
    **File Size Limit:** 500 MB
    """
)
async def deploy_files_to_container_admin(
    subscription_id: str,
    file: UploadFile = File(..., description="Project archive (zip, tar, tar.gz)"),
    target_path: str = Form("/data", description="Target directory in container"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """Deploy files directly to VPS container."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    # Validate file type
    filename = file.filename or "archive"
    allowed_extensions = ['.zip', '.tar', '.gz', '.tar.gz']
    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        raise BadRequestException(
            f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save uploaded file temporarily
    temp_file = None
    try:
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix)
        
        # Read and save file (with size limit: 500 MB)
        max_size = 500 * 1024 * 1024  # 500 MB
        file_size = 0
        while chunk := await file.read(8192):
            file_size += len(chunk)
            if file_size > max_size:
                raise BadRequestException("File too large. Maximum size: 500 MB")
            temp_file.write(chunk)
        
        temp_file.close()
        
        # Deploy to container
        docker_service = DockerManagementService(db)
        result = await docker_service.deploy_files_to_container(
            container_id=subscription.container.container_id,
            archive_path=temp_file.name,
            target_path=target_path
        )
        
        if not result.get("success"):
            raise BadRequestException(f"Deployment failed: {result.get('error', 'Unknown error')}")
        
        return {
            "subscription_id": subscription_id,
            "success": True,
            "target_path": target_path,
            "files_deployed": result.get("files_deployed", 0),
            "archive_size": file_size,
            "deployed_at": datetime.utcnow().isoformat()
        }
        
    except BadRequestException:
        raise
    except Exception as e:
        logger.error(f"Failed to deploy files to container: {e}", exc_info=True)
        raise BadRequestException(f"Deployment failed: {str(e)}")
    finally:
        # Cleanup temp file
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)


@router.post(
    "/subscriptions/{subscription_id}/deploy/build",
    summary="Trigger Custom Image Build for VPS (Admin)",
    description="""
    Upload project files and trigger Docker image build workflow.
    
    **Permissions Required:** `hosting:admin`
    
    **Process:**
    1. Upload archive containing Dockerfile
    2. Trigger custom image build (async)
    3. Build status can be tracked via custom-images endpoints
    
    This reuses the existing custom image build system.
    """
)
async def trigger_build_deploy_admin(
    subscription_id: str,
    file: UploadFile = File(..., description="Project archive with Dockerfile"),
    image_name: Optional[str] = Form(None, description="Custom image name"),
    image_tag: str = Form("latest", description="Image tag"),
    dockerfile_path: str = Form("Dockerfile", description="Path to Dockerfile in archive"),
    build_args: Optional[str] = Form(None, description="Build arguments as JSON string"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN)),
):
    """Trigger custom Docker image build for VPS."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Reuse existing custom image build service
    from app.modules.hosting.services.image_build_service import DockerImageBuildService
    
    try:
        # Parse build_args from JSON string
        build_args_dict = json.loads(build_args) if build_args else None
        
        # Create build service
        build_service = DockerImageBuildService(db)
        
        # Upload and create record
        image = await build_service.upload_project_files(
            customer_id=subscription.customer_id,
            upload_file=file,
            filename=file.filename or "project.zip",
            subscription_id=subscription.id,
            image_name=image_name,
            image_tag=image_tag,
            dockerfile_path=dockerfile_path,
            build_args=build_args_dict
        )
        
        # Trigger async build via Celery
        from app.modules.hosting.tasks import build_docker_image_task
        build_docker_image_task.delay(str(image.id))
        
        return {
            "subscription_id": subscription_id,
            "image_id": str(image.id),
            "image_name": image.image_name,
            "image_tag": image.image_tag,
            "status": image.status.value,
            "build_triggered_at": datetime.utcnow().isoformat(),
            "message": "Build process started. Check custom-images endpoint for progress."
        }
        
    except ValueError as e:
        raise BadRequestException(str(e))
    except Exception as e:
        logger.error(f"Failed to trigger build deploy: {e}", exc_info=True)
        raise BadRequestException(f"Build deployment failed: {str(e)}")


@router.post(
    "/subscriptions/{subscription_id}/suspend",
    response_model=VPSSubscriptionResponse,
    summary="Suspend Subscription",
    description="""
    Suspend a VPS subscription (admin action).
    
    Suspends the subscription, stops the container, and retains all data. Typically used
    for payment issues or policy violations. The subscription can be reactivated later.
    
    **Permissions Required:** `hosting:admin`
    
    **Request Body:**
    - reason: Reason for suspension (required)
    
    **Response:** Updated subscription with SUSPENDED status.
    
    **Note:** Container data is preserved when suspended.
    """
)
async def suspend_subscription_admin(
    subscription_id: str,
    request: SuspendSubscriptionBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Suspend subscription (admin action).
    
    Args:
        subscription_id: Unique identifier of the subscription
        request: Suspension request body with reason
        db: Database session
        current_user: Authenticated user (requires hosting:admin permission)
    
    Returns:
        Updated subscription with SUSPENDED status
    
    Raises:
        404: If subscription not found
        403: If user lacks hosting:admin permission
    """
    provisioning_service = VPSProvisioningService(db)
    subscription = await provisioning_service.suspend_subscription(
        subscription_id,
        request.reason
    )
    
    return VPSSubscriptionResponse.model_validate(subscription)


@router.post(
    "/subscriptions/{subscription_id}/reactivate",
    response_model=VPSSubscriptionResponse,
    summary="Reactivate Subscription",
    description="""
    Reactivate a suspended VPS subscription.
    
    Reactivates a previously suspended subscription, starts the container, and changes
    status back to ACTIVE. Used when payment issues are resolved or policy violations
    are addressed.
    
    **Permissions Required:** `hosting:admin`
    
    **Response:** Updated subscription with ACTIVE status.
    
    **Note:** Container will be started automatically upon reactivation.
    """
)
async def reactivate_subscription_admin(
    subscription_id: str,
    request: Optional[VPSReactivateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Reactivate suspended subscription (admin action).
    
    Args:
        subscription_id: Unique identifier of the subscription
        request: Optional reactivation request body
        db: Database session
        current_user: Authenticated user (requires hosting:admin permission)
    
    Returns:
        Updated subscription with ACTIVE status
    
    Raises:
        404: If subscription not found
        400: If subscription is not in SUSPENDED status
        403: If user lacks hosting:admin permission
    """
    provisioning_service = VPSProvisioningService(db)
    subscription = await provisioning_service.reactivate_subscription(subscription_id)
    
    return VPSSubscriptionResponse.model_validate(subscription)


@router.delete(
    "/subscriptions/{subscription_id}",
    status_code=status.HTTP_200_OK,
    summary="Terminate Subscription",
    description="""
    Permanently terminate a VPS subscription.
    
    **DESTRUCTIVE OPERATION:** Permanently deletes the subscription, stops and removes
    the container, and optionally deletes all persistent volumes. This action cannot
    be undone. All data will be permanently lost.
    
    **Permissions Required:** `hosting:admin`
    
    **Query Parameters:**
    - remove_volumes: Whether to delete persistent volumes (default: True)
    
    **Response:** Success message with termination status.
    
    **Warning:** This permanently deletes all container data. Use with extreme caution.
    """
)
async def terminate_subscription_admin(
    subscription_id: str,
    remove_volumes: bool = Query(True, description="Remove persistent volumes"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Terminate subscription permanently (delete container + data).
    
    Args:
        subscription_id: Unique identifier of the subscription
        remove_volumes: Whether to delete persistent volumes (default: True)
        db: Database session
        current_user: Authenticated user (requires hosting:admin permission)
    
    Returns:
        Success response with termination status
    
    Raises:
        404: If subscription not found
        403: If user lacks hosting:admin permission
    
    Warning: This operation permanently deletes all data and cannot be undone.
    """
    provisioning_service = VPSProvisioningService(db)
    subscription = await provisioning_service.terminate_subscription(subscription_id)
    
    return {
        "status": "terminated",
        "message": "Subscription terminated and all data deleted",
        "subscription_id": subscription_id
    }


# ============================================================================
# Monitoring
# ============================================================================

@router.get(
    "/monitoring/overview",
    response_model=MonitoringOverviewSchema,
    summary="Get Monitoring Overview",
    description="""
    Retrieve system-wide VPS monitoring metrics.
    
    Returns aggregated metrics across all VPS subscriptions including total subscriptions,
    active containers, monthly revenue, average CPU/memory usage, and active alerts.
    Useful for dashboard displays and system health monitoring.
    
    **Permissions Required:** `hosting:monitor`
    
    **Response:** Monitoring overview with aggregated statistics and alerts.
    """
)
async def get_monitoring_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MONITOR))
):
    """
    Get system-wide VPS metrics.
    
    Args:
        db: Database session
        current_user: Authenticated user (requires hosting:monitor permission)
    
    Returns:
        Monitoring overview with aggregated statistics
    
    Raises:
        403: If user lacks hosting:monitor permission
    """
    repo = VPSSubscriptionRepository(db)
    
    # Total subscriptions
    all_subs, total_subscriptions = await repo.get_all(skip=0, limit=10000)
    
    # Active containers
    active_subs, active_count = await repo.get_all(
        skip=0,
        limit=10000,
        status=SubscriptionStatus.ACTIVE
    )
    
    # Total monthly revenue using RevenueService for consistency
    from app.modules.revenue.service import RevenueService
    revenue_service = RevenueService(db)
    recurring_revenue = await revenue_service.repository.get_recurring_revenue()
    total_monthly_revenue = recurring_revenue
    
    # Average resource usage (from recent metrics)
    metrics_repo = ContainerMetricsRepository(db)
    cutoff_time = datetime.utcnow() - timedelta(hours=1)
    
    # Get recent metrics for all active subscriptions
    all_cpu_values = []
    all_memory_values = []
    all_alerts = []
    
    monitoring_service = ContainerMonitoringService(db)
    
    for sub in active_subs:
        # Get recent metrics
        recent_metrics = await metrics_repo.get_recent_metrics(sub.id, hours=1)
        if recent_metrics:
            all_cpu_values.extend([m.cpu_usage_percent for m in recent_metrics])
            all_memory_values.extend([m.memory_usage_percent for m in recent_metrics])
        
        # Check alerts
        alerts = await monitoring_service.check_resource_alerts(sub.id)
        for alert in alerts:
            alert['subscription_id'] = sub.id
            alert['subscription_number'] = sub.subscription_number
        all_alerts.extend(alerts)
    
    # Calculate averages from all collected values
    avg_cpu = sum(all_cpu_values) / len(all_cpu_values) if all_cpu_values else 0.0
    avg_memory = sum(all_memory_values) / len(all_memory_values) if all_memory_values else 0.0
    
    return MonitoringOverviewSchema(
        total_subscriptions=total_subscriptions,
        active_containers=active_count,
        total_monthly_revenue=float(total_monthly_revenue),  # Convert Decimal to float for JSON
        avg_cpu_usage=round(avg_cpu, 2),
        avg_memory_usage=round(avg_memory, 2),
        alerts=[AlertSchema.model_validate(a) for a in all_alerts]
    )


@router.get(
    "/monitoring/alerts",
    response_model=List[AlertSchema],
    summary="Get Active Alerts",
    description="""
    Retrieve all active resource alerts across all VPS subscriptions.
    
    Returns a list of all active alerts (CPU high, memory high, storage high) detected
    across all active subscriptions. Alerts are checked every 5 minutes. Supports
    filtering by severity level.
    
    **Permissions Required:** `hosting:monitor`
    
    **Query Parameters:**
    - severity: Optional filter by severity (HIGH, CRITICAL)
    
    **Response:** List of alert objects with subscription information.
    """
)
async def get_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity (HIGH, CRITICAL)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MONITOR))
):
    """
    Get active resource alerts.
    
    Args:
        severity: Optional severity filter (HIGH, CRITICAL)
        db: Database session
        current_user: Authenticated user (requires hosting:monitor permission)
    
    Returns:
        List of active alerts with subscription details
    
    Raises:
        403: If user lacks hosting:monitor permission
    """
    repo = VPSSubscriptionRepository(db)
    active_subs, _ = await repo.get_all(
        skip=0,
        limit=10000,
        status=SubscriptionStatus.ACTIVE
    )
    
    monitoring_service = ContainerMonitoringService(db)
    all_alerts = []
    
    for sub in active_subs:
        alerts = await monitoring_service.check_resource_alerts(sub.id)
        for alert in alerts:
            alert['subscription_id'] = sub.id
            alert['subscription_number'] = sub.subscription_number
        all_alerts.extend(alerts)
    
    # Filter by severity if provided
    if severity:
        all_alerts = [a for a in all_alerts if a.get('severity') == severity.upper()]
    
    return [AlertSchema.model_validate(a) for a in all_alerts]


# ============================================================================
# Subscription Creation (Admin)
# ============================================================================

class AdminCreateSubscriptionRequest(BaseModel):
    """Schema for admin creating subscription for a customer."""
    customer_id: str = Field(..., description="Customer ID to create subscription for")
    plan_id: str = Field(..., description="VPS plan ID")
    os_distro_id: Optional[str] = Field(default="ubuntu-22.04", description="Selected OS distro ID")


@router.post(
    "/subscriptions/create",
    response_model=VPSSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Subscription (Admin)",
    description="""
    Create a new VPS subscription for any customer (admin only).
    
    Creates a subscription in PENDING status that can be immediately approved.
    This endpoint allows admins to create subscriptions on behalf of customers.
    
    **Permissions Required:** `hosting:admin`
    
    **Request Body:**
    - customer_id: ID of the customer to create subscription for (required)
    - plan_id: ID of the VPS plan (required)
    
    **Response:** Created subscription with PENDING status.
    
    **Note:** The subscription will need to be approved before provisioning begins.
    """
)
async def create_subscription_admin(
    request: AdminCreateSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_ADMIN))
):
    """
    Create VPS subscription for a customer (admin action).
    
    Args:
        request: Request body with customer_id and plan_id
        db: Database session
        current_user: Authenticated user (requires hosting:admin permission)
    
    Returns:
        Created subscription with PENDING status
    
    Raises:
        404: If customer or plan not found
        400: If plan is inactive
        403: If user lacks hosting:admin permission
    """
    provisioning_service = VPSProvisioningService(db)
    quote = await provisioning_service.request_vps(request.customer_id, request.plan_id, os_distro_id=request.os_distro_id)
    
    # Get the subscription that was created
    repo = VPSSubscriptionRepository(db)
    subscriptions, _ = await repo.get_all(
        skip=0,
        limit=1,
        customer_id=request.customer_id,
        plan_id=request.plan_id
    )
    
    if not subscriptions:
        raise NotFoundException("Subscription was not created")
    
    # Get the most recent subscription (should be the one we just created)
    subscription = subscriptions[0]
    
    return VPSSubscriptionResponse.model_validate(subscription)


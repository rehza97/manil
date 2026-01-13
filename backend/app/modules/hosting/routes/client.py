"""
VPS Hosting Client API routes.

Customer-facing endpoints for managing VPS subscriptions.
"""
from typing import Optional, List, AsyncGenerator
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse
from pydantic import BaseModel, Field
import json
import tempfile
import os
from pathlib import Path
import asyncio
import threading

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.core.exceptions import NotFoundException, BadRequestException
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.hosting.models import (
    VPSPlan,
    VPSSubscription,
    ContainerInstance,
    SubscriptionStatus,
    ContainerStatus,
    SubscriptionTimeline
)
from app.modules.hosting.repository import (
    VPSPlanRepository,
    VPSSubscriptionRepository,
    SubscriptionTimelineRepository
)
from app.modules.hosting.services import (
    VPSProvisioningService,
    ContainerMonitoringService,
    DockerManagementService
)
from app.modules.hosting.schemas import (
    VPSPlanResponse,
    VPSSubscriptionResponse,
    VPSSubscriptionDetailResponse,
    VPSSubscriptionListResponse,
    CreateVPSRequestBody,
    UpgradeSubscriptionBody,
    CancelSubscriptionBody,
    ContainerActionResponse,
    ContainerStatsResponse,
    SubscriptionTimelineResponse,
    UpgradeResponseSchema,
    ContainerCredentialsResponse
)
from app.modules.quotes.schemas import QuoteResponse

router = APIRouter(prefix="/api/v1/hosting", tags=["VPS Hosting - Client"])


# ============================================================================
# VPS Plans
# ============================================================================

@router.get(
    "/plans",
    response_model=List[VPSPlanResponse],
    summary="List VPS Plans",
    description="""
    Retrieve all available VPS hosting plans.
    
    Returns a list of VPS plans that customers can subscribe to. Only active plans are returned by default.
    
    **Permissions Required:** `hosting:view`
    
    **Response:** List of VPS plan objects with pricing, specifications, and features.
    """
)
async def list_vps_plans(
    is_active: bool = Query(True, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    List all available VPS hosting plans.
    
    Args:
        is_active: Filter to show only active plans (default: True)
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        List of VPS plan objects
    
    Raises:
        403: If user lacks hosting:view permission
    """
    repo = VPSPlanRepository(db)
    plans, total = await repo.get_all(skip=0, limit=100, is_active=is_active)
    return plans


@router.get(
    "/plans/{plan_id}",
    response_model=VPSPlanResponse,
    summary="Get VPS Plan Details",
    description="""
    Retrieve detailed information about a specific VPS hosting plan.
    
    Returns complete plan specifications including CPU, RAM, storage, bandwidth, pricing, and features.
    
    **Permissions Required:** `hosting:view`
    
    **Response:** VPS plan object with all details.
    """
)
async def get_vps_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    Get details of a specific VPS plan.
    
    Args:
        plan_id: Unique identifier of the VPS plan
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        VPS plan object with complete details
    
    Raises:
        404: If plan not found
        403: If user lacks hosting:view permission
    """
    repo = VPSPlanRepository(db)
    plan = await repo.get_by_id(plan_id)
    if not plan:
        raise NotFoundException(f"VPS plan {plan_id} not found")
    return plan


# ============================================================================
# VPS Subscriptions
# ============================================================================

@router.post(
    "/subscriptions/request",
    response_model=QuoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request New VPS",
    description="""
    Request a new VPS subscription.
    
    Creates a quote for the requested VPS plan and a pending subscription that requires admin approval.
    The quote includes setup fee and first month's subscription cost.
    
    **Permissions Required:** `hosting:request`
    
    **Request Body:**
    - plan_id: ID of the VPS plan to request
    
    **Response:** Quote object with pricing details and status PENDING.
    
    **Next Steps:** Admin must approve the request to trigger VPS provisioning.
    """
)
async def request_vps(
    request: CreateVPSRequestBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_REQUEST))
):
    """
    Request a new VPS (creates quote for admin approval).
    
    Args:
        request: VPS request body containing plan_id
        db: Database session
        current_user: Authenticated user (requires hosting:request permission)
    
    Returns:
        Quote object with pricing and status
    
    Raises:
        400: If plan_id is invalid or plan not found
        403: If user lacks hosting:request permission
    """
    provisioning_service = VPSProvisioningService(db)
    quote = await provisioning_service.request_vps(current_user.id, request.plan_id)
    return quote


@router.get(
    "/subscriptions",
    response_model=VPSSubscriptionListResponse,
    summary="List My VPS Subscriptions",
    description="""
    Retrieve paginated list of the current user's VPS subscriptions.
    
    Returns only subscriptions belonging to the authenticated user. Supports filtering by status
    and pagination for large result sets.
    
    **Permissions Required:** `hosting:view`
    
    **Query Parameters:**
    - status: Optional filter by subscription status (PENDING, ACTIVE, SUSPENDED, etc.)
    - page: Page number (default: 1, minimum: 1)
    - page_size: Number of items per page (default: 20, range: 1-100)
    
    **Response:** Paginated list with items, total count, and pagination metadata.
    """
)
async def list_my_subscriptions(
    status: Optional[SubscriptionStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    List my VPS subscriptions (filtered by customer).
    
    Args:
        status: Optional subscription status filter
        page: Page number (starts at 1)
        page_size: Number of items per page (1-100)
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        Paginated list of subscriptions with metadata
    
    Raises:
        400: If page or page_size validation fails
        403: If user lacks hosting:view permission
    """
    repo = VPSSubscriptionRepository(db)
    skip = (page - 1) * page_size
    
    subscriptions, total = await repo.get_all(
        skip=skip,
        limit=page_size,
        customer_id=current_user.id,
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
    summary="Get Subscription Details",
    description="""
    Retrieve detailed information about a specific VPS subscription.
    
    Returns complete subscription details including container information, plan details,
    recent metrics (24 hours), and timeline events. Only accessible by the subscription owner.
    
    **Permissions Required:** `hosting:view`
    
    **Security:** Users can only access their own subscriptions. Attempting to access another
    user's subscription will return 404 (not found) to prevent information disclosure.
    
    **Response:** Detailed subscription object with container, plan, metrics, and timeline.
    """
)
async def get_subscription_details(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    Get detailed subscription info (includes container, plan, metrics).
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        Detailed subscription object with container, metrics, and timeline
    
    Raises:
        404: If subscription not found or doesn't belong to user
        403: If user lacks hosting:view permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Get timeline
    timeline_repo = SubscriptionTimelineRepository(db)
    timeline_events = await timeline_repo.get_by_subscription_id(subscription_id, limit=50)
    
    # Get recent metrics
    from app.modules.hosting.repository import ContainerMetricsRepository
    from app.modules.hosting.schemas import ContainerMetricsResponse
    metrics_repo = ContainerMetricsRepository(db)
    recent_metrics = await metrics_repo.get_recent_metrics(subscription_id, hours=24)
    recent_metrics_response = [ContainerMetricsResponse.model_validate(m) for m in recent_metrics] if recent_metrics else []
    
    # Build response
    response = VPSSubscriptionDetailResponse.model_validate(subscription)
    response.timeline = [SubscriptionTimelineResponse.model_validate(e) for e in timeline_events]
    response.recent_metrics = recent_metrics_response
    
    return response


@router.get(
    "/instances/{subscription_id}/credentials",
    response_model=ContainerCredentialsResponse,
    summary="Get Container Credentials",
    description="""
    Retrieve SSH credentials for the VPS container including decrypted root password.
    
    Returns complete connection information including IP address, SSH port, hostname,
    and the decrypted root password. Only accessible by the subscription owner.
    
    **Permissions Required:** `hosting:view`
    
    **Security:** Users can only access credentials for their own subscriptions.
    
    **Response:** Container credentials with decrypted password and SSH connection string.
    """
)
async def get_container_credentials(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    Get container SSH credentials including decrypted password.
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        Container credentials with decrypted password
    
    Raises:
        404: If subscription not found or doesn't belong to user
        403: If user lacks hosting:view permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    # Decrypt password
    docker_service = DockerManagementService(db)
    try:
        decrypted_password = docker_service.decrypt_password(subscription.container.root_password)
    except ValueError as e:
        # Password decryption failed (likely due to encryption key change)
        raise BadRequestException(
            "Unable to retrieve password. The encryption key may have changed. "
            "Please contact support or reset the password through SSH."
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error decrypting password for subscription {subscription_id}: {e}")
        raise BadRequestException(
            "Unable to retrieve password due to an encryption error. Please contact support."
        ) from e
    
    ssh_connection_string = f"ssh root@{subscription.container.ip_address} -p {subscription.container.ssh_port}"
    
    return ContainerCredentialsResponse(
        ip_address=subscription.container.ip_address,
        ssh_port=subscription.container.ssh_port,
        hostname=subscription.container.hostname,
        root_password=decrypted_password,
        ssh_connection_string=ssh_connection_string
    )


@router.post(
    "/subscriptions/{subscription_id}/upgrade",
    response_model=UpgradeResponseSchema,
    summary="Upgrade Subscription Plan",
    description="""
    Upgrade VPS subscription to a higher-tier plan.
    
    Upgrades the subscription to a new plan with more resources. The upgrade is pro-rated,
    meaning you only pay the difference for the remaining days in the current billing cycle.
    A pro-rated invoice is automatically generated.
    
    **Permissions Required:** `hosting:upgrade`
    
    **Request Body:**
    - new_plan_id: ID of the target plan (must be higher tier)
    
    **Response:** Updated subscription and pro-rated amount charged.
    
    **Note:** Downgrades are not allowed mid-cycle. Cancel and create a new subscription instead.
    """
)
async def upgrade_subscription(
    subscription_id: str,
    request: UpgradeSubscriptionBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_UPGRADE))
):
    """
    Upgrade to higher-tier plan (pro-rated billing).
    
    Args:
        subscription_id: Unique identifier of the subscription
        request: Upgrade request body containing new_plan_id
        db: Database session
        current_user: Authenticated user (requires hosting:upgrade permission)
    
    Returns:
        Upgrade response with updated subscription and pro-rated amount
    
    Raises:
        404: If subscription not found or doesn't belong to user
        400: If new plan is not higher tier or invalid
        403: If user lacks hosting:upgrade permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    provisioning_service = VPSProvisioningService(db)
    updated_subscription = await provisioning_service.upgrade_subscription(
        subscription_id,
        request.new_plan_id
    )
    
    # Get pro-rated amount
    from app.modules.hosting.services import SubscriptionBillingService
    billing_service = SubscriptionBillingService(db)
    prorated_amount = await billing_service.calculate_prorated_amount(
        updated_subscription,
        updated_subscription.plan
    )
    
    return UpgradeResponseSchema(
        subscription=VPSSubscriptionResponse.model_validate(updated_subscription),
        prorated_amount=prorated_amount,
        message="Upgrade successful. Pro-rated invoice generated."
    )


@router.post(
    "/subscriptions/{subscription_id}/cancel",
    response_model=VPSSubscriptionResponse,
    summary="Cancel Subscription",
    description="""
    Cancel a VPS subscription.
    
    Cancels the subscription either immediately (terminates container and deletes data) or
    at the end of the current billing period (container remains active until then).
    
    **Permissions Required:** `hosting:manage`
    
    **Request Body:**
    - immediate: If true, terminate immediately. If false, cancel at end of billing period.
    - reason: Cancellation reason (required)
    
    **Response:** Updated subscription with CANCELLED status.
    
    **Warning:** Immediate cancellation permanently deletes all container data.
    """
)
async def cancel_subscription(
    subscription_id: str,
    request: CancelSubscriptionBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE))
):
    """
    Cancel subscription (immediate or end of billing period).
    
    Args:
        subscription_id: Unique identifier of the subscription
        request: Cancellation request with immediate flag and reason
        db: Database session
        current_user: Authenticated user (requires hosting:manage permission)
    
    Returns:
        Updated subscription object with CANCELLED status
    
    Raises:
        404: If subscription not found or doesn't belong to user
        403: If user lacks hosting:manage permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    provisioning_service = VPSProvisioningService(db)
    updated_subscription = await provisioning_service.cancel_subscription(
        subscription_id,
        request.immediate,
        request.reason
    )
    
    return VPSSubscriptionResponse.model_validate(updated_subscription)


# ============================================================================
# Container Control
# ============================================================================

@router.post(
    "/instances/{subscription_id}/start",
    response_model=ContainerActionResponse,
    summary="Start Container",
    description="""
    Start a stopped VPS container.
    
    Starts the Docker container associated with the subscription. The container must be in
    STOPPED status. After starting, the container status changes to RUNNING.
    
    **Permissions Required:** `hosting:manage`
    
    **Response:** Action response with success status and container state.
    
    **Note:** Container must be stopped before it can be started.
    """
)
async def start_container(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE))
):
    """
    Start stopped container.
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:manage permission)
    
    Returns:
        Action response with success status and container state
    
    Raises:
        404: If subscription or container not found
        400: If container is already running or in invalid state
        403: If user lacks hosting:manage permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    provisioning_service = VPSProvisioningService(db)
    container = await provisioning_service.start_container(subscription_id)
    
    return ContainerActionResponse(
        success=True,
        message="Container started successfully",
        container_status=container.status,
        action_timestamp=datetime.utcnow()
    )


@router.post(
    "/instances/{subscription_id}/stop",
    response_model=ContainerActionResponse,
    summary="Stop Container",
    description="""
    Stop a running VPS container.
    
    Gracefully stops the Docker container associated with the subscription. The container must
    be in RUNNING status. Data is retained and the container can be started again later.
    
    **Permissions Required:** `hosting:manage`
    
    **Response:** Action response with success status and container state.
    
    **Note:** Container data is preserved when stopped.
    """
)
async def stop_container(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE))
):
    """
    Stop running container.
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:manage permission)
    
    Returns:
        Action response with success status and container state
    
    Raises:
        404: If subscription or container not found
        400: If container is already stopped or in invalid state
        403: If user lacks hosting:manage permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    provisioning_service = VPSProvisioningService(db)
    container = await provisioning_service.stop_container(subscription_id)
    
    return ContainerActionResponse(
        success=True,
        message="Container stopped successfully",
        container_status=container.status,
        action_timestamp=datetime.utcnow()
    )


@router.post(
    "/instances/{subscription_id}/reboot",
    response_model=ContainerActionResponse,
    summary="Reboot Container",
    description="""
    Reboot a running VPS container.
    
    Restarts the Docker container associated with the subscription. The container must be in
    RUNNING status. This performs a graceful restart (stop + start).
    
    **Permissions Required:** `hosting:manage`
    
    **Response:** Action response with success status and container state.
    
    **Note:** Container will be briefly unavailable during reboot (typically 10-30 seconds).
    """
)
async def reboot_container(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE))
):
    """
    Reboot container.
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:manage permission)
    
    Returns:
        Action response with success status and container state
    
    Raises:
        404: If subscription or container not found
        400: If container is not running or in invalid state
        403: If user lacks hosting:manage permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    provisioning_service = VPSProvisioningService(db)
    container = await provisioning_service.reboot_container(subscription_id)
    
    return ContainerActionResponse(
        success=True,
        message="Container rebooted successfully",
        container_status=container.status,
        action_timestamp=datetime.utcnow()
    )


# ============================================================================
# Command Execution
# ============================================================================

class ExecCommandRequest(BaseModel):
    """Schema for executing a command in VPS container."""
    command: str = Field(..., min_length=1, max_length=1000, description="Command to execute")
    tty: bool = Field(default=False, description="Allocate pseudo-TTY for interactive commands")


@router.post(
    "/instances/{subscription_id}/exec",
    summary="Execute Command in VPS Container",
    description="""
    Execute a command in the VPS container and return output.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only execute commands on their own VPS instances.
    
    **Security Note:** Commands are executed as root. Use with caution.
    """
)
async def exec_container_command(
    subscription_id: str,
    request: ExecCommandRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Execute command in VPS container (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
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
    "/instances/{subscription_id}/exec/stream",
    summary="Stream Command Execution Output",
    description="""
    Execute a command in the VPS container and stream output via SSE.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only execute commands on their own VPS instances.
    
    **Query Parameters:**
    - command: Command to execute (required)
    - tty: Allocate pseudo-TTY (default: false)
    
    **Use Case:** For long-running commands or interactive terminal sessions.
    """
)
async def stream_exec_command(
    subscription_id: str,
    command: str = Query(..., min_length=1, max_length=1000, description="Command to execute"),
    tty: bool = Query(False, description="Allocate pseudo-TTY"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Stream command execution output (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
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
            logger.info(f"Client disconnected during exec stream for container {container_id}")
            raise
        except Exception as e:
            logger.error(f"Error executing command in container {container_id}: {e}", exc_info=True)
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
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/instances/{subscription_id}/terminal")
async def websocket_terminal(
    websocket: WebSocket,
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for interactive terminal session.
    
    Provides bidirectional terminal communication:
    - Client sends: keystrokes/input
    - Server sends: command output
    
    Query params:
    - token: JWT authentication token
    """
    def _extract_bearer_token(authorization: str | None) -> str | None:
        if not authorization:
            return None
        parts = authorization.split(" ", 1)
        if len(parts) != 2:
            return None
        scheme, token_val = parts[0].strip(), parts[1].strip()
        if scheme.lower() != "bearer" or not token_val:
            return None
        return token_val

    await websocket.accept()

    try:
        # Token can be passed via query param (browser-friendly) or Authorization header (non-browser clients)
        token = websocket.query_params.get("token") or _extract_bearer_token(websocket.headers.get("authorization"))
        if not token:
            await websocket.close(code=1008, reason="Authentication required")
            return
        
        # Verify token and get user
        from app.core.security import decode_token
        from app.modules.auth.repository import UserRepository
        
        payload = decode_token(token)
        if not payload:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(user_id)
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        # Get subscription and verify ownership
        repo = VPSSubscriptionRepository(db)
        subscription = await repo.get_by_id(subscription_id)
        
        if not subscription:
            await websocket.close(code=1008, reason="Subscription not found")
            return
        
        if subscription.customer_id != user.id:
            await websocket.close(code=1008, reason="Access denied")
            return
        
        if not subscription.container:
            await websocket.close(code=1008, reason="Container not found")
            return
        
        docker_service = DockerManagementService(db)
        container_id = subscription.container.container_id
        
        if not docker_service.docker_available:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Docker not available"
            }))
            await websocket.close()
            return
        
        # Get container and create exec instance
        container = docker_service.client.containers.get(container_id)
        logger.info(f"[Terminal WS] Container {container_id} retrieved successfully")

        # Create interactive shell session (docker-py Container does not expose exec_create/exec_start)
        # Use exec_run with socket=True to get a raw socket for bidirectional I/O.
        logger.debug(f"[Terminal WS] Creating interactive bash session in container")
        exec_result = container.exec_run(
            cmd="/bin/bash -i",
            tty=True,
            stdin=True,
            socket=True,
            environment={"TERM": "xterm-256color"},
            user="root",
        )
        exec_socket = getattr(exec_result, "output", exec_result)
        logger.info(f"[Terminal WS] Interactive bash session created, exec_socket type: {type(exec_socket)}")
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "output",
            "data": "\r\n\x1b[32mConnected to VPS Terminal\x1b[0m\r\n"
        }))
        
        # Queues for communication
        input_queue = asyncio.Queue()
        output_queue = asyncio.Queue()
        stop_event = threading.Event()
        loop = asyncio.get_running_loop()
        
        # Get the actual socket from the exec_socket object
        docker_sock = exec_socket._sock if hasattr(exec_socket, "_sock") else exec_socket
        logger.info(f"[Terminal WS] Docker socket acquired for subscription {subscription_id}, type: {type(docker_sock)}")

        # Thread to read from Docker exec socket
        def read_from_docker():
            try:
                logger.info(f"[Terminal WS] Read thread started for subscription {subscription_id}")
                while not stop_event.is_set():
                    try:
                        # Read from socket (non-blocking with timeout)
                        docker_sock.settimeout(0.1)
                        chunk = docker_sock.recv(4096)
                        if chunk == b"":
                            logger.info(f"[Terminal WS] Socket closed (received empty chunk)")
                            break  # socket closed
                        if chunk:
                            logger.info(f"[Terminal WS] Received from Docker: {len(chunk)} bytes")
                            asyncio.run_coroutine_threadsafe(output_queue.put(chunk), loop)
                    except Exception as e:
                        # Timeout or other error - check if we should continue
                        if stop_event.is_set():
                            break
                        if "timed out" not in str(e).lower():
                            logger.debug(f"[Terminal WS] Socket read: {e}")
                        continue
            except Exception as e:
                logger.error(f"[Terminal WS] Error reading from Docker: {e}", exc_info=True)
            finally:
                logger.debug(f"[Terminal WS] Read thread ending, signaling output queue")
                asyncio.run_coroutine_threadsafe(output_queue.put(None), loop)  # Signal end
        
        # Thread to write to Docker exec socket
        def write_to_docker():
            import concurrent.futures
            import socket as socket_module
            import time

            # Helper async function to try getting from queue
            async def try_get_nowait():
                return input_queue.get_nowait()

            try:
                logger.info(f"[Terminal WS] Write thread started for subscription {subscription_id}")
                iteration = 0
                while not stop_event.is_set():
                    iteration += 1
                    if iteration % 1000 == 0:  # Log every 1000 iterations to avoid spam
                        logger.info(f"[Terminal WS] Write thread loop iteration {iteration}, queue size: {input_queue.qsize()}")
                    try:
                        # Use get_nowait to avoid leaving dangling coroutines
                        fut = asyncio.run_coroutine_threadsafe(try_get_nowait(), loop)
                        data = fut.result(timeout=0.05)
                        if data is None:
                            logger.info(f"[Terminal WS] Received None, exiting write thread")
                            break
                        logger.info(f"[Terminal WS] ✓ Got data from queue: {repr(data[:50])}, sending to Docker...")
                        # Set a timeout for the send operation to prevent blocking indefinitely
                        docker_sock.settimeout(5.0)
                        docker_sock.sendall(data)
                        logger.info(f"[Terminal WS] ✓ Data sent to Docker successfully")
                    except asyncio.QueueEmpty:
                        # Normal - queue is empty, sleep briefly to avoid busy-waiting
                        time.sleep(0.01)
                        continue
                    except concurrent.futures.TimeoutError:
                        # Shouldn't happen with get_nowait, but handle it
                        logger.warning(f"[Terminal WS] Future timeout on get_nowait (unexpected)")
                        continue
                    except socket_module.timeout:
                        logger.warning(f"[Terminal WS] Socket send timeout, continuing...")
                        continue
                    except Exception as e:
                        if not stop_event.is_set():
                            logger.error(f"[Terminal WS] Error writing to Docker: {e}", exc_info=True)
                        break
                logger.info(f"[Terminal WS] Write thread exiting after {iteration} iterations")
            except Exception as e:
                logger.error(f"[Terminal WS] Fatal error in write thread: {e}", exc_info=True)
        
        # Start threads
        read_thread = threading.Thread(target=read_from_docker, daemon=True)
        write_thread = threading.Thread(target=write_to_docker, daemon=True)
        read_thread.start()
        write_thread.start()
        logger.info(f"[Terminal WS] Read and write threads started for subscription {subscription_id}")

        # Give threads a moment to initialize
        await asyncio.sleep(0.1)

        # Trigger initial prompt/output (bash often won't print until it receives input)
        # Send this AFTER threads are started so the read thread can capture the response
        try:
            logger.debug(f"[Terminal WS] Sending initial newline to trigger bash prompt")
            await input_queue.put(b"\n")
            logger.debug(f"[Terminal WS] Initial newline queued for Docker")
        except Exception as e:
            logger.warning(f"[Terminal WS] Failed to queue initial newline: {e}")

        # Handle output from Docker
        async def handle_output():
            logger.info(f"[Terminal WS] Output handler started for subscription {subscription_id}")
            while True:
                chunk = await output_queue.get()
                if chunk is None:
                    logger.info(f"[Terminal WS] Output handler received None, exiting")
                    break
                try:
                    text = chunk.decode('utf-8', errors='replace')
                    logger.info(f"[Terminal WS] Sending output to client: {len(text)} chars, first 50: {repr(text[:50])}")
                    await websocket.send_text(json.dumps({
                        "type": "output",
                        "data": text
                    }))
                except Exception as e:
                    logger.error(f"[Terminal WS] Error sending output: {e}", exc_info=True)
                    break
        
        output_task = asyncio.create_task(handle_output())

        # Handle WebSocket messages
        logger.info(f"[Terminal WS] Starting message receive loop for subscription {subscription_id}")
        try:
            message_count = 0
            while True:
                logger.debug(f"[Terminal WS] Waiting for WebSocket message (received {message_count} so far)...")
                try:
                    # Try to receive any type of message
                    raw_message = await websocket.receive()
                    message_count += 1
                    logger.info(f"[Terminal WS] ✓ Received message #{message_count}, type: {raw_message.get('type')}")

                    # Extract text from message
                    if raw_message.get("type") == "websocket.receive":
                        message = raw_message.get("text") or raw_message.get("bytes", b"").decode('utf-8')
                        logger.info(f"[Terminal WS] Message content: {message[:100]}")

                        # Process the message
                        try:
                            data = json.loads(message)
                            logger.info(f"[Terminal WS] Parsed JSON, message type: {data.get('type')}")

                            if data.get("type") == "input":
                                # Send input to Docker
                                input_data = data.get("data", "").encode('utf-8')
                                logger.info(f"[Terminal WS] Queuing input data: {repr(input_data[:50])}")
                                await input_queue.put(input_data)
                                logger.info(f"[Terminal WS] Input data queued successfully")
                            elif data.get("type") == "resize":
                                # Handle terminal resize
                                logger.info(f"[Terminal WS] Received resize request: cols={data.get('cols')}, rows={data.get('rows')}")
                                # TODO: Implement PTY resize
                        except json.JSONDecodeError as json_err:
                            # If not JSON, treat as raw input
                            logger.warning(f"[Terminal WS] JSON decode error: {json_err}, treating as raw input")
                            await input_queue.put(message.encode('utf-8'))
                        except Exception as process_err:
                            logger.error(f"[Terminal WS] Error processing message: {process_err}", exc_info=True)

                    elif raw_message.get("type") == "websocket.disconnect":
                        logger.info(f"[Terminal WS] Received disconnect message")
                        break
                    else:
                        logger.warning(f"[Terminal WS] Unknown message type: {raw_message}")
                        continue

                except Exception as recv_err:
                    logger.error(f"[Terminal WS] Error in receive(): {recv_err}", exc_info=True)
                    break
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for subscription {subscription_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}", exc_info=True)
        finally:
            # Cleanup
            stop_event.set()
            await input_queue.put(None)
            output_task.cancel()
            try:
                await output_task
            except asyncio.CancelledError:
                pass
            try:
                docker_sock.close()
            except Exception:
                pass
            
            try:
                await websocket.close()
            except:
                pass
            finally:
                await db.close()
    
    except Exception as e:
        logger.error(f"Terminal WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass

        finally:
            await db.close()


# ============================================================================
# File Deployment
# ============================================================================

@router.post(
    "/instances/{subscription_id}/deploy/files",
    summary="Deploy Files to VPS Container",
    description="""
    Upload and deploy project files directly to the VPS container's /data directory.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only deploy files to their own VPS instances.
    
    **Process:**
    1. Upload archive (zip, tar, tar.gz)
    2. Extract archive
    3. Copy files to container's /data directory
    
    **File Size Limit:** 500 MB
    """
)
async def deploy_files_to_container(
    subscription_id: str,
    file: UploadFile = File(..., description="Project archive (zip, tar, tar.gz)"),
    target_path: str = Form("/data", description="Target directory in container"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Deploy files directly to VPS container (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
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
            # Return failure with logs if available
            error_msg = result.get('error', 'Unknown error')
            return {
                "subscription_id": subscription_id,
                "success": False,
                "error": error_msg,
                "target_path": target_path,
                "archive_size": file_size,
                "deployed_at": datetime.utcnow().isoformat(),
                "logs": result.get("logs", [])
            }
        
        return {
            "subscription_id": subscription_id,
            "success": True,
            "target_path": target_path,
            "files_deployed": result.get("files_deployed", 0),
            "archive_size": file_size,
            "deployed_at": datetime.utcnow().isoformat(),
            "logs": result.get("logs", [])
        }
        
    except BadRequestException as e:
        # Re-raise BadRequestException as-is (for validation errors)
        raise
    except Exception as e:
        logger.error(f"Failed to deploy files to container: {e}", exc_info=True)
        raise BadRequestException(f"Deployment failed: {str(e)}")
    finally:
        # Cleanup temp file
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)


@router.post(
    "/instances/{subscription_id}/deploy/files/stream",
    summary="Deploy Files to VPS Container (Streaming)",
    description="""
    Upload and deploy project files with real-time log streaming via SSE.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only deploy files to their own VPS instances.
    
    **Process:**
    1. Upload archive (zip, tar, tar.gz)
    2. Stream deployment logs in real-time
    3. Extract archive and copy files to container
    
    **File Size Limit:** 500 MB
    """
)
async def deploy_files_to_container_stream(
    subscription_id: str,
    file: UploadFile = File(..., description="Project archive (zip, tar, tar.gz)"),
    target_path: str = Form("/data", description="Target directory in container"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Deploy files with streaming logs (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
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
    
    async def event_stream():
        temp_file = None
        try:
            yield "event: open\ndata: connected\n\n"
            
            # Save uploaded file temporarily
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix)
            
            # Read and save file (with size limit: 500 MB)
            max_size = 500 * 1024 * 1024  # 500 MB
            file_size = 0
            
            yield f"data: [Upload] Starting file upload...\n\n"
            
            while chunk := await file.read(8192):
                file_size += len(chunk)
                if file_size > max_size:
                    yield f"event: error\ndata: {json.dumps({'error': 'File too large. Maximum size: 500 MB'})}\n\n"
                    return
                temp_file.write(chunk)
            
            temp_file.close()
            yield f"data: [Upload] File uploaded successfully ({(file_size / 1024 / 1024):.2f} MB)\n\n"
            
            # Now stream the deployment
            docker_service = DockerManagementService(db)
            for log_line in docker_service.deploy_files_to_container_stream(
                container_id=subscription.container.container_id,
                archive_path=temp_file.name,
                target_path=target_path
            ):
                yield log_line
                
        except GeneratorExit:
            logger.info(f"Client disconnected during deployment stream for subscription {subscription_id}")
            raise
        except Exception as e:
            logger.error(f"Error in deployment stream: {e}", exc_info=True)
            try:
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            except GeneratorExit:
                raise
        finally:
            # Cleanup temp file
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
            try:
                yield "event: close\ndata: stream_ended\n\n"
            except GeneratorExit:
                raise
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/instances/{subscription_id}/docker/install",
    summary="Install Docker in VPS Container",
    description="""
    Install Docker and docker-compose in the VPS container.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only install Docker on their own VPS instances.
    
    **Note:** This operation may take several minutes. The container must be running.
    """
)
async def install_docker_in_container(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Install Docker in VPS container (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    docker_service = DockerManagementService(db)
    result = await docker_service.install_docker_in_container(
        container_id=subscription.container.container_id
    )
    
    if not result.get("success"):
        raise BadRequestException(result.get("error", "Failed to install Docker"))
    
    return {
        "subscription_id": subscription_id,
        "success": True,
        "docker_version": result.get("docker_version"),
        "compose_version": result.get("compose_version"),
        "logs": result.get("logs", []),
        "installed_at": datetime.utcnow().isoformat()
    }


@router.post(
    "/instances/{subscription_id}/docker/compose",
    summary="Run Docker Compose Command",
    description="""
    Execute a docker-compose command in the VPS container.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only run docker-compose on their own VPS instances.
    
    **Request Body:**
    - compose_file: Path to docker-compose.yml (default: "docker-compose.yml")
    - command: Command to run (default: "up -d")
    - working_dir: Working directory (default: "/data")
    
    **Common Commands:**
    - "up -d": Start services in detached mode
    - "down": Stop and remove services
    - "ps": List running services
    - "logs": Show logs
    - "restart": Restart services
    """
)
async def run_docker_compose(
    subscription_id: str,
    compose_file: str = Form("docker-compose.yml"),
    command: str = Form("up -d"),
    working_dir: str = Form("/data"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Run docker-compose command in VPS container (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    docker_service = DockerManagementService(db)
    result = await docker_service.run_docker_compose(
        container_id=subscription.container.container_id,
        compose_file_path=compose_file,
        command=command,
        working_dir=working_dir
    )
    
    if not result.get("success"):
        raise BadRequestException(result.get("error", "Failed to run docker-compose command"))
    
    return {
        "subscription_id": subscription_id,
        "success": True,
        "exit_code": result.get("exit_code", 0),
        "output": result.get("output", ""),
        "command": result.get("command", ""),
        "executed_at": datetime.utcnow().isoformat()
    }


@router.post(
    "/instances/{subscription_id}/docker/compose/stream",
    summary="Run Docker Compose Command (Streaming)",
    description="""
    Execute a docker-compose command in the VPS container with real-time log streaming via SSE.
    
    **Permissions Required:** `hosting:manage`
    
    **Security:** Users can only run docker-compose on their own VPS instances.
    
    **Request Body:**
    - compose_file: Path to docker-compose.yml (default: "docker-compose.yml")
    - command: Command to run (default: "up -d")
    - working_dir: Working directory (default: "/data")
    
    **Common Commands:**
    - "up -d": Start services in detached mode
    - "down": Stop and remove services
    - "ps": List running services
    - "logs": Show logs
    - "restart": Restart services
    """
)
async def run_docker_compose_stream(
    subscription_id: str,
    compose_file: str = Form("docker-compose.yml"),
    command: str = Form("up -d"),
    working_dir: str = Form("/data"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_MANAGE)),
):
    """Run docker-compose command with streaming logs (client)."""
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    async def event_stream():
        try:
            yield "event: open\ndata: connected\n\n"
            
            docker_service = DockerManagementService(db)
            # Stream from the blocking generator
            # We iterate synchronously since this is a generator that yields immediately
            for log_line in docker_service.run_docker_compose_stream(
                container_id=subscription.container.container_id,
                compose_file_path=compose_file,
                command=command,
                working_dir=working_dir
            ):
                yield log_line
                
        except GeneratorExit:
            logger.info(f"Client disconnected during docker-compose stream for subscription {subscription_id}")
            raise
        except Exception as e:
            logger.error(f"Error in docker-compose stream: {e}", exc_info=True)
            try:
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            except GeneratorExit:
                raise
        finally:
            try:
                yield "event: close\ndata: stream_ended\n\n"
            except GeneratorExit:
                raise
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================================
# Metrics & Stats
# ============================================================================

@router.get(
    "/instances/{subscription_id}/stats",
    response_model=ContainerStatsResponse,
    summary="Get Container Statistics",
    description="""
    Retrieve real-time and historical container statistics.
    
    Returns current resource usage (CPU, memory, storage, network) directly from Docker,
    plus historical metrics from the database for graphing. Historical data can be
    retrieved for up to 168 hours (7 days).
    
    **Permissions Required:** `hosting:view`
    
    **Query Parameters:**
    - hours: Number of hours of history to retrieve (default: 24, range: 1-168)
    
    **Response:** Object containing current stats and historical metrics array.
    """
)
async def get_container_stats(
    subscription_id: str,
    hours: int = Query(24, ge=1, le=168, description="Hours of history to retrieve"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    Get real-time stats + history.
    
    Args:
        subscription_id: Unique identifier of the subscription
        hours: Number of hours of historical data (1-168)
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        Container stats response with current stats and history
    
    Raises:
        404: If subscription or container not found
        400: If hours parameter is out of range
        403: If user lacks hosting:view permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    monitoring_service = ContainerMonitoringService(db)
    
    # Get current stats
    current_stats = await monitoring_service.get_real_time_stats(subscription.container.id)
    
    # Get historical metrics
    from app.modules.hosting.schemas import ContainerMetricsResponse
    history = await monitoring_service.get_metrics_history(subscription_id, hours)
    history_response = [ContainerMetricsResponse.model_validate(m) for m in history] if history else []
    
    return ContainerStatsResponse(
        current=current_stats,
        history=history_response
    )


@router.get(
    "/instances/{subscription_id}/logs",
    summary="Get Container Logs",
    description="""
    Retrieve container logs.
    
    Returns the last N lines of container logs from Docker. Useful for debugging and
    monitoring container activity.
    
    **Permissions Required:** `hosting:view`
    
    **Query Parameters:**
    - tail: Number of log lines to retrieve (default: 100, range: 1-1000)
    
    **Response:** Object containing logs as a string.
    """
)
async def get_container_logs(
    subscription_id: str,
    tail: int = Query(100, ge=1, le=1000, description="Number of log lines to retrieve"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    Get container logs (last N lines).
    
    Args:
        subscription_id: Unique identifier of the subscription
        tail: Number of log lines to retrieve (1-1000)
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        Object with logs string
    
    Raises:
        404: If subscription or container not found
        400: If tail parameter is out of range
        403: If user lacks hosting:view permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")
    
    docker_service = DockerManagementService(db)
    logs = await docker_service.get_container_logs(subscription.container.container_id, tail)
    
    return {"logs": logs or ""}


@router.get(
    "/instances/{subscription_id}/logs/stream",
    summary="Stream Container Logs (SSE)",
    description="""
    Stream container logs in real-time using Server-Sent Events (SSE).

    **Permissions Required:** `hosting:view`

    **Query Parameters:**
    - tail: Number of initial log lines to send (default: 100, range: 1-1000)
    """
)
async def stream_container_logs(
    subscription_id: str,
    tail: int = Query(100, ge=1, le=1000, description="Number of initial log lines"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW)),
):
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)

    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")

    if not subscription.container:
        raise NotFoundException(f"Container not found for subscription {subscription_id}")

    docker_service = DockerManagementService(db)
    container_id = subscription.container.container_id

    def event_stream():
        import time

        # Always yield the open event first to ensure a response is returned
        try:
            # Initial event helps the client know the stream is connected
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
            # Disable proxy buffering (nginx) so logs appear immediately
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================================
# Timeline
# ============================================================================

@router.get(
    "/subscriptions/{subscription_id}/timeline",
    response_model=List[SubscriptionTimelineResponse],
    summary="Get Subscription Timeline",
    description="""
    Retrieve subscription event timeline.
    
    Returns a chronological list of all events that occurred for this subscription, including
    creation, approval, provisioning, status changes, billing events, and container operations.
    Events are ordered by creation time (newest first).
    
    **Permissions Required:** `hosting:view`
    
    **Response:** List of timeline events with event type, description, actor, and metadata.
    """
)
async def get_subscription_timeline(
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.HOSTING_VIEW))
):
    """
    Get subscription event timeline.
    
    Args:
        subscription_id: Unique identifier of the subscription
        db: Database session
        current_user: Authenticated user (requires hosting:view permission)
    
    Returns:
        List of timeline events ordered by creation time (newest first)
    
    Raises:
        404: If subscription not found or doesn't belong to user
        403: If user lacks hosting:view permission
    """
    repo = VPSSubscriptionRepository(db)
    subscription = await repo.get_by_id(subscription_id)
    
    if not subscription:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    # Security: only own subscriptions
    if subscription.customer_id != current_user.id:
        raise NotFoundException(f"Subscription {subscription_id} not found")
    
    timeline_repo = SubscriptionTimelineRepository(db)
    timeline = await timeline_repo.get_by_subscription_id(subscription_id, limit=100)

    return [SubscriptionTimelineResponse.model_validate(event) for event in timeline]

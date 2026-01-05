"""
VPS Hosting Client API routes.

Customer-facing endpoints for managing VPS subscriptions.
"""
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse
import json

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
    UpgradeResponseSchema
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


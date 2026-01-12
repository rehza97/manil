"""
VPS Hosting Pydantic schemas.

Request/response schemas for VPS hosting management operations.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.modules.hosting.models import (
    SubscriptionStatus,
    BillingCycle,
    ContainerStatus,
    TimelineEventType,
    ActorType,
    ImageBuildStatus
)


# ============================================================================
# VPS Plan Schemas
# ============================================================================

class VPSPlanBase(BaseModel):
    """Base schema for VPS plans."""
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    cpu_cores: float = Field(..., gt=0)
    ram_gb: int = Field(..., gt=0)
    storage_gb: int = Field(..., gt=0)
    bandwidth_tb: float = Field(..., gt=0)
    monthly_price: Decimal = Field(..., ge=0)
    setup_fee: Decimal = Field(default=Decimal("0.00"), ge=0)
    features: Optional[Dict[str, Any]] = Field(default_factory=dict)
    docker_image: str = Field(default="ubuntu:22.04")
    is_active: bool = Field(default=True)
    display_order: int = Field(default=0)


class VPSPlanCreate(VPSPlanBase):
    """Schema for creating VPS plans."""
    pass


class VPSPlanUpdate(BaseModel):
    """Schema for updating VPS plans."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    cpu_cores: Optional[float] = Field(None, gt=0)
    ram_gb: Optional[int] = Field(None, gt=0)
    storage_gb: Optional[int] = Field(None, gt=0)
    bandwidth_tb: Optional[float] = Field(None, gt=0)
    monthly_price: Optional[Decimal] = Field(None, ge=0)
    setup_fee: Optional[Decimal] = Field(None, ge=0)
    features: Optional[Dict[str, Any]] = None
    docker_image: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class VPSPlanResponse(VPSPlanBase):
    """Schema for VPS plan responses."""
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# VPS Subscription Schemas
# ============================================================================

class VPSSubscriptionBase(BaseModel):
    """Base schema for VPS subscriptions."""
    billing_cycle: BillingCycle = Field(default=BillingCycle.MONTHLY)
    auto_renew: bool = Field(default=True)


class VPSSubscriptionCreate(VPSSubscriptionBase):
    """Schema for creating VPS subscriptions (customer request)."""
    plan_id: str
    quote_id: Optional[str] = None


class VPSSubscriptionUpdate(BaseModel):
    """Schema for updating VPS subscriptions."""
    auto_renew: Optional[bool] = None
    status_reason: Optional[str] = None


class VPSSubscriptionResponse(VPSSubscriptionBase):
    """Schema for VPS subscription responses."""
    id: str
    subscription_number: str
    customer_id: str
    plan_id: str
    quote_id: Optional[str] = None
    status: SubscriptionStatus
    status_reason: Optional[str] = None
    start_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    last_billed_date: Optional[date] = None
    cancelled_at: Optional[datetime] = None
    terminated_at: Optional[datetime] = None
    is_trial: bool
    trial_ends_at: Optional[datetime] = None
    grace_period_days: int
    total_invoiced: Decimal
    total_paid: Decimal
    approved_at: Optional[datetime] = None
    approved_by_id: Optional[str] = None
    os_distro_id: Optional[str] = None
    os_docker_image: Optional[str] = None
    image_download_status: Optional[str] = None
    image_download_progress: int = 0
    image_download_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Nested relationships (optional)
    plan: Optional[VPSPlanResponse] = None
    container: Optional["ContainerInstanceResponse"] = None

    model_config = ConfigDict(from_attributes=True)


class VPSSubscriptionDetailResponse(VPSSubscriptionResponse):
    """Detailed VPS subscription response with all relations."""
    timeline: Optional[List["SubscriptionTimelineResponse"]] = None
    recent_metrics: Optional[List["ContainerMetricsResponse"]] = None


# ============================================================================
# Container Instance Schemas
# ============================================================================

class ContainerInstanceBase(BaseModel):
    """Base schema for container instances."""
    hostname: str
    ssh_public_key: Optional[str] = None


class ContainerInstanceResponse(BaseModel):
    """Schema for container instance responses."""
    id: str
    subscription_id: str
    container_id: str
    container_name: str
    ip_address: str
    network_name: str
    hostname: str
    ssh_port: int
    ssh_public_key: Optional[str] = None
    status: ContainerStatus
    cpu_limit: float
    memory_limit_gb: int
    storage_limit_gb: int
    data_volume_path: str
    first_started_at: Optional[datetime] = None
    last_started_at: Optional[datetime] = None
    last_stopped_at: Optional[datetime] = None
    uptime_seconds: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContainerCredentialsResponse(BaseModel):
    """Schema for container SSH credentials (sensitive)."""
    ip_address: str
    ssh_port: int
    hostname: str
    root_password: str  # Decrypted password
    ssh_connection_string: str  # e.g., "ssh root@172.20.1.2 -p 2222"


# ============================================================================
# Container Metrics Schemas
# ============================================================================

class ContainerMetricsResponse(BaseModel):
    """Schema for container metrics responses."""
    id: str
    subscription_id: str
    container_id: str
    cpu_usage_percent: float
    memory_usage_mb: int
    memory_usage_percent: float
    storage_usage_mb: int
    storage_usage_percent: float
    network_rx_bytes: int
    network_tx_bytes: int
    block_read_bytes: int
    block_write_bytes: int
    process_count: Optional[int] = None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContainerStatsResponse(BaseModel):
    """Aggregated container stats response."""
    subscription_id: str
    container_id: str
    current_status: ContainerStatus

    # Current metrics (latest datapoint)
    current_cpu_percent: float
    current_memory_mb: int
    current_memory_percent: float
    current_storage_mb: int
    current_storage_percent: float

    # Resource limits
    cpu_limit: float
    memory_limit_gb: int
    storage_limit_gb: int

    # Historical data (24 hours by default)
    metrics_history: List[ContainerMetricsResponse]

    # Uptime
    uptime_seconds: int
    last_started_at: Optional[datetime] = None


# ============================================================================
# Subscription Timeline Schemas
# ============================================================================

class SubscriptionTimelineResponse(BaseModel):
    """Schema for subscription timeline responses."""
    id: str
    subscription_id: str
    event_type: TimelineEventType
    event_description: str
    event_metadata: Optional[Dict[str, Any]] = None
    actor_id: Optional[str] = None
    actor_type: ActorType
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Action Request Schemas
# ============================================================================

class VPSApprovalRequest(BaseModel):
    """Schema for approving VPS subscription requests."""
    notes: Optional[str] = None


class VPSRejectionRequest(BaseModel):
    """Schema for rejecting VPS subscription requests."""
    reason: str = Field(..., min_length=1, max_length=500)


class VPSUpgradeRequest(BaseModel):
    """Schema for upgrading VPS subscription."""
    new_plan_id: str
    upgrade_immediately: bool = Field(default=True)


class VPSSuspendRequest(BaseModel):
    """Schema for suspending VPS subscription."""
    reason: str = Field(..., min_length=1, max_length=500)


class VPSReactivateRequest(BaseModel):
    """Schema for reactivating VPS subscription."""
    notes: Optional[str] = None


class VPSCancellationRequest(BaseModel):
    """Schema for cancelling VPS subscription."""
    reason: str = Field(..., min_length=1, max_length=500)
    immediate: bool = Field(default=False)  # True: cancel now, False: cancel at billing period end


class ContainerActionResponse(BaseModel):
    """Generic response for container actions (start/stop/reboot)."""
    success: bool
    message: str
    container_status: ContainerStatus
    action_timestamp: datetime


# ============================================================================
# List/Filter Schemas
# ============================================================================

class VPSSubscriptionListFilters(BaseModel):
    """Filters for VPS subscription list queries."""
    status: Optional[SubscriptionStatus] = None
    plan_id: Optional[str] = None
    customer_id: Optional[str] = None
    is_trial: Optional[bool] = None
    auto_renew: Optional[bool] = None
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)


class VPSPlanListFilters(BaseModel):
    """Filters for VPS plan list queries."""
    is_active: Optional[bool] = None
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)


# ============================================================================
# Dashboard/Statistics Schemas
# ============================================================================

class VPSSubscriptionStats(BaseModel):
    """Aggregated statistics for VPS subscriptions."""
    total_subscriptions: int
    active_subscriptions: int
    pending_approvals: int
    suspended_subscriptions: int
    cancelled_subscriptions: int
    total_monthly_revenue: Decimal
    average_cpu_usage: float
    average_memory_usage: float
    average_storage_usage: float


class CustomerVPSOverview(BaseModel):
    """Overview of customer's VPS subscriptions."""
    total_subscriptions: int
    active_subscriptions: int
    total_monthly_cost: Decimal
    subscriptions: List[VPSSubscriptionResponse]


# ============================================================================
# Request Body Schemas (Aliases for API consistency)
# ============================================================================

class CreateVPSRequestBody(BaseModel):
    """Schema for creating VPS request."""
    plan_id: str = Field(..., description="VPS plan ID to request")


# Alias existing schemas for API consistency
UpgradeSubscriptionBody = VPSUpgradeRequest
CancelSubscriptionBody = VPSCancellationRequest
SuspendSubscriptionBody = VPSSuspendRequest
RejectRequestBody = VPSRejectionRequest


# ============================================================================
# Pagination Schemas
# ============================================================================

class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""
    items: List[Any]
    total: int
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    total_pages: int


class VPSSubscriptionListResponse(BaseModel):
    """Schema for paginated VPS subscription list responses."""
    items: List[VPSSubscriptionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# Stats & Monitoring Schemas
# ============================================================================

class ContainerStatsResponse(BaseModel):
    """Response schema for container stats with current + history."""
    current: Dict[str, Any]  # Real-time stats from Docker
    history: List[ContainerMetricsResponse]  # Historical metrics


class MonitoringOverviewSchema(BaseModel):
    """Schema for admin monitoring overview."""
    total_subscriptions: int
    active_containers: int
    total_monthly_revenue: float  # Changed from Decimal to float for JSON serialization
    avg_cpu_usage: float
    avg_memory_usage: float
    alerts: List["AlertSchema"]


class AlertSchema(BaseModel):
    """Schema for resource alerts."""
    type: str  # CPU_HIGH, MEMORY_HIGH, STORAGE_HIGH
    severity: str  # HIGH, CRITICAL
    message: str
    current_value: float
    threshold: float
    subscription_id: Optional[str] = None
    subscription_number: Optional[str] = None


# ============================================================================
# Upgrade Response Schema
# ============================================================================

class UpgradeResponseSchema(BaseModel):
    """Response schema for subscription upgrade."""
    subscription: VPSSubscriptionResponse
    prorated_amount: Decimal
    message: str


# ============================================================================
# Custom Docker Image Schemas
# ============================================================================

class CustomImageUploadRequest(BaseModel):
    """Schema for uploading custom Docker image project."""
    image_name: Optional[str] = Field(
        None,
        description="Name for the Docker image (auto-generated if not provided)",
        max_length=255
    )
    image_tag: str = Field(
        "latest",
        description="Tag for the Docker image",
        max_length=100
    )
    dockerfile_path: str = Field(
        "Dockerfile",
        description="Path to Dockerfile within archive",
        max_length=255
    )
    build_args: Optional[Dict[str, str]] = Field(
        None,
        description="Build arguments for Docker build"
    )
    subscription_id: Optional[str] = Field(
        None,
        description="Optional VPS subscription to link"
    )


class CustomImageResponse(BaseModel):
    """Schema for custom Docker image response."""
    id: str
    customer_id: str
    subscription_id: Optional[str]
    image_name: str
    image_tag: str
    docker_image_id: Optional[str]
    upload_filename: str
    upload_size_bytes: int
    dockerfile_path: str
    status: ImageBuildStatus
    build_started_at: Optional[datetime]
    build_completed_at: Optional[datetime]
    build_duration_seconds: Optional[int]
    build_error: Optional[str]
    image_size_mb: Optional[float]
    security_scan_results: Optional[Dict[str, Any]]
    scan_completed_at: Optional[datetime]
    version: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomImageDetailResponse(CustomImageResponse):
    """Detailed custom image response with Dockerfile and build logs."""
    dockerfile_content: Optional[str]
    build_logs: Optional[str]
    exposed_ports: List[Any]
    build_args: Dict[str, str]


class ImageBuildLogResponse(BaseModel):
    """Schema for image build log entry."""
    id: str
    image_id: str
    timestamp: datetime
    log_level: str
    message: str
    step: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class RebuildImageRequest(BaseModel):
    """Schema for rebuilding an existing image."""
    build_args: Optional[Dict[str, str]] = Field(
        None,
        description="Updated build arguments (optional)"
    )


class ImageApprovalRequest(BaseModel):
    """Schema for approving/rejecting custom image (admin only)."""
    approved: bool = Field(description="True to approve, False to reject")
    reason: Optional[str] = Field(
        None,
        description="Reason for rejection (required if approved=False)"
    )


class CustomImageListResponse(BaseModel):
    """Paginated list response for custom images."""
    items: List[CustomImageResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Forward references resolution
VPSSubscriptionResponse.model_rebuild()
VPSSubscriptionDetailResponse.model_rebuild()
AlertSchema.model_rebuild()
MonitoringOverviewSchema.model_rebuild()
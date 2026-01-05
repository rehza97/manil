"""
VPS Hosting database models.

Handles VPS plans, subscriptions, Docker containers, metrics, and event timeline.
"""
import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    String, DateTime, Enum as SQLEnum, Text, Numeric, Integer, Float,
    ForeignKey, Boolean, Date, BigInteger, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.config.database import Base


class SubscriptionStatus(str, PyEnum):
    """VPS Subscription status enumeration."""
    PENDING = "PENDING"  # Awaiting admin approval
    DOWNLOADING_IMAGE = "DOWNLOADING_IMAGE"  # Pulling OS image before provisioning
    PROVISIONING = "PROVISIONING"  # Being set up (async task running)
    ACTIVE = "ACTIVE"  # Running and billed
    SUSPENDED = "SUSPENDED"  # Stopped due to payment issue
    CANCELLED = "CANCELLED"  # Cancelled by user (end of billing period)
    TERMINATED = "TERMINATED"  # Fully deleted with all data


class BillingCycle(str, PyEnum):
    """Billing cycle enumeration."""
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUALLY = "ANNUALLY"


class ContainerStatus(str, PyEnum):
    """Container status enumeration."""
    CREATING = "CREATING"  # Being created
    RUNNING = "RUNNING"  # Active and running
    STOPPED = "STOPPED"  # Stopped by user or system
    REBOOTING = "REBOOTING"  # Restarting
    ERROR = "ERROR"  # Failed to start
    TERMINATED = "TERMINATED"  # Deleted permanently


class TimelineEventType(str, PyEnum):
    """Timeline event type enumeration."""
    # Lifecycle Events
    CREATED = "CREATED"
    APPROVED = "APPROVED"
    PROVISIONED = "PROVISIONED"

    # Container Operations
    STARTED = "STARTED"
    STOPPED = "STOPPED"
    REBOOTED = "REBOOTED"

    # Plan Changes
    UPGRADED = "UPGRADED"
    DOWNGRADED = "DOWNGRADED"

    # Status Changes
    SUSPENDED = "SUSPENDED"
    REACTIVATED = "REACTIVATED"
    CANCELLED = "CANCELLED"
    TERMINATED = "TERMINATED"

    # Billing Events
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    PAYMENT_OVERDUE = "PAYMENT_OVERDUE"
    INVOICE_GENERATED = "INVOICE_GENERATED"


class ActorType(str, PyEnum):
    """Actor type enumeration."""
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"
    SYSTEM = "SYSTEM"


class ImageBuildStatus(str, PyEnum):
    """Image build status enumeration."""
    PENDING = "PENDING"  # Uploaded, waiting to start
    VALIDATING = "VALIDATING"  # Validating archive and Dockerfile
    BUILDING = "BUILDING"  # Building Docker image
    SCANNING = "SCANNING"  # Running security scan
    COMPLETED = "COMPLETED"  # Build successful and scanned
    FAILED = "FAILED"  # Build or scan failed
    REJECTED = "REJECTED"  # Rejected due to security issues


class DNSZoneStatus(str, PyEnum):
    """DNS Zone status enumeration."""
    PENDING = "PENDING"  # Created but not yet active
    ACTIVE = "ACTIVE"  # Live in CoreDNS
    SUSPENDED = "SUSPENDED"  # Temporarily disabled
    DELETED = "DELETED"  # Soft deleted


class DNSRecordType(str, PyEnum):
    """DNS Record type enumeration."""
    A = "A"  # IPv4 address
    AAAA = "AAAA"  # IPv6 address
    CNAME = "CNAME"  # Canonical name
    MX = "MX"  # Mail exchange
    TXT = "TXT"  # Text record
    NS = "NS"  # Name server
    SRV = "SRV"  # Service record
    PTR = "PTR"  # Pointer record
    SOA = "SOA"  # Start of authority


class DNSZoneType(str, PyEnum):
    """DNS Zone type enumeration."""
    FORWARD = "FORWARD"  # Forward lookup zone
    REVERSE = "REVERSE"  # Reverse lookup zone


class DNSSyncType(str, PyEnum):
    """DNS Sync operation type enumeration."""
    ZONE_CREATE = "ZONE_CREATE"
    ZONE_UPDATE = "ZONE_UPDATE"
    ZONE_DELETE = "ZONE_DELETE"
    RECORD_UPDATE = "RECORD_UPDATE"
    FULL_RELOAD = "FULL_RELOAD"
    CONFIG_UPDATE = "CONFIG_UPDATE"


class DNSSyncStatus(str, PyEnum):
    """DNS Sync status enumeration."""
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"


class DNSTemplateType(str, PyEnum):
    """DNS Zone template type enumeration."""
    WEB_SERVER = "WEB_SERVER"  # Web server configuration
    MAIL_SERVER = "MAIL_SERVER"  # Mail server configuration
    FULL_STACK = "FULL_STACK"  # Complete stack (web + mail)
    CUSTOM = "CUSTOM"  # Custom template


class VPSPlan(Base):
    """VPS Plan database model - defines available hosting plans."""

    __tablename__ = "vps_plans"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Plan Information
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Resource Specifications
    cpu_cores: Mapped[float] = mapped_column(Float, nullable=False)
    ram_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    bandwidth_tb: Mapped[float] = mapped_column(Float, nullable=False)

    # Pricing
    monthly_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    setup_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))

    # Features (JSONB for flexible feature flags)
    features: Mapped[dict | None] = mapped_column(JSONB, default={})

    # Docker Configuration
    docker_image: Mapped[str] = mapped_column(String(255), default="ubuntu:22.04")

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )

    # Relationships
    subscriptions: Mapped[list["VPSSubscription"]] = relationship(
        "VPSSubscription",
        back_populates="plan"
    )


class VPSSubscription(Base):
    """VPS Subscription database model - tracks customer VPS subscriptions."""

    __tablename__ = "vps_subscriptions"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Auto-generated subscription number (VPS-YYYYMMDD-XXXXX)
    subscription_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Foreign Keys
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("vps_plans.id"), nullable=False, index=True)
    quote_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("quotes.id"), nullable=True)
    custom_image_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("custom_docker_images.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Subscription Status
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus, name='subscription_status'),
        nullable=False,
        default=SubscriptionStatus.PENDING
    )
    status_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Billing Information
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        SQLEnum(BillingCycle, name='billing_cycle'),
        default=BillingCycle.MONTHLY
    )
    last_billed_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Lifecycle Timestamps
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Trial & Auto-renewal
    is_trial: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    grace_period_days: Mapped[int] = mapped_column(Integer, default=7)

    # Financial Tracking
    total_invoiced: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    total_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))

    # Approval Tracking
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Selected OS / Distro (curated list mapped to Docker images)
    os_distro_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    os_docker_image: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Image download phase tracking
    image_download_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    image_download_progress: Mapped[int] = mapped_column(Integer, default=0)
    image_download_logs: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_download_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    plan: Mapped["VPSPlan"] = relationship("VPSPlan", back_populates="subscriptions")
    quote: Mapped["Quote"] = relationship("Quote")
    approved_by: Mapped["User"] = relationship("User", foreign_keys=[approved_by_id])
    custom_image: Mapped["CustomDockerImage"] = relationship(
        "CustomDockerImage",
        foreign_keys=[custom_image_id]
    )
    container: Mapped["ContainerInstance"] = relationship(
        "ContainerInstance",
        back_populates="subscription",
        uselist=False
    )
    metrics: Mapped[list["ContainerMetrics"]] = relationship(
        "ContainerMetrics",
        back_populates="subscription"
    )
    timeline: Mapped[list["SubscriptionTimeline"]] = relationship(
        "SubscriptionTimeline",
        back_populates="subscription"
    )
    invoices: Mapped[list["Invoice"]] = relationship(
        "Invoice",
        back_populates="vps_subscription"
    )


class ContainerInstance(Base):
    """Container Instance database model - stores Docker container details."""

    __tablename__ = "container_instances"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Key (One-to-One with VPSSubscription)
    subscription_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("vps_subscriptions.id"),
        unique=True,
        nullable=False
    )

    # Docker Identifiers
    container_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    container_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    # Network Configuration
    ip_address: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    network_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    ssh_port: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)

    # Credentials (Encrypted at rest)
    root_password: Mapped[str] = mapped_column(String(255), nullable=False)
    ssh_public_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Container State
    status: Mapped[ContainerStatus] = mapped_column(
        SQLEnum(ContainerStatus, name='container_status'),
        nullable=False,
        default=ContainerStatus.CREATING
    )
    docker_state: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Resource Limits (copied from plan at creation)
    cpu_limit: Mapped[float] = mapped_column(Float, nullable=False)
    memory_limit_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_limit_gb: Mapped[int] = mapped_column(Integer, nullable=False)

    # Storage Paths
    data_volume_path: Mapped[str] = mapped_column(String(500), nullable=False)

    # Uptime Tracking
    first_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_stopped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    uptime_seconds: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )

    # Relationships
    subscription: Mapped["VPSSubscription"] = relationship(
        "VPSSubscription",
        back_populates="container"
    )
    metrics: Mapped[list["ContainerMetrics"]] = relationship(
        "ContainerMetrics",
        back_populates="container"
    )


class ContainerMetrics(Base):
    """Container Metrics database model - time-series resource usage data."""

    __tablename__ = "container_metrics"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Keys
    subscription_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("vps_subscriptions.id"),
        nullable=False,
        index=True
    )
    container_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("container_instances.id"),
        nullable=False,
        index=True
    )

    # CPU Metrics
    cpu_usage_percent: Mapped[float] = mapped_column(Float, nullable=False)

    # Memory Metrics
    memory_usage_mb: Mapped[int] = mapped_column(Integer, nullable=False)
    memory_usage_percent: Mapped[float] = mapped_column(Float, nullable=False)

    # Storage Metrics
    storage_usage_mb: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_usage_percent: Mapped[float] = mapped_column(Float, nullable=False)

    # Network I/O (cumulative bytes)
    network_rx_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    network_tx_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Block I/O (cumulative bytes)
    block_read_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    block_write_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Process Count
    process_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Advanced CPU Metrics (from cgroups)
    cpu_throttle_periods: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cpu_throttled_time_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cpu_steal_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Memory Pressure Metrics (PSI - Pressure Stall Information)
    memory_pressure_some_avg10: Mapped[float | None] = mapped_column(Float, nullable=True)
    memory_pressure_full_avg10: Mapped[float | None] = mapped_column(Float, nullable=True)

    # OOM Kill Tracking
    oom_kill_count: Mapped[int | None] = mapped_column(Integer, nullable=True, server_default="0")

    # Network I/O Rates (calculated from deltas)
    network_rx_bytes_per_sec: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    network_tx_bytes_per_sec: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Block I/O Rates (calculated from deltas)
    block_read_bytes_per_sec: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    block_write_bytes_per_sec: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Collection Timestamp
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow(), index=True, nullable=False)

    # Relationships
    subscription: Mapped["VPSSubscription"] = relationship("VPSSubscription")
    container: Mapped["ContainerInstance"] = relationship("ContainerInstance")

    # Composite Indexes for efficient queries
    __table_args__ = (
        Index('ix_metrics_subscription_recorded', 'subscription_id', 'recorded_at'),
        Index('ix_metrics_container_recorded', 'container_id', 'recorded_at'),
    )


class SubscriptionTimeline(Base):
    """Subscription Timeline database model - audit trail of subscription events."""

    __tablename__ = "subscription_timeline"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Keys
    subscription_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("vps_subscriptions.id"),
        nullable=False,
        index=True
    )

    # Event Details
    event_type: Mapped[TimelineEventType] = mapped_column(SQLEnum(TimelineEventType, name='timeline_event_type'), nullable=False)
    event_description: Mapped[str] = mapped_column(Text, nullable=False)

    # Context Data (flexible JSONB for event-specific info)
    event_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # Actor Information
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    actor_type: Mapped[ActorType] = mapped_column(SQLEnum(ActorType, name='actor_type'), nullable=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow(), index=True, nullable=False)

    # Relationships
    subscription: Mapped["VPSSubscription"] = relationship("VPSSubscription")
    actor: Mapped["User"] = relationship("User")


class CustomDockerImage(Base):
    """Custom Docker Image database model - tracks user-uploaded Docker images."""

    __tablename__ = "custom_docker_images"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Keys
    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    subscription_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("vps_subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Image Identification
    image_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    image_tag: Mapped[str] = mapped_column(String(100), default="latest")
    docker_image_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Upload Information
    upload_archive_path: Mapped[str] = mapped_column(String(500), nullable=False)
    upload_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    upload_filename: Mapped[str] = mapped_column(String(255), nullable=False)

    # Dockerfile Info
    dockerfile_path: Mapped[str] = mapped_column(String(255), default="Dockerfile")
    dockerfile_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Build Configuration
    build_args: Mapped[dict] = mapped_column(JSONB, default={})
    build_context_path: Mapped[str] = mapped_column(String(255), default=".")
    target_stage: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Build Status
    status: Mapped[ImageBuildStatus] = mapped_column(
        SQLEnum(ImageBuildStatus, name='imagebuildstatus'),
        nullable=False,
        default=ImageBuildStatus.PENDING,
        index=True
    )
    build_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    build_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    build_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Build Output
    build_logs: Mapped[str | None] = mapped_column(Text, nullable=True)
    build_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Security Scanning
    security_scan_results: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    scan_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Image Metadata
    image_size_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    base_image: Mapped[str | None] = mapped_column(String(255), nullable=True)
    exposed_ports: Mapped[list] = mapped_column(JSONB, default=[])

    # Version Control
    version: Mapped[int] = mapped_column(Integer, default=1)
    previous_version_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("custom_docker_images.id", ondelete="SET NULL"),
        nullable=True
    )

    # Approval
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Soft Delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    subscription: Mapped["VPSSubscription"] = relationship(
        "VPSSubscription",
        foreign_keys=[subscription_id]
    )
    approved_by: Mapped["User"] = relationship("User", foreign_keys=[approved_by_id])
    build_logs_rel: Mapped[list["ImageBuildLog"]] = relationship(
        "ImageBuildLog",
        back_populates="image"
    )
    previous_version: Mapped["CustomDockerImage"] = relationship(
        "CustomDockerImage",
        remote_side=[id],
        foreign_keys=[previous_version_id]
    )


class ImageBuildLog(Base):
    """Image Build Log database model - tracks build process logs."""

    __tablename__ = "image_build_logs"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Key
    image_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("custom_docker_images.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Log Entry
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        index=True
    )
    log_level: Mapped[str] = mapped_column(String(20), default="INFO")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    step: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Relationships
    image: Mapped["CustomDockerImage"] = relationship(
        "CustomDockerImage",
        back_populates="build_logs_rel"
    )


class DNSZone(Base):
    """DNS Zone database model - stores DNS zone definitions."""

    __tablename__ = "dns_zones"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Keys
    subscription_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("vps_subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Zone Information
    zone_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    zone_type: Mapped[DNSZoneType] = mapped_column(
        SQLEnum(DNSZoneType, name='dns_zone_type'),
        nullable=False,
        default=DNSZoneType.FORWARD
    )

    # Status
    status: Mapped[DNSZoneStatus] = mapped_column(
        SQLEnum(DNSZoneStatus, name='dns_zone_status'),
        nullable=False,
        default=DNSZoneStatus.PENDING,
        index=True
    )

    # DNS Configuration
    ttl_default: Mapped[int] = mapped_column(Integer, default=3600)
    nameservers: Mapped[list | None] = mapped_column(JSONB, default=[])
    soa_record: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Management
    is_system_managed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_updated_serial: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )

    # Relationships
    subscription: Mapped["VPSSubscription"] = relationship(
        "VPSSubscription",
        foreign_keys=[subscription_id]
    )
    records: Mapped[list["DNSRecord"]] = relationship(
        "DNSRecord",
        back_populates="zone",
        cascade="all, delete-orphan"
    )
    sync_logs: Mapped[list["DNSSyncLog"]] = relationship(
        "DNSSyncLog",
        back_populates="zone"
    )


class DNSRecord(Base):
    """DNS Record database model - stores individual DNS records."""

    __tablename__ = "dns_records"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Keys
    zone_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dns_zones.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Record Information
    record_name: Mapped[str] = mapped_column(String(255), nullable=False)
    record_type: Mapped[DNSRecordType] = mapped_column(
        SQLEnum(DNSRecordType, name='dns_record_type'),
        nullable=False,
        index=True
    )
    record_value: Mapped[str] = mapped_column(String(500), nullable=False)

    # DNS Parameters
    ttl: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority: Mapped[int | None] = mapped_column(Integer, nullable=True)  # For MX, SRV
    weight: Mapped[int | None] = mapped_column(Integer, nullable=True)  # For SRV
    port: Mapped[int | None] = mapped_column(Integer, nullable=True)  # For SRV

    # Management
    is_system_managed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    record_metadata: Mapped[dict | None] = mapped_column(JSONB, default={})

    # Audit
    created_by_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    last_modified_by_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )

    # Relationships
    zone: Mapped["DNSZone"] = relationship("DNSZone", back_populates="records")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    last_modified_by: Mapped["User"] = relationship("User", foreign_keys=[last_modified_by_id])

    # Composite unique constraint handled in migration
    __table_args__ = (
        Index('ix_dns_records_zone_type', 'zone_id', 'record_type'),
    )


class DNSZoneTemplate(Base):
    """DNS Zone Template database model - pre-configured DNS record sets."""

    __tablename__ = "dns_zone_templates"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Template Information
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    template_type: Mapped[DNSTemplateType] = mapped_column(
        SQLEnum(DNSTemplateType, name='dns_template_type'),
        nullable=False,
        default=DNSTemplateType.CUSTOM
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Template Data
    record_definitions: Mapped[list] = mapped_column(JSONB, default=[])

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.utcnow())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow()
    )


class DNSSyncLog(Base):
    """DNS Sync Log database model - audit trail for CoreDNS configuration updates."""

    __tablename__ = "dns_sync_log"

    # Primary Key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Foreign Keys
    zone_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("dns_zones.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    triggered_by_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Sync Information
    sync_type: Mapped[DNSSyncType] = mapped_column(
        SQLEnum(DNSSyncType, name='dns_sync_type'),
        nullable=False
    )
    status: Mapped[DNSSyncStatus] = mapped_column(
        SQLEnum(DNSSyncStatus, name='dns_sync_status'),
        nullable=False,
        default=DNSSyncStatus.PENDING,
        index=True
    )

    # Sync Data
    config_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.utcnow(),
        index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    zone: Mapped["DNSZone"] = relationship("DNSZone", back_populates="sync_logs")
    triggered_by: Mapped["User"] = relationship("User", foreign_keys=[triggered_by_id])

    # Composite indexes handled in migration
    __table_args__ = (
        Index('ix_dns_sync_log_zone_status', 'zone_id', 'status'),
    )

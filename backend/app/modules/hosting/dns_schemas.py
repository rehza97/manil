"""
DNS Management Pydantic Schemas.

Request/response schemas for DNS management operations.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
import ipaddress
import re

from app.modules.hosting.models import (
    DNSZoneStatus,
    DNSRecordType,
    DNSZoneType,
    DNSTemplateType,
    DNSSyncType,
    DNSSyncStatus
)


# ============================================================================
# DNS Zone Schemas
# ============================================================================

class DNSZoneBase(BaseModel):
    """Base schema for DNS zones."""
    zone_name: str = Field(..., min_length=1, max_length=255, description="Domain name (e.g., example.com)")
    zone_type: DNSZoneType = Field(default=DNSZoneType.FORWARD, description="Zone type")
    ttl_default: int = Field(default=3600, ge=60, le=86400, description="Default TTL in seconds")
    notes: Optional[str] = Field(None, max_length=1000, description="Admin notes")

    @field_validator('zone_name')
    @classmethod
    def validate_zone_name(cls, v: str) -> str:
        """Validate zone name follows DNS naming conventions."""
        # Allow real TLDs like .com, .dz, .fr for local DNS
        # RFC 1035: max 255 chars, labels max 63 chars, alphanumeric and hyphens
        if len(v) > 255:
            raise ValueError("Zone name must be 255 characters or less")

        # Simple validation - alphanumeric, dots, hyphens
        if not re.match(r'^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$', v, re.IGNORECASE):
            raise ValueError("Invalid zone name format. Use alphanumeric characters, dots, and hyphens only")

        # Check each label
        labels = v.split('.')
        for label in labels:
            if not label or len(label) > 63:
                raise ValueError("Each label must be 1-63 characters")
            if label.startswith('-') or label.endswith('-'):
                raise ValueError("Labels cannot start or end with hyphens")

        return v.lower()


class DNSZoneCreate(DNSZoneBase):
    """Schema for creating DNS zones."""
    subscription_id: str = Field(..., description="VPS subscription ID to link this zone")


class DNSZoneUpdate(BaseModel):
    """Schema for updating DNS zones."""
    ttl_default: Optional[int] = Field(None, ge=60, le=86400)
    notes: Optional[str] = Field(None, max_length=1000)
    status: Optional[DNSZoneStatus] = None


class DNSZoneResponse(DNSZoneBase):
    """Schema for DNS zone responses."""
    id: str
    subscription_id: Optional[str]
    status: DNSZoneStatus
    is_system_managed: bool
    last_updated_serial: Optional[int]
    nameservers: Optional[List[str]]
    soa_record: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DNSZoneDetailResponse(DNSZoneResponse):
    """Detailed DNS zone response with records."""
    records: List["DNSRecordResponse"] = []
    record_count: Optional[int] = None


class DNSZoneListResponse(BaseModel):
    """Paginated list of DNS zones."""
    items: List[DNSZoneResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# DNS Record Schemas
# ============================================================================

class DNSRecordBase(BaseModel):
    """Base schema for DNS records."""
    record_name: str = Field(..., min_length=1, max_length=255, description="Record name (e.g., @, www, mail)")
    record_type: DNSRecordType = Field(..., description="DNS record type")
    record_value: str = Field(..., min_length=1, max_length=500, description="Record value/target")
    ttl: Optional[int] = Field(None, ge=60, le=86400, description="TTL (uses zone default if not set)")
    priority: Optional[int] = Field(None, ge=0, le=65535, description="Priority (for MX/SRV records)")
    weight: Optional[int] = Field(None, ge=0, le=65535, description="Weight (for SRV records)")
    port: Optional[int] = Field(None, ge=1, le=65535, description="Port (for SRV records)")

    @field_validator('record_value')
    @classmethod
    def validate_record_value(cls, v: str, info) -> str:
        """Validate record value based on record type."""
        record_type = info.data.get('record_type')

        if record_type == DNSRecordType.A:
            # Validate IPv4
            try:
                ipaddress.IPv4Address(v)
            except ValueError:
                raise ValueError(f"Invalid IPv4 address: {v}")

        elif record_type == DNSRecordType.AAAA:
            # Validate IPv6
            try:
                ipaddress.IPv6Address(v)
            except ValueError:
                raise ValueError(f"Invalid IPv6 address: {v}")

        elif record_type == DNSRecordType.CNAME:
            # Validate FQDN
            if not re.match(r'^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?\.?$', v, re.IGNORECASE):
                raise ValueError(f"Invalid CNAME target: {v}")

        elif record_type == DNSRecordType.MX:
            # Validate mail server hostname
            if not re.match(r'^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?\.?$', v, re.IGNORECASE):
                raise ValueError(f"Invalid MX hostname: {v}")

        elif record_type == DNSRecordType.TXT:
            # TXT records can be up to 255 characters per string
            if len(v) > 500:
                raise ValueError("TXT record too long (max 500 characters)")

        elif record_type == DNSRecordType.NS:
            # Validate nameserver hostname
            if not re.match(r'^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?\.?$', v, re.IGNORECASE):
                raise ValueError(f"Invalid NS hostname: {v}")

        return v

    @field_validator('record_name')
    @classmethod
    def validate_record_name(cls, v: str) -> str:
        """Validate record name."""
        # Allow @ for root, alphanumeric, dots, hyphens, underscores
        if v == '@':
            return v

        if not re.match(r'^[a-z0-9_]([a-z0-9\-_\.]*[a-z0-9_])?$', v, re.IGNORECASE):
            raise ValueError("Invalid record name format")

        if len(v) > 255:
            raise ValueError("Record name too long (max 255 characters)")

        return v.lower()

    def model_post_init(self, __context: Any) -> None:
        """Validate record-specific requirements."""
        # MX and SRV records require priority
        if self.record_type in [DNSRecordType.MX, DNSRecordType.SRV]:
            if self.priority is None:
                raise ValueError(f"{self.record_type} records require priority")

        # SRV records require weight and port
        if self.record_type == DNSRecordType.SRV:
            if self.weight is None or self.port is None:
                raise ValueError("SRV records require weight and port")


class DNSRecordCreate(DNSRecordBase):
    """Schema for creating DNS records."""
    pass


class DNSRecordUpdate(BaseModel):
    """Schema for updating DNS records."""
    record_value: Optional[str] = Field(None, min_length=1, max_length=500)
    ttl: Optional[int] = Field(None, ge=60, le=86400)
    priority: Optional[int] = Field(None, ge=0, le=65535)
    weight: Optional[int] = Field(None, ge=0, le=65535)
    port: Optional[int] = Field(None, ge=1, le=65535)


class DNSRecordResponse(DNSRecordBase):
    """Schema for DNS record responses."""
    id: str
    zone_id: str
    is_system_managed: bool
    record_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[str]
    last_modified_by_id: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class DNSRecordListResponse(BaseModel):
    """List of DNS records."""
    items: List[DNSRecordResponse]
    total: int


# ============================================================================
# Bulk Operations Schemas
# ============================================================================

class BulkRecordCreate(BaseModel):
    """Schema for bulk record creation."""
    records: List[DNSRecordCreate] = Field(..., min_length=1, max_length=100, description="Records to create")


class BulkRecordResult(BaseModel):
    """Result for a single bulk operation."""
    index: int
    success: bool
    record: Optional[DNSRecordResponse] = None
    error: Optional[str] = None


class BulkRecordResponse(BaseModel):
    """Schema for bulk record operation response."""
    created: List[DNSRecordResponse] = []
    failed: List[Dict[str, Any]] = []
    success_count: int
    failure_count: int


# ============================================================================
# DNS Zone Template Schemas
# ============================================================================

class DNSTemplateRecordDefinition(BaseModel):
    """Template for a DNS record."""
    record_name: str = Field(..., description="Record name (supports {VPS_IP} placeholder)")
    record_type: DNSRecordType
    record_value: str = Field(..., description="Record value (supports {VPS_IP}, {ZONE_NAME} placeholders)")
    ttl: Optional[int] = Field(None, ge=60, le=86400)
    priority: Optional[int] = Field(None, ge=0, le=65535)


class DNSZoneTemplateBase(BaseModel):
    """Base schema for zone templates."""
    name: str = Field(..., min_length=1, max_length=100)
    template_type: DNSTemplateType = Field(default=DNSTemplateType.CUSTOM)
    description: Optional[str] = Field(None, max_length=500)
    record_definitions: List[DNSTemplateRecordDefinition] = Field(default_factory=list)


class DNSZoneTemplateCreate(DNSZoneTemplateBase):
    """Schema for creating zone templates."""
    pass


class DNSZoneTemplateUpdate(BaseModel):
    """Schema for updating zone templates."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    record_definitions: Optional[List[DNSTemplateRecordDefinition]] = None
    is_active: Optional[bool] = None


class DNSZoneTemplateResponse(DNSZoneTemplateBase):
    """Schema for zone template responses."""
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplyTemplateRequest(BaseModel):
    """Schema for applying a template to a zone."""
    template_id: str = Field(..., description="Template ID to apply")
    replace_existing: bool = Field(default=False, description="Replace existing records")
    variables: Optional[Dict[str, str]] = Field(default_factory=dict, description="Template variable values")


# ============================================================================
# DNS Sync Log Schemas
# ============================================================================

class DNSSyncLogResponse(BaseModel):
    """Schema for sync log responses."""
    id: str
    zone_id: Optional[str]
    sync_type: DNSSyncType
    status: DNSSyncStatus
    error_message: Optional[str]
    triggered_by_id: Optional[str]
    triggered_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class DNSSyncLogListResponse(BaseModel):
    """Paginated list of sync logs."""
    items: List[DNSSyncLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# CoreDNS Management Schemas
# ============================================================================

class CoreDNSStatusResponse(BaseModel):
    """Schema for CoreDNS status."""
    is_healthy: bool
    version: Optional[str] = None
    zones_loaded: int
    records_total: int
    last_reload: Optional[datetime] = None
    uptime: Optional[str] = None


class CoreDNSReloadRequest(BaseModel):
    """Schema for manual CoreDNS reload."""
    force: bool = Field(default=False, description="Force reload even if no changes detected")


class CoreDNSReloadResponse(BaseModel):
    """Schema for CoreDNS reload response."""
    success: bool
    message: str
    zones_reloaded: int
    reload_time_ms: Optional[int] = None


# ============================================================================
# System Zone Schemas (Admin-only)
# ============================================================================

class SystemDNSZoneCreate(BaseModel):
    """Schema for creating system DNS zones (no subscription link)."""
    zone_name: str = Field(..., min_length=1, max_length=255)
    zone_type: DNSZoneType = Field(default=DNSZoneType.FORWARD)
    ttl_default: int = Field(default=3600, ge=60, le=86400)
    notes: Optional[str] = None

    @field_validator('zone_name')
    @classmethod
    def validate_zone_name(cls, v: str) -> str:
        """Validate zone name."""
        if not re.match(r'^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$', v, re.IGNORECASE):
            raise ValueError("Invalid zone name format")
        return v.lower()


# ============================================================================
# Statistics Schemas
# ============================================================================

class DNSZoneStatistics(BaseModel):
    """Statistics for DNS zones."""
    total_zones: int
    active_zones: int
    pending_zones: int
    suspended_zones: int
    deleted_zones: int
    total_records: int
    zones_by_subscription: Dict[str, int]


class DNSRecordStatistics(BaseModel):
    """Statistics for DNS records."""
    total_records: int
    records_by_type: Dict[str, int]
    system_managed_count: int
    user_managed_count: int


# Forward references
DNSZoneDetailResponse.model_rebuild()

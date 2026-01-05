/**
 * DNS Management Type Definitions
 * 
 * Defines TypeScript types for DNS zones, records, templates, and related entities.
 * Matches backend schema from dns_schemas.py
 */

// ============================================================================
// Enums
// ============================================================================

export enum DNSZoneStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum DNSRecordType {
  A = "A",
  AAAA = "AAAA",
  CNAME = "CNAME",
  MX = "MX",
  TXT = "TXT",
  NS = "NS",
  SRV = "SRV",
  PTR = "PTR",
  SOA = "SOA",
}

export enum DNSZoneType {
  FORWARD = "FORWARD",
  REVERSE = "REVERSE",
}

export enum DNSTemplateType {
  WEB_SERVER = "WEB_SERVER",
  MAIL_SERVER = "MAIL_SERVER",
  FULL_STACK = "FULL_STACK",
  CUSTOM = "CUSTOM",
}

export enum DNSSyncType {
  ZONE_CREATE = "ZONE_CREATE",
  ZONE_UPDATE = "ZONE_UPDATE",
  ZONE_DELETE = "ZONE_DELETE",
  RECORD_UPDATE = "RECORD_UPDATE",
  FULL_RELOAD = "FULL_RELOAD",
  CONFIG_UPDATE = "CONFIG_UPDATE",
}

export enum DNSSyncStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PENDING = "PENDING",
}

// ============================================================================
// Core Interfaces
// ============================================================================

export interface DNSZone {
  id: string;
  zone_name: string;
  zone_type: DNSZoneType;
  subscription_id?: string;
  status: DNSZoneStatus;
  ttl_default: number;
  is_system_managed: boolean;
  last_updated_serial?: number;
  nameservers?: string[];
  soa_record?: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
  last_modified_by_id?: string;
}

export interface DNSZoneDetail extends DNSZone {
  records: DNSRecord[];
  record_count?: number;
}

export interface DNSRecord {
  id: string;
  zone_id: string;
  record_name: string;
  record_type: DNSRecordType;
  record_value: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
  is_system_managed: boolean;
  record_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
  last_modified_by_id?: string;
}

export interface DNSTemplate {
  id: string;
  name: string;
  template_type: DNSTemplateType;
  description?: string;
  record_definitions: DNSTemplateRecordDefinition[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DNSTemplateRecordDefinition {
  record_name: string;
  record_type: DNSRecordType;
  record_value: string;
  ttl?: number;
  priority?: number;
}

export interface DNSSyncLog {
  id: string;
  zone_id?: string;
  sync_type: DNSSyncType;
  status: DNSSyncStatus;
  error_message?: string;
  triggered_by_id?: string;
  triggered_at: string;
  completed_at?: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateDNSZoneRequest {
  zone_name: string;
  subscription_id: string;
  zone_type?: DNSZoneType;
  ttl_default?: number;
  notes?: string;
}

export interface UpdateDNSZoneRequest {
  ttl_default?: number;
  notes?: string;
  status?: DNSZoneStatus;
}

export interface CreateDNSRecordRequest {
  record_name: string;
  record_type: DNSRecordType;
  record_value: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
}

export interface UpdateDNSRecordRequest {
  record_value?: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
}

export interface BulkRecordCreateRequest {
  records: CreateDNSRecordRequest[];
}

export interface ApplyTemplateRequest {
  template_id: string;
  replace_existing?: boolean;
  variables?: Record<string, string>;
}

export interface CreateTemplateRequest {
  name: string;
  template_type?: DNSTemplateType;
  description?: string;
  record_definitions: DNSTemplateRecordDefinition[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  record_definitions?: DNSTemplateRecordDefinition[];
  is_active?: boolean;
}

export interface CreateSystemZoneRequest {
  zone_name: string;
  zone_type?: DNSZoneType;
  ttl_default?: number;
  notes?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface DNSZoneListResponse {
  items: DNSZone[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DNSRecordListResponse {
  items: DNSRecord[];
  total: number;
}

export interface BulkRecordResult {
  index: number;
  success: boolean;
  record?: DNSRecord;
  error?: string;
}

export interface BulkRecordResponse {
  created: DNSRecord[];
  failed: Array<{ index: number; error: string }>;
  success_count: number;
  failure_count: number;
}

export interface DNSZoneStatistics {
  total_zones: number;
  active_zones: number;
  pending_zones: number;
  suspended_zones: number;
  deleted_zones: number;
  total_records: number;
  zones_by_subscription: Record<string, number>;
}

export interface DNSRecordStatistics {
  total_records: number;
  records_by_type: Record<string, number>;
  system_managed_count: number;
  user_managed_count: number;
}

export interface CoreDNSStatus {
  is_healthy: boolean;
  version?: string;
  zones_loaded: number;
  records_total: number;
  last_reload?: string;
  uptime?: string;
  health_check?: any;
}

export interface CoreDNSReloadResponse {
  success: boolean;
  message: string;
  zones_reloaded?: number;
  reload_time_ms?: number;
}

export interface DNSSyncLogListResponse {
  items: DNSSyncLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * DNS Management API Service
 * 
 * Provides API methods for DNS zones, records, templates, and admin operations.
 * Follows the pattern from VPS hosting service.
 */
import { apiClient } from "@/shared/api/client";
import type {
  DNSZone,
  DNSZoneDetail,
  DNSZoneListResponse,
  DNSRecord,
  DNSRecordListResponse,
  DNSTemplate,
  DNSZoneStatistics,
  DNSRecordStatistics,
  CoreDNSStatus,
  CoreDNSReloadResponse,
  DNSSyncLogListResponse,
  CreateDNSZoneRequest,
  UpdateDNSZoneRequest,
  CreateDNSRecordRequest,
  UpdateDNSRecordRequest,
  BulkRecordCreateRequest,
  BulkRecordResponse,
  ApplyTemplateRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateSystemZoneRequest,
  DNSZoneStatus,
  DNSRecordType,
  DNSSyncType,
  DNSSyncStatus,
} from "../types";

export const dnsService = {
  // ============================================================================
  // Client: DNS Zones
  // ============================================================================

  /**
   * Get customer's DNS zones with pagination and filters
   */
  async getZones(params?: {
    skip?: number;
    limit?: number;
    subscription_id?: string;
    status?: DNSZoneStatus;
    zone_name?: string;
  }): Promise<DNSZoneListResponse> {
    const response = await apiClient.get("/hosting/dns/zones", { params });
    return response.data;
  },

  /**
   * Get DNS zone by ID with records
   */
  async getZone(zoneId: string): Promise<DNSZoneDetail> {
    const response = await apiClient.get(`/hosting/dns/zones/${zoneId}`);
    return response.data;
  },

  /**
   * Create new DNS zone
   */
  async createZone(data: CreateDNSZoneRequest): Promise<DNSZone> {
    const response = await apiClient.post("/hosting/dns/zones", data);
    return response.data;
  },

  /**
   * Update DNS zone settings
   */
  async updateZone(zoneId: string, data: UpdateDNSZoneRequest): Promise<DNSZone> {
    const response = await apiClient.put(`/hosting/dns/zones/${zoneId}`, data);
    return response.data;
  },

  /**
   * Delete DNS zone
   */
  async deleteZone(zoneId: string): Promise<void> {
    await apiClient.delete(`/hosting/dns/zones/${zoneId}`);
  },

  // ============================================================================
  // Client: DNS Records
  // ============================================================================

  /**
   * Get records for a DNS zone
   */
  async getRecords(zoneId: string, params?: {
    record_type?: DNSRecordType;
    include_system?: boolean;
  }): Promise<DNSRecordListResponse> {
    const response = await apiClient.get(`/hosting/dns/zones/${zoneId}/records`, { params });
    return response.data;
  },

  /**
   * Get single DNS record
   */
  async getRecord(recordId: string): Promise<DNSRecord> {
    const response = await apiClient.get(`/hosting/dns/records/${recordId}`);
    return response.data;
  },

  /**
   * Create DNS record
   */
  async createRecord(zoneId: string, data: CreateDNSRecordRequest): Promise<DNSRecord> {
    const response = await apiClient.post(`/hosting/dns/zones/${zoneId}/records`, data);
    return response.data;
  },

  /**
   * Bulk create DNS records
   */
  async bulkCreateRecords(zoneId: string, data: BulkRecordCreateRequest): Promise<BulkRecordResponse> {
    const response = await apiClient.post(`/hosting/dns/zones/${zoneId}/records/bulk`, data);
    return response.data;
  },

  /**
   * Update DNS record
   */
  async updateRecord(recordId: string, data: UpdateDNSRecordRequest): Promise<DNSRecord> {
    const response = await apiClient.put(`/hosting/dns/records/${recordId}`, data);
    return response.data;
  },

  /**
   * Delete DNS record
   */
  async deleteRecord(recordId: string): Promise<void> {
    await apiClient.delete(`/hosting/dns/records/${recordId}`);
  },

  // ============================================================================
  // Client: Templates
  // ============================================================================

  /**
   * Get available DNS zone templates
   */
  async getTemplates(): Promise<DNSTemplate[]> {
    const response = await apiClient.get("/hosting/dns/templates");
    return response.data;
  },

  /**
   * Apply template to DNS zone
   */
  async applyTemplate(zoneId: string, data: ApplyTemplateRequest): Promise<BulkRecordResponse> {
    const response = await apiClient.post(`/hosting/dns/zones/${zoneId}/apply-template`, data);
    return response.data;
  },

  // ============================================================================
  // Client: Statistics
  // ============================================================================

  /**
   * Get DNS zone statistics for current customer
   */
  async getZoneStatistics(): Promise<DNSZoneStatistics> {
    const response = await apiClient.get("/hosting/dns/statistics/zones");
    return response.data;
  },

  // ============================================================================
  // Admin: All Zones
  // ============================================================================

  /**
   * Get all DNS zones (admin view)
   */
  async getAllZones(params?: {
    skip?: number;
    limit?: number;
    customer_id?: string;
    subscription_id?: string;
    status?: DNSZoneStatus;
    zone_name?: string;
  }): Promise<DNSZoneListResponse> {
    const response = await apiClient.get("/hosting/admin/dns/zones", { params });
    return response.data;
  },

  /**
   * Get zone by ID (admin)
   */
  async getZoneById(zoneId: string): Promise<DNSZoneDetail> {
    const response = await apiClient.get(`/hosting/admin/dns/zones/${zoneId}`);
    return response.data;
  },

  // ============================================================================
  // Admin: System Zones
  // ============================================================================

  /**
   * Create system DNS zone (no subscription link)
   */
  async createSystemZone(data: CreateSystemZoneRequest): Promise<DNSZone> {
    const response = await apiClient.post("/hosting/admin/dns/zones/system", data);
    return response.data;
  },

  /**
   * Activate DNS zone
   */
  async activateZone(zoneId: string): Promise<DNSZone> {
    const response = await apiClient.post(`/hosting/admin/dns/zones/${zoneId}/activate`);
    return response.data;
  },

  /**
   * Suspend DNS zone
   */
  async suspendZone(zoneId: string, reason: string): Promise<DNSZone> {
    const response = await apiClient.post(`/hosting/admin/dns/zones/${zoneId}/suspend`, { reason });
    return response.data;
  },

  // ============================================================================
  // Admin: CoreDNS Management
  // ============================================================================

  /**
   * Get CoreDNS health status
   */
  async getCoreDNSStatus(): Promise<CoreDNSStatus> {
    const response = await apiClient.get("/hosting/admin/dns/coredns/status");
    return response.data;
  },

  /**
   * Reload CoreDNS configuration
   */
  async reloadCoreDNS(force: boolean = false): Promise<CoreDNSReloadResponse> {
    const response = await apiClient.post("/hosting/admin/dns/coredns/reload", { force });
    return response.data;
  },

  /**
   * Regenerate entire CoreDNS configuration
   */
  async regenerateCoreDNSConfig(): Promise<CoreDNSReloadResponse> {
    const response = await apiClient.post("/hosting/admin/dns/coredns/regenerate-config");
    return response.data;
  },

  // ============================================================================
  // Admin: Sync Logs
  // ============================================================================

  /**
   * Get DNS sync operation logs
   */
  async getSyncLogs(params?: {
    skip?: number;
    limit?: number;
    zone_id?: string;
    sync_type?: DNSSyncType;
    status?: DNSSyncStatus;
  }): Promise<DNSSyncLogListResponse> {
    const response = await apiClient.get("/hosting/admin/dns/sync-logs", { params });
    return response.data;
  },

  // ============================================================================
  // Admin: Template Management
  // ============================================================================

  /**
   * Get all DNS templates (admin)
   */
  async getAdminTemplates(): Promise<DNSTemplate[]> {
    const response = await apiClient.get("/hosting/admin/dns/templates");
    return response.data;
  },

  /**
   * Create new DNS template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<DNSTemplate> {
    const response = await apiClient.post("/hosting/admin/dns/templates", data);
    return response.data;
  },

  /**
   * Update DNS template
   */
  async updateTemplate(templateId: string, data: UpdateTemplateRequest): Promise<DNSTemplate> {
    const response = await apiClient.put(`/hosting/admin/dns/templates/${templateId}`, data);
    return response.data;
  },

  /**
   * Delete DNS template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/hosting/admin/dns/templates/${templateId}`);
  },
};

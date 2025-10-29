/**
 * Audit Log Types
 *
 * Type definitions for audit logs
 */

export interface AuditLog {
  id: string;
  user_id: string;
  user_email?: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource?: string;
  start_date?: string;
  end_date?: string;
}

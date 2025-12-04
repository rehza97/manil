/**
 * Audit API Client
 *
 * Handles audit log and activity tracking API calls
 *
 * @module shared/api/audit
 */

import { apiClient } from "./client";
import type { AxiosResponse } from "axios";

// ============================================================================
// Types
// ============================================================================

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  user_agent?: string;
  status: "success" | "failed";
  error_message?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface AuditLogResponse {
  items: AuditLog[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Audit API Client
 */
export const auditApi = {
  /**
   * Get audit logs with filters and pagination
   * GET /api/v1/audit
   */
  getAuditLogs: async (params?: {
    skip?: number;
    limit?: number;
    user_id?: string;
    action?: string;
    entity_type?: string;
    status?: "success" | "failed";
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLogResponse> => {
    const response: AxiosResponse<AuditLogResponse> = await apiClient.get(
      "/audit",
      { params }
    );
    return response.data;
  },

  /**
   * Get audit logs for current user
   * GET /api/v1/audit/me
   */
  getMyAuditLogs: async (params?: {
    skip?: number;
    limit?: number;
    action?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLogResponse> => {
    const response: AxiosResponse<AuditLogResponse> = await apiClient.get(
      "/audit/me",
      { params }
    );
    return response.data;
  },

  /**
   * Get audit logs for a specific user
   * GET /api/v1/audit/user/{user_id}
   */
  getUserAuditLogs: async (
    userId: string,
    params?: {
      skip?: number;
      limit?: number;
      action?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<AuditLogResponse> => {
    const response: AxiosResponse<AuditLogResponse> = await apiClient.get(
      `/audit/user/${userId}`,
      { params }
    );
    return response.data;
  },
};

export default auditApi;

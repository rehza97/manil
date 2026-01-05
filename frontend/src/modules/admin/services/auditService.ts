/**
 * Audit Log Service
 *
 * API service for audit log operations
 */

import { apiClient } from "@/shared/api";
import type { AuditLog, AuditLogListResponse, AuditLogFilters } from "../types";

export const auditService = {
  /**
   * Get all audit logs with pagination and filters
   */
  async getAuditLogs(
    page: number = 1,
    pageSize: number = 20,
    filters?: AuditLogFilters
  ): Promise<AuditLogListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    // Add filter parameters only if they are defined
    if (filters) {
      if (filters.action) {
        params.append("action", filters.action);
      }
      if (filters.resource_type) {
        params.append("resource_type", filters.resource_type);
      }
      if (filters.resource_id) {
        params.append("resource_id", filters.resource_id);
      }
      if (filters.user_email) {
        params.append("user_email", filters.user_email);
      }
      if (filters.user_id) {
        params.append("user_id", filters.user_id);
      }
      if (filters.start_date) {
        params.append("start_date", filters.start_date);
      }
      if (filters.end_date) {
        params.append("end_date", filters.end_date);
      }
      // Handle success filter (boolean)
      if (filters.success !== undefined && filters.success !== null) {
        params.append("success", filters.success.toString());
      }
      // Ignore status filter - backend doesn't support it
      // If status is passed, it will be ignored
    }

    const queryString = params.toString();
    const response = await apiClient.get<AuditLogListResponse>(
      `/audit${queryString ? `?${queryString}` : ""}`
    );
    return response.data;
  },

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<AuditLogListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    const response = await apiClient.get<AuditLogListResponse>(
      `/audit/user/${userId}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get my audit logs
   */
  async getMyAuditLogs(
    page: number = 1,
    pageSize: number = 20
  ): Promise<AuditLogListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    const response = await apiClient.get<AuditLogListResponse>(
      `/audit/me?${params.toString()}`
    );
    return response.data;
  },
};

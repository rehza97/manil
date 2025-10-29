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
      ...(filters as any),
    });

    const response = await apiClient.get<AuditLogListResponse>(
      `/audit?${params.toString()}`
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

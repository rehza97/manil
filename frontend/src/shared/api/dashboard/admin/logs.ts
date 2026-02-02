/**
 * Admin Logs API
 *
 * @module shared/api/dashboard/admin/logs
 */

import { apiClient } from "../../client";

export type LogExportFormat = "csv" | "excel";

export interface LogExportResponse {
  file_name: string;
  format: string;
}

export const adminLogsApi = {
  getAuditLogs: async (): Promise<any> => {
    const response = await apiClient.get("/admin/logs/audit");
    return response.data;
  },

  getSecurityLogs: async (): Promise<any> => {
    const response = await apiClient.get("/admin/logs/security");
    return response.data;
  },

  getSystemLogs: async (): Promise<any> => {
    const response = await apiClient.get("/admin/logs/system");
    return response.data;
  },

  getUserActivityLogs: async (userId: string): Promise<any> => {
    const response = await apiClient.get(`/admin/logs/users/${userId}`);
    return response.data;
  },

  /** Export audit logs. Returns file_name for download via /reports/export/download/{file_name}. */
  exportAuditLogs: async (
    format: LogExportFormat,
    params?: { action?: string; resource_type?: string; user_email?: string; success?: boolean }
  ): Promise<LogExportResponse> => {
    const response = await apiClient.get<LogExportResponse>("/admin/logs/audit/export", {
      params: { format, ...params },
    });
    return response.data;
  },

  /** Export security logs. */
  exportSecurityLogs: async (format: LogExportFormat): Promise<LogExportResponse> => {
    const response = await apiClient.get<LogExportResponse>("/admin/logs/security/export", {
      params: { format },
    });
    return response.data;
  },

  /** Export system logs. */
  exportSystemLogs: async (format: LogExportFormat): Promise<LogExportResponse> => {
    const response = await apiClient.get<LogExportResponse>("/admin/logs/system/export", {
      params: { format },
    });
    return response.data;
  },

  /** Export user activity logs. */
  exportUserActivityLogs: async (
    userId: string,
    format: LogExportFormat
  ): Promise<LogExportResponse> => {
    const response = await apiClient.get<LogExportResponse>(
      `/admin/logs/users/${userId}/export`,
      { params: { format } }
    );
    return response.data;
  },
};

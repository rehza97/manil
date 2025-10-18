/**
 * Admin Logs API
 *
 * @module shared/api/dashboard/admin/logs
 */

import { apiClient } from "../../client";

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
};

/**
 * Admin Reports API
 *
 * @module shared/api/dashboard/admin/reports
 */

import { apiClient } from "../../client";

export const adminReportsApi = {
  getUserReports: async (): Promise<any> => {
    const response = await apiClient.get("/admin/reports/users");
    return response.data;
  },

  getActivityReports: async (): Promise<any> => {
    const response = await apiClient.get("/admin/reports/activity");
    return response.data;
  },

  getSecurityReports: async (): Promise<any> => {
    const response = await apiClient.get("/admin/reports/security");
    return response.data;
  },

  getPerformanceReports: async (): Promise<any> => {
    const response = await apiClient.get("/admin/reports/performance");
    return response.data;
  },
};

/**
 * Admin System Maintenance API
 *
 * @module shared/api/dashboard/admin/maintenance
 */

import { apiClient } from "../../client";

export const adminMaintenanceApi = {
  getBackupManagement: async (): Promise<any> => {
    const response = await apiClient.get("/admin/maintenance/backup");
    return response.data;
  },

  getCacheManagement: async (): Promise<any> => {
    const response = await apiClient.get("/admin/maintenance/cache");
    return response.data;
  },

  getDataCleanup: async (): Promise<any> => {
    const response = await apiClient.get("/admin/maintenance/cleanup");
    return response.data;
  },

  getDatabaseMigrations: async (): Promise<any> => {
    const response = await apiClient.get("/admin/maintenance/migrations");
    return response.data;
  },
};

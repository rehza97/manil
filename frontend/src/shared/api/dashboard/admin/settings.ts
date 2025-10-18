/**
 * Admin System Settings API
 *
 * @module shared/api/dashboard/admin/settings
 */

import { apiClient } from "../../client";

export const adminSettingsApi = {
  getGeneralSettings: async (): Promise<any> => {
    const response = await apiClient.get("/admin/settings/general");
    return response.data;
  },

  updateGeneralSettings: async (data: any): Promise<any> => {
    const response = await apiClient.put("/admin/settings/general", data);
    return response.data;
  },

  getSecuritySettings: async (): Promise<any> => {
    const response = await apiClient.get("/admin/settings/security");
    return response.data;
  },

  updateSecuritySettings: async (data: any): Promise<any> => {
    const response = await apiClient.put("/admin/settings/security", data);
    return response.data;
  },

  getEmailSettings: async (): Promise<any> => {
    const response = await apiClient.get("/admin/settings/email");
    return response.data;
  },

  updateEmailSettings: async (data: any): Promise<any> => {
    const response = await apiClient.put("/admin/settings/email", data);
    return response.data;
  },
};

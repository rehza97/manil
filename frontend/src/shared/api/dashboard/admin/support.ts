/**
 * Admin Support Management API
 *
 * @module shared/api/dashboard/admin/support
 */

import { apiClient } from "../../client";

export const adminSupportApi = {
  getSupportGroups: async (): Promise<any> => {
    const response = await apiClient.get("/admin/support/groups");
    return response.data;
  },

  getTicketCategories: async (): Promise<any> => {
    const response = await apiClient.get("/admin/support/categories");
    return response.data;
  },

  getResponseTemplates: async (): Promise<any> => {
    const response = await apiClient.get("/admin/support/templates");
    return response.data;
  },

  getAutomationRules: async (): Promise<any> => {
    const response = await apiClient.get("/admin/support/automation");
    return response.data;
  },
};

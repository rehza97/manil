/**
 * Corporate Settings API
 *
 * @module shared/api/dashboard/corporate/settings
 */

import { apiClient } from "../../client";

export const corporateSettingsApi = {
  getSettings: async (): Promise<any> => {
    const response = await apiClient.get("/corporate/settings");
    return response.data;
  },

  updateSettings: async (data: any): Promise<any> => {
    const response = await apiClient.put("/corporate/settings", data);
    return response.data;
  },

  getNotificationSettings: async (): Promise<any> => {
    const response = await apiClient.get("/corporate/settings/notifications");
    return response.data;
  },

  updateNotificationSettings: async (data: any): Promise<any> => {
    const response = await apiClient.put(
      "/corporate/settings/notifications",
      data
    );
    return response.data;
  },
};

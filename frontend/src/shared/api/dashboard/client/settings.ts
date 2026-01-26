/**
 * Client Settings API
 *
 * @module shared/api/dashboard/client/settings
 */

import { apiClient } from "../../client";
import type { NotificationPrefs } from "@/modules/settings/types";

export const clientSettingsApi = {
  getNotificationSettings: async (): Promise<NotificationPrefs> => {
    const response = await apiClient.get<NotificationPrefs>("/client/settings/notifications");
    return response.data;
  },

  updateNotificationSettings: async (settings: NotificationPrefs): Promise<NotificationPrefs> => {
    const response = await apiClient.put<NotificationPrefs>(
      "/client/settings/notifications",
      settings
    );
    return response.data;
  },

  getSecuritySettings: async (): Promise<any> => {
    const response = await apiClient.get("/client/settings/security");
    return response.data;
  },

  updateSecuritySettings: async (settings: any): Promise<any> => {
    const response = await apiClient.put("/client/settings/security", settings);
    return response.data;
  },

  getPrivacySettings: async (): Promise<any> => {
    const response = await apiClient.get("/client/settings/privacy");
    return response.data;
  },

  updatePrivacySettings: async (settings: any): Promise<any> => {
    const response = await apiClient.put("/client/settings/privacy", settings);
    return response.data;
  },
};

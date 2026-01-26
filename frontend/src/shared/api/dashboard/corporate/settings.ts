/**
 * Corporate Settings API
 *
 * @module shared/api/dashboard/corporate/settings
 */

import { apiClient } from "../../client";
import type { NotificationPrefs } from "@/modules/settings/types";

export const corporateSettingsApi = {
  getSettings: async (): Promise<unknown> => {
    const response = await apiClient.get("/corporate/settings");
    return response.data;
  },

  updateSettings: async (data: unknown): Promise<unknown> => {
    const response = await apiClient.put("/corporate/settings", data);
    return response.data;
  },

  getNotificationSettings: async (): Promise<NotificationPrefs> => {
    const response = await apiClient.get<NotificationPrefs>("/corporate/settings/notifications");
    return response.data;
  },

  updateNotificationSettings: async (data: NotificationPrefs): Promise<NotificationPrefs> => {
    const response = await apiClient.put<NotificationPrefs>(
      "/corporate/settings/notifications",
      data
    );
    return response.data;
  },
};

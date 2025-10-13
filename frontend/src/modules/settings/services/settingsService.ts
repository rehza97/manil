import { apiClient } from "@/shared/api";
import type {
  UserSettings,
  UpdateUserSettingsDTO,
  SystemSettings,
} from "../types";

export const settingsService = {
  async getUserSettings(): Promise<UserSettings> {
    const response = await apiClient.get<UserSettings>("/settings/user");
    return response.data;
  },

  async updateUserSettings(data: UpdateUserSettingsDTO): Promise<UserSettings> {
    const response = await apiClient.put<UserSettings>("/settings/user", data);
    return response.data;
  },

  async getSystemSettings(): Promise<SystemSettings[]> {
    const response = await apiClient.get<SystemSettings[]>("/settings/system");
    return response.data;
  },

  async updateSystemSetting(
    key: string,
    value: string
  ): Promise<SystemSettings> {
    const response = await apiClient.put<SystemSettings>(
      `/settings/system/${key}`,
      {
        value,
      }
    );
    return response.data;
  },
};

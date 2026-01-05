/**
 * Settings Service
 *
 * API service for system settings management
 */

import { apiClient } from "@/shared/api/client";

export interface Setting {
  key: string;
  value: any;
  category: string;
  description: string;
  is_public: boolean;
}

export interface GeneralSettings {
  application_name: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  date_format: string;
  currency: string;
  language: string;
}

export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  from_email: string;
  from_name: string;
}

export interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  require_2fa: boolean;
}

export interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  maintenance_notifications: boolean;
  security_notifications: boolean;
  marketing_notifications: boolean;
}

export interface StorageSettings {
  max_file_size: number;
  allowed_file_types: string[];
  storage_provider: "local" | "s3" | "azure" | "gcp";
  storage_config: Record<string, any>;
}

export interface BackupSettings {
  backup_enabled: boolean;
  backup_frequency: "daily" | "weekly" | "monthly";
  backup_retention_days: number;
  backup_location: string;
  auto_backup: boolean;
}

export interface SystemSettings {
  general: GeneralSettings;
  email: EmailSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  storage: StorageSettings;
  backup: BackupSettings;
}

export const settingsService = {
  /**
   * Get all system settings
   */
  async getSettings(): Promise<SystemSettings> {
    const response = await apiClient.get("/admin/settings");
    return response.data;
  },

  /**
   * Update general settings
   */
  async updateGeneralSettings(
    settings: Partial<GeneralSettings>
  ): Promise<GeneralSettings> {
    const response = await apiClient.put("/admin/settings/general", settings);
    return response.data;
  },

  /**
   * Update email settings
   */
  async updateEmailSettings(
    settings: Partial<EmailSettings>
  ): Promise<EmailSettings> {
    const response = await apiClient.put("/admin/settings/email", settings);
    return response.data;
  },

  /**
   * Update security settings
   */
  async updateSecuritySettings(
    settings: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    const response = await apiClient.put("/admin/settings/security", settings);
    return response.data;
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const response = await apiClient.put(
      "/admin/settings/notifications",
      settings
    );
    return response.data;
  },

  /**
   * Update storage settings
   */
  async updateStorageSettings(
    settings: Partial<StorageSettings>
  ): Promise<StorageSettings> {
    const response = await apiClient.put("/admin/settings/storage", settings);
    return response.data;
  },

  /**
   * Update backup settings
   */
  async updateBackupSettings(
    settings: Partial<BackupSettings>
  ): Promise<BackupSettings> {
    const response = await apiClient.put("/admin/settings/backup", settings);
    return response.data;
  },

  /**
   * Test email configuration
   */
  async testEmailConfig(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post("/admin/settings/email/test");
    return response.data;
  },

  /**
   * Test storage configuration
   */
  async testStorageConfig(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post("/admin/settings/storage/test");
    return response.data;
  },

  /**
   * Get settings by category (new backend API)
   */
  async getSettingsByCategory(category: string): Promise<Setting[]> {
    const response = await apiClient.get<{ settings: Setting[] }>(`/settings/system?category=${category}`);
    // Backend returns { settings: [...], total, page, page_size, total_pages }
    return response.data.settings || [];
  },

  /**
   * Get single setting by key (new backend API)
   */
  async getSetting(key: string): Promise<Setting> {
    const response = await apiClient.get<Setting>(`/settings/system/${key}`);
    return response.data;
  },

  /**
   * Update setting value (new backend API)
   */
  async updateSetting(key: string, value: any): Promise<Setting> {
    const response = await apiClient.put<Setting>(`/settings/system/${key}`, { value });
    return response.data;
  },

  /**
   * Reset setting to default (new backend API)
   */
  async resetSetting(key: string): Promise<Setting> {
    const response = await apiClient.delete<Setting>(`/settings/system/${key}`);
    return response.data;
  },
};

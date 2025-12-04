/**
 * Settings Service
 *
 * Wrapper around centralized settingsApi for complete settings management
 * Uses centralized API client from @/shared/api
 *
 * @module modules/settings/services/settingsService
 */

import { settingsApi } from "@/shared/api";
import type {
  UserSettings,
  UpdateUserSettingsDTO,
  SystemSettings,
} from "../types";

/**
 * Settings service - uses centralized settingsApi
 * Provides roles, permissions, and system settings management
 */
export const settingsService = {
  // ========== User Settings (Module specific) ==========

  async getUserSettings(): Promise<UserSettings> {
    // This endpoint might not exist in backend
    // Keep as placeholder or remove if not needed
    throw new Error("User settings endpoint not implemented");
  },

  async updateUserSettings(data: UpdateUserSettingsDTO): Promise<UserSettings> {
    // This endpoint might not exist in backend
    throw new Error("User settings endpoint not implemented");
  },

  // ========== System Settings ==========

  async getSystemSettings(params?: {
    skip?: number;
    limit?: number;
    category?: string;
  }): Promise<SystemSettings[]> {
    const response = await settingsApi.getSystemSettings(params);
    return response as SystemSettings[];
  },

  async getPublicSettings(): Promise<SystemSettings[]> {
    const response = await settingsApi.getPublicSettings();
    return response as SystemSettings[];
  },

  async getSystemSetting(key: string): Promise<SystemSettings> {
    return await settingsApi.getSystemSetting(key);
  },

  async updateSystemSetting(
    key: string,
    value: string
  ): Promise<SystemSettings> {
    return await settingsApi.updateSystemSetting(key, { value });
  },

  async createSystemSetting(data: {
    key: string;
    value: any;
    category: string;
    description?: string;
  }): Promise<SystemSettings> {
    return await settingsApi.createSystemSetting(data);
  },

  async deleteSystemSetting(key: string): Promise<void> {
    await settingsApi.deleteSystemSetting(key);
  },

  // ========== Roles ==========

  async getRoles(params?: { skip?: number; limit?: number }): Promise<any[]> {
    const response = await settingsApi.getRoles(params);
    return response as any[];
  },

  async getRole(roleId: string): Promise<any> {
    return await settingsApi.getRole(roleId);
  },

  async createRole(data: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<any> {
    return await settingsApi.createRole(data);
  },

  async updateRole(roleId: string, data: any): Promise<any> {
    return await settingsApi.updateRole(roleId, data);
  },

  async deleteRole(roleId: string): Promise<void> {
    await settingsApi.deleteRole(roleId);
  },

  async getRolePermissions(roleId: string): Promise<any[]> {
    return await settingsApi.getRolePermissions(roleId);
  },

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<any> {
    return await settingsApi.updateRolePermissions(roleId, permissionIds);
  },

  // ========== Permissions ==========

  async getPermissions(params?: {
    skip?: number;
    limit?: number;
    category?: string;
  }): Promise<any[]> {
    const response = await settingsApi.getPermissions(params);
    return response as any[];
  },

  async getPermissionCategories(): Promise<any[]> {
    return await settingsApi.getPermissionCategories();
  },
};

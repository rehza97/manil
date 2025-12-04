/**
 * Settings API Client
 *
 * @module shared/api/settings
 */

import { apiClient } from "./client";

export const settingsApi = {
  // Permissions
  getPermissions: async (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    is_active?: boolean;
  }) => {
    const response = await apiClient.get("/settings/permissions", { params });
    return response.data;
  },

  getPermission: async (permissionId: string) => {
    const response = await apiClient.get(`/settings/permissions/${permissionId}`);
    return response.data;
  },

  createPermission: async (data: {
    name: string;
    slug: string;
    category: string;
    description?: string;
  }) => {
    const response = await apiClient.post("/settings/permissions", data);
    return response.data;
  },

  updatePermission: async (permissionId: string, data: any) => {
    const response = await apiClient.put(
      `/settings/permissions/${permissionId}`,
      data
    );
    return response.data;
  },

  deletePermission: async (permissionId: string) => {
    const response = await apiClient.delete(
      `/settings/permissions/${permissionId}`
    );
    return response.data;
  },

  getPermissionCategories: async () => {
    const response = await apiClient.get("/settings/permissions/categories");
    return response.data;
  },

  // Roles
  getRoles: async (params?: {
    skip?: number;
    limit?: number;
    is_active?: boolean;
  }) => {
    const response = await apiClient.get("/settings/roles", { params });
    return response.data;
  },

  getRole: async (roleId: string) => {
    const response = await apiClient.get(`/settings/roles/${roleId}`);
    return response.data;
  },

  createRole: async (data: {
    name: string;
    slug: string;
    description?: string;
    hierarchy_level?: number;
    parent_role_id?: string;
  }) => {
    const response = await apiClient.post("/settings/roles", data);
    return response.data;
  },

  updateRole: async (roleId: string, data: any) => {
    const response = await apiClient.put(`/settings/roles/${roleId}`, data);
    return response.data;
  },

  deleteRole: async (roleId: string) => {
    const response = await apiClient.delete(`/settings/roles/${roleId}`);
    return response.data;
  },

  getRolePermissions: async (roleId: string) => {
    const response = await apiClient.get(`/settings/roles/${roleId}/permissions`);
    return response.data;
  },

  updateRolePermissions: async (
    roleId: string,
    permissionIds: string[]
  ) => {
    const response = await apiClient.put(
      `/settings/roles/${roleId}/permissions`,
      { permission_ids: permissionIds }
    );
    return response.data;
  },

  // System Settings
  getSystemSettings: async (params?: {
    skip?: number;
    limit?: number;
    category?: string;
    is_public?: boolean;
  }) => {
    const response = await apiClient.get("/settings/system", { params });
    return response.data;
  },

  getPublicSettings: async () => {
    const response = await apiClient.get("/settings/system/public");
    return response.data;
  },

  getSystemSetting: async (key: string) => {
    const response = await apiClient.get(`/settings/system/${key}`);
    return response.data;
  },

  createSystemSetting: async (data: {
    key: string;
    value: any;
    category: string;
    description?: string;
    is_public?: boolean;
  }) => {
    const response = await apiClient.post("/settings/system", data);
    return response.data;
  },

  updateSystemSetting: async (key: string, data: any) => {
    const response = await apiClient.put(`/settings/system/${key}`, data);
    return response.data;
  },

  deleteSystemSetting: async (key: string) => {
    const response = await apiClient.delete(`/settings/system/${key}`);
    return response.data;
  },
};

export default settingsApi;

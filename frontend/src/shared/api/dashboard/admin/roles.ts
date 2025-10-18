/**
 * Admin Role Management API
 *
 * Handles role and permission management operations
 *
 * @module shared/api/dashboard/admin/roles
 */

import { apiClient } from "../../client";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

export interface CreateRoleData {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
}

/**
 * Admin role management API
 */
export const adminRolesApi = {
  /**
   * Get all roles
   */
  getRoles: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    roles: Role[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get("/admin/roles", { params });
    return response.data;
  },

  /**
   * Get role by ID
   */
  getRole: async (roleId: string): Promise<Role> => {
    const response = await apiClient.get(`/admin/roles/${roleId}`);
    return response.data;
  },

  /**
   * Create new role
   */
  createRole: async (data: CreateRoleData): Promise<Role> => {
    const response = await apiClient.post("/admin/roles", data);
    return response.data;
  },

  /**
   * Update role
   */
  updateRole: async (roleId: string, data: UpdateRoleData): Promise<Role> => {
    const response = await apiClient.put(`/admin/roles/${roleId}`, data);
    return response.data;
  },

  /**
   * Delete role
   */
  deleteRole: async (roleId: string): Promise<void> => {
    await apiClient.delete(`/admin/roles/${roleId}`);
  },

  /**
   * Get all permissions
   */
  getPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get("/admin/permissions");
    return response.data;
  },

  /**
   * Get permissions by category
   */
  getPermissionsByCategory: async (): Promise<Record<string, Permission[]>> => {
    const response = await apiClient.get("/admin/permissions/by-category");
    return response.data;
  },

  /**
   * Assign role to user
   */
  assignRole: async (
    userId: string,
    roleId: string,
    expiresAt?: string
  ): Promise<RoleAssignment> => {
    const response = await apiClient.post(`/admin/users/${userId}/roles`, {
      roleId,
      expiresAt,
    });
    return response.data;
  },

  /**
   * Remove role from user
   */
  removeRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}/roles/${roleId}`);
  },

  /**
   * Get user roles
   */
  getUserRoles: async (userId: string): Promise<RoleAssignment[]> => {
    const response = await apiClient.get(`/admin/users/${userId}/roles`);
    return response.data;
  },

  /**
   * Get role users
   */
  getRoleUsers: async (roleId: string): Promise<any[]> => {
    const response = await apiClient.get(`/admin/roles/${roleId}/users`);
    return response.data;
  },

  /**
   * Clone role
   */
  cloneRole: async (roleId: string, newName: string): Promise<Role> => {
    const response = await apiClient.post(`/admin/roles/${roleId}/clone`, {
      newName,
    });
    return response.data;
  },

  /**
   * Get role statistics
   */
  getRoleStats: async (): Promise<{
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    totalUsers: number;
    averageUsersPerRole: number;
  }> => {
    const response = await apiClient.get("/admin/roles/stats");
    return response.data;
  },
};

/**
 * Role Service
 *
 * API service for role and permission management
 */

import { apiClient } from "@/shared/api/client";

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface RoleFilters {
  search?: string;
  is_system_role?: boolean;
}

export interface CreateRoleData {
  name: string;
  description: string;
  permission_ids: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

export interface PaginatedRoles {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const roleService = {
  /**
   * Get all roles with pagination and filters
   */
  async getRoles(
    page: number = 1,
    limit: number = 20,
    filters: RoleFilters = {}
  ): Promise<PaginatedRoles> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const response = await apiClient.get(`/admin/roles?${params}`);
    return response.data;
  },

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role> {
    const response = await apiClient.get(`/admin/roles/${roleId}`);
    return response.data;
  },

  /**
   * Create new role
   */
  async createRole(roleData: CreateRoleData): Promise<Role> {
    const response = await apiClient.post("/admin/roles", roleData);
    return response.data;
  },

  /**
   * Update role
   */
  async updateRole(roleId: string, roleData: UpdateRoleData): Promise<Role> {
    const response = await apiClient.put(`/admin/roles/${roleId}`, roleData);
    return response.data;
  },

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/admin/roles/${roleId}`);
  },

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.get("/admin/permissions");
    return response.data;
  },

  /**
   * Get permissions by resource
   */
  async getPermissionsByResource(resource: string): Promise<Permission[]> {
    const response = await apiClient.get(
      `/admin/permissions?resource=${resource}`
    );
    return response.data;
  },

  /**
   * Create new permission
   */
  async createPermission(
    permissionData: Omit<Permission, "id" | "created_at" | "updated_at">
  ): Promise<Permission> {
    const response = await apiClient.post("/admin/permissions", permissionData);
    return response.data;
  },

  /**
   * Update permission
   */
  async updatePermission(
    permissionId: string,
    permissionData: Partial<
      Omit<Permission, "id" | "created_at" | "updated_at">
    >
  ): Promise<Permission> {
    const response = await apiClient.put(
      `/admin/permissions/${permissionId}`,
      permissionData
    );
    return response.data;
  },

  /**
   * Delete permission
   */
  async deletePermission(permissionId: string): Promise<void> {
    await apiClient.delete(`/admin/permissions/${permissionId}`);
  },
};

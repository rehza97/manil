/**
 * Role Service
 *
 * API service for role and permission management
 */

import { apiClient } from "@/shared/api/client";

export interface Permission {
  id: string;
  name: string;
  slug: string;
  category?: string;
  description?: string | null;
  is_system?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: Permission[];
  is_system: boolean;
  is_active: boolean;
  hierarchy_level: number;
  parent_role_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleFilters {
  search?: string;
  is_active?: boolean;
}

export interface CreateRoleData {
  name: string;
  slug: string;
  description?: string;
  permission_ids?: string[];
  is_system?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permission_ids?: string[];
  is_active?: boolean;
}

export interface PaginatedRoles {
  roles: Role[];
  total: number;
  page: number;
  page_size: number;
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
    const skip = (page - 1) * limit;
    const params: any = {
      skip,
      limit,
    };

    if (filters.is_active !== undefined) {
      params.is_active = filters.is_active;
    }

    // Backend returns { roles, total, page, page_size, total_pages }
    console.log("[roleService.getRoles] Fetching roles from:", "/settings/roles", params);
    
    const response = await apiClient.get("/settings/roles", { params });
    
    console.log("[roleService.getRoles] Raw API response:", response.data);
    console.log("[roleService.getRoles] Roles count:", response.data.roles?.length || 0);
    
    // Backend response already matches frontend format
    return response.data;
  },

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role> {
    const response = await apiClient.get(`/settings/roles/${roleId}`);
    return response.data;
  },

  /**
   * Create new role
   */
  async createRole(roleData: CreateRoleData): Promise<Role> {
    const response = await apiClient.post("/settings/roles", roleData);
    return response.data;
  },

  /**
   * Update role
   */
  async updateRole(roleId: string, roleData: UpdateRoleData): Promise<Role> {
    const response = await apiClient.put(`/settings/roles/${roleId}`, roleData);
    return response.data;
  },

  /**
   * Delete role
   */
  async deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/settings/roles/${roleId}`);
  },

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const response = await apiClient.get(`/settings/roles/${roleId}/permissions`);
    return response.data.permissions || [];
  },

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> {
    const response = await apiClient.put(`/settings/roles/${roleId}/permissions`, {
      permission_ids: permissionIds,
    });
    return response.data;
  },
};

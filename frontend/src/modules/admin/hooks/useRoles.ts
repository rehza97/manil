/**
 * Role Hooks
 *
 * React Query hooks for role and permission management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  roleService,
  type Role,
  type Permission,
  type RoleFilters,
  type CreateRoleData,
  type UpdateRoleData,
  type PaginatedRoles,
} from "../services/roleService";

export const useRoles = (
  page: number = 1,
  limit: number = 20,
  filters: RoleFilters = {}
) => {
  return useQuery<PaginatedRoles>({
    queryKey: ["roles", page, limit, filters],
    queryFn: () => roleService.getRoles(page, limit, filters),
  });
};

export const useRole = (roleId: string) => {
  return useQuery<Role>({
    queryKey: ["roles", roleId],
    queryFn: () => roleService.getRole(roleId),
    enabled: !!roleId,
  });
};

// Permission hooks using settingsApi
export const usePermissions = (params?: {
  skip?: number;
  limit?: number;
  category?: string;
  is_active?: boolean;
}) => {
  return useQuery<Permission[]>({
    queryKey: ["permissions", params],
    queryFn: async () => {
      const { settingsApi } = await import("@/shared/api");
      const response = await settingsApi.getPermissions(params);
      // Handle both array and paginated response formats
      if (Array.isArray(response)) {
        return response;
      }
      // If response has permissions property (paginated), return that
      if (response && 'permissions' in response) {
        return (response as any).permissions || [];
      }
      return [];
    },
  });
};

export const usePermissionsByResource = (resource: string) => {
  return useQuery<Permission[]>({
    queryKey: ["permissions", "resource", resource],
    queryFn: async () => {
      const { settingsApi } = await import("@/shared/api");
      const response = await settingsApi.getPermissions({ 
        // Assuming resource maps to category or we need to filter
        category: resource 
      });
      // Handle both array and paginated response formats
      if (Array.isArray(response)) {
        return response;
      }
      // If response has permissions property (paginated), return that
      if (response && 'permissions' in response) {
        return (response as any).permissions || [];
      }
      return [];
    },
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleService.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create role");
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      roleData,
    }: {
      roleId: string;
      roleData: UpdateRoleData;
    }) => roleService.updateRole(roleId, roleData),
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId] });
      toast.success("Role updated successfully");
    },
    onError: (error: any) => {
      // Handle validation errors (422) - extract message from error response
      let errorMessage = "Failed to update role";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        // Handle FastAPI validation errors
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: any) => err.msg || err.message || JSON.stringify(err))
            .join(", ");
        } else if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" 
            ? errorData.detail 
            : errorData.detail.message || errorData.detail.msg || JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      toast.error(errorMessage);
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleService.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete role");
    },
  });
};

// Permission mutation hooks moved - use settingsApi methods directly or create separate hooks
export const useCreatePermission = () => {
  throw new Error("useCreatePermission has been moved. Use settingsApi.createPermission from @/shared/api");
};

export const useUpdatePermission = () => {
  throw new Error("useUpdatePermission has been moved. Use settingsApi.updatePermission from @/shared/api");
};

export const useDeletePermission = () => {
  throw new Error("useDeletePermission has been moved. Use settingsApi.deletePermission from @/shared/api");
};

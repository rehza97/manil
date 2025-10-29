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
    queryKey: ["admin", "roles", page, limit, filters],
    queryFn: () => roleService.getRoles(page, limit, filters),
  });
};

export const useRole = (roleId: string) => {
  return useQuery<Role>({
    queryKey: ["admin", "roles", roleId],
    queryFn: () => roleService.getRole(roleId),
    enabled: !!roleId,
  });
};

export const usePermissions = () => {
  return useQuery<Permission[]>({
    queryKey: ["admin", "permissions"],
    queryFn: roleService.getPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePermissionsByResource = (resource: string) => {
  return useQuery<Permission[]>({
    queryKey: ["admin", "permissions", "resource", resource],
    queryFn: () => roleService.getPermissionsByResource(resource),
    enabled: !!resource,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleService.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles", roleId] });
      toast.success("Role updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update role");
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleService.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success("Role deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete role");
    },
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleService.createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
      toast.success("Permission created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create permission"
      );
    },
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      permissionId,
      permissionData,
    }: {
      permissionId: string;
      permissionData: Partial<
        Omit<Permission, "id" | "created_at" | "updated_at">
      >;
    }) => roleService.updatePermission(permissionId, permissionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
      toast.success("Permission updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update permission"
      );
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleService.deletePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
      toast.success("Permission deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete permission"
      );
    },
  });
};

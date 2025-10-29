/**
 * useUsers Hook
 *
 * React Query hooks for user management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../services";
import type { UserCreate, UserUpdate, UserFilters } from "../types";

/**
 * Get all users hook
 */
export const useUsers = (
  page: number = 1,
  pageSize: number = 20,
  filters?: UserFilters
) => {
  return useQuery({
    queryKey: ["users", page, pageSize, filters],
    queryFn: () => userService.getUsers(page, pageSize, filters),
  });
};

/**
 * Get user by ID hook
 */
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => userService.getUser(userId),
    enabled: !!userId,
  });
};

/**
 * Create user mutation hook
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCreate) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

/**
 * Update user mutation hook
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdate }) =>
      userService.updateUser(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId] });
    },
  });
};

/**
 * Delete user mutation hook
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

/**
 * Activate user mutation hook
 */
export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.activateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
  });
};

/**
 * Deactivate user mutation hook
 */
export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.deactivateUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
  });
};

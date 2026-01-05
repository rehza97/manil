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

/**
 * Assign roles mutation hook
 */
export const useAssignRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      userService.assignRoles(userId, roleIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId] });
    },
  });
};

/**
 * Force password reset mutation hook
 */
export const useForcePasswordReset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.forcePasswordReset(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
  });
};

/**
 * Unlock account mutation hook
 */
export const useUnlockAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.unlockAccount(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
    },
  });
};

/**
 * Get user sessions hook
 */
export const useUserSessions = (userId: string) => {
  return useQuery({
    queryKey: ["users", userId, "sessions"],
    queryFn: () => userService.getUserSessions(userId),
    enabled: !!userId,
  });
};

/**
 * Revoke session mutation hook
 */
export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
      userService.revokeSession(userId, sessionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["users", variables.userId, "sessions"],
      });
    },
  });
};

/**
 * Revoke all sessions mutation hook
 */
export const useRevokeAllSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.revokeAllSessions(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users", userId, "sessions"] });
    },
  });
};

/**
 * Get user activity hook
 */
export const useUserActivity = (
  userId: string,
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: ["users", userId, "activity", page, pageSize],
    queryFn: () => userService.getUserActivity(userId, page, pageSize),
    enabled: !!userId,
  });
};

/**
 * Get user statistics hook
 */
export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: ["users", userId, "stats"],
    queryFn: () => userService.getUserStats(userId),
    enabled: !!userId,
  });
};

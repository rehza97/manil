/**
 * useAuth Hook
 *
 * React Query hooks for authentication
 *
 * @module modules/auth/hooks/useAuth
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store";
import { authService } from "../services";
import type { LoginCredentials, RegisterData } from "../types";

/**
 * Get current user hook
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["auth", "current-user"],
    queryFn: authService.getCurrentUser,
    enabled: !!useAuthStore.getState().token,
  });
};

/**
 * Login mutation hook
 */
export const useLogin = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authService.login(credentials),
    onSuccess: (data, variables) => {
      setAuth(
        data.user, 
        data.access_token, 
        data.refresh_token, 
        variables.rememberMe ?? true
      );
      // Let RoleBasedRedirect handle the routing based on user role
      navigate("/redirect");
    },
  });
};

/**
 * Register mutation hook
 */
export const useRegister = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token);
      // Let RoleBasedRedirect handle the routing based on user role
      navigate("/redirect");
    },
  });
};

/**
 * Logout mutation hook
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate("/login");
    },
  });
};

/**
 * Update profile mutation hook
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) =>
      authService.updateProfile(data),
    onSuccess: (user) => {
      // Update auth store with new user data
      const currentAuth = useAuthStore.getState();
      if (currentAuth.token && currentAuth.refreshToken) {
        setAuth(user, currentAuth.token, currentAuth.refreshToken);
      }
      queryClient.invalidateQueries({ queryKey: ["auth", "current-user"] });
    },
  });
};

/**
 * Change password mutation hook
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authService.changePassword(currentPassword, newPassword),
  });
};

/**
 * Get login history hook
 */
export const useLoginHistory = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ["auth", "login-history", page, pageSize],
    queryFn: () => authService.getLoginHistory({ page, page_size: pageSize }),
  });
};

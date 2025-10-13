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
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken);
      navigate("/dashboard");
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
      setAuth(data.user, data.tokens.accessToken);
      navigate("/dashboard");
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

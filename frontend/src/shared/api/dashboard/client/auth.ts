/**
 * Client Authentication API
 *
 * @module shared/api/dashboard/client/auth
 */

import { apiClient } from "../../client";
import type {
  LoginCredentials,
  AuthResponse,
  User,
} from "@/modules/auth/types";

export const clientAuthApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/client/login", credentials);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  verify2FA: async (code: string): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/verify-2fa", { code });
    return response.data;
  },
};

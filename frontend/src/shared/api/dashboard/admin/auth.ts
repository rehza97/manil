/**
 * Admin Authentication API
 *
 * Handles admin-specific authentication operations
 *
 * @module shared/api/dashboard/admin/auth
 */

import { apiClient } from "../../client";
import type {
  LoginCredentials,
  AuthResponse,
  User,
} from "@/modules/auth/types";

/**
 * Admin authentication API
 */
export const adminAuthApi = {
  /**
   * Admin login with VPN validation
   */
  login: async (
    credentials: LoginCredentials & { vpnToken?: string }
  ): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/admin/login", credentials);
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  /**
   * Logout current session
   */
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  /**
   * Get current admin user profile
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  /**
   * Verify 2FA code
   */
  verify2FA: async (code: string): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/verify-2fa", { code });
    return response.data;
  },

  /**
   * Validate VPN access
   */
  validateVPNAccess: async (): Promise<{
    isValid: boolean;
    location?: string;
  }> => {
    const response = await apiClient.get("/auth/validate-vpn");
    return response.data;
  },

  /**
   * Get system access logs
   */
  getAccessLogs: async (params?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: any[]; total: number; page: number; limit: number }> => {
    const response = await apiClient.get("/auth/access-logs", { params });
    return response.data;
  },
};

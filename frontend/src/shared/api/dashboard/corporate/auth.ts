/**
 * Corporate Authentication API
 *
 * Handles corporate-specific authentication operations
 *
 * @module shared/api/dashboard/corporate/auth
 */

import { apiClient } from "../../client";
import type {
  LoginCredentials,
  AuthResponse,
  User,
} from "@/modules/auth/types";

/**
 * Corporate authentication API
 */
export const corporateAuthApi = {
  /**
   * Corporate login with VPN validation
   */
  login: async (
    credentials: LoginCredentials & { vpnToken?: string }
  ): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/corporate/login", credentials);
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
   * Get current corporate user profile
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
};

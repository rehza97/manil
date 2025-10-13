/**
 * Auth Service
 *
 * API service for authentication operations
 *
 * @module modules/auth/services/authService
 */

import { apiClient } from "@/shared/api";
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  TwoFactorSetup,
} from "../types";

/**
 * Authentication service
 */
export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials
    );
    return response.data;
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  /**
   * Setup 2FA
   */
  async setup2FA(): Promise<TwoFactorSetup> {
    const response = await apiClient.post<TwoFactorSetup>("/auth/2fa/setup");
    return response.data;
  },

  /**
   * Verify 2FA code
   */
  async verify2FA(code: string): Promise<void> {
    await apiClient.post("/auth/2fa/verify", { code });
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post("/auth/password/reset-request", { email });
  },

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/password/reset", { token, newPassword });
  },
};

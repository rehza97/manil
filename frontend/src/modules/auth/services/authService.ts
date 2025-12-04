/**
 * Auth Service
 *
 * Wrapper around centralized authApi for authentication operations
 * Uses centralized API client from @/shared/api
 *
 * @module modules/auth/services/authService
 */

import { authApi } from "@/shared/api";
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  TwoFactorSetup,
} from "../types";

/**
 * Authentication service - uses centralized authApi
 * Provides complete authentication functionality
 */
export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authApi.login({
      email: credentials.email,
      password: credentials.password,
    });
    return response as AuthResponse;
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await authApi.register({
      email: data.email,
      password: data.password,
      full_name: data.fullName,
      phone: data.phone,
      role: data.role,
    });
    return response as AuthResponse;
  },

  /**
   * Logout user (handled client-side by clearing tokens)
   */
  async logout(): Promise<void> {
    // Clear local storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await authApi.refreshToken({ refresh_token: refreshToken });
    return response as AuthResponse;
  },

  /**
   * Get current user (from token or API)
   */
  async getCurrentUser(): Promise<User> {
    // Could be implemented with a /me endpoint
    // For now, return from stored token claims
    throw new Error("Implement /me endpoint");
  },

  /**
   * Enable 2FA for current user
   */
  async enable2FA(): Promise<TwoFactorSetup> {
    const response = await authApi.enable2FA();
    return {
      secret: response.secret,
      qrCode: response.qr_code,
      backupCodes: response.backup_codes,
    };
  },

  /**
   * Verify 2FA token
   */
  async verify2FA(token: string): Promise<void> {
    await authApi.verify2FA({ token });
  },

  /**
   * Disable 2FA
   */
  async disable2FA(token: string): Promise<void> {
    await authApi.disable2FA({ token });
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await authApi.requestPasswordReset({ email });
  },

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await authApi.confirmPasswordReset({
      token,
      new_password: newPassword,
    });
  },

  /**
   * Get user sessions
   */
  async getSessions(): Promise<any[]> {
    return await authApi.getSessions();
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await authApi.deleteSession(sessionId);
  },

  /**
   * Get security activity
   */
  async getSecurityActivity(params?: {
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    return await authApi.getSecurityActivity(params);
  },

  /**
   * Get login history
   */
  async getLoginHistory(params?: {
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    return await authApi.getLoginHistory(params);
  },
};

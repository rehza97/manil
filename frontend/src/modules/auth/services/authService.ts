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
    // Note: rememberMe is handled client-side for storage, not sent to backend
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
      full_name: data.name,
      role: "client", // Default role for new registrations
    });
    // LoginResponse and AuthResponse have compatible structures
    return response as unknown as AuthResponse;
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
   * Complete login after 2FA (when login returns requires_2fa).
   */
  async completeLogin2FA(
    pending2FAToken: string,
    code: string
  ): Promise<AuthResponse> {
    const response = await authApi.completeLogin2FA({
      pending_2fa_token: pending2FAToken,
      code,
    });
    return response as AuthResponse;
  },

  /**
   * Enable 2FA for current user
   */
  async enable2FA(): Promise<TwoFactorSetup> {
    const response = await authApi.enable2FA();
    return {
      secret: response.secret,
      qrCode: response.qr_code_url,
      backupCodes: response.backup_codes,
    };
  },

  /**
   * Verify 2FA token (TOTP code)
   */
  async verify2FA(code: string): Promise<void> {
    await authApi.verify2FA({ code });
  },

  /**
   * Disable 2FA
   */
  async disable2FA(code: string): Promise<void> {
    await authApi.disable2FA({ code });
  },

  /**
   * Setup 2FA when required (unauthenticated)
   */
  async setupRequired2FA(
    email: string,
    password: string
  ): Promise<TwoFactorSetup> {
    const response = await authApi.setupRequired2FA({ email, password });
    return {
      secret: response.secret,
      qrCode: response.qr_code_url,
      backupCodes: response.backup_codes,
    };
  },

  /**
   * Verify 2FA setup when required (unauthenticated)
   */
  async verifySetupRequired2FA(
    email: string,
    password: string,
    code: string
  ): Promise<void> {
    await authApi.verifySetupRequired2FA({ email, password, code });
  },

  /**
   * Check if 2FA is required for a user's role
   */
  async check2FARequirement(email: string): Promise<{
    is_required: boolean;
    role: string | null;
  }> {
    return await authApi.check2FARequirement(email);
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, method: "email" | "sms" = "email"): Promise<void> {
    await authApi.requestPasswordReset({ email, method });
  },

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(
    newPassword: string,
    token?: string,
    code?: string,
    email?: string
  ): Promise<void> {
    await authApi.confirmPasswordReset({
      token: token || undefined,
      code: code || undefined,
      email: email || undefined,
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
    page?: number;
    page_size?: number;
  }): Promise<any[]> {
    return await authApi.getLoginHistory(params);
  },

  /**
   * Update user profile
   */
  async updateProfile(data: { full_name?: string; phone?: string }): Promise<User> {
    const response = await authApi.updateProfile(data);
    return response as unknown as User;
  },

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await authApi.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};

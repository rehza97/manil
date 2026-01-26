/**
 * Authentication API Client
 *
 * Handles all authentication-related API calls:
 * - User registration and login
 * - 2FA setup and verification
 * - Password reset
 * - Token refresh
 * - Session management
 * - Security activity tracking
 *
 * @module shared/api/auth
 */

import { apiClient } from "./client";
import type { AxiosResponse } from "axios";

// ============================================================================
// Types
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: "admin" | "corporate" | "client";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
  requires_2fa?: boolean;
  pending_2fa_token?: string;
}

export interface CompleteLogin2FARequest {
  pending_2fa_token: string;
  code: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enable2FAResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

export interface Verify2FARequest {
  code: string;
}

export interface SetupRequired2FARequest {
  email: string;
  password: string;
}

export interface VerifySetupRequired2FARequest {
  email: string;
  password: string;
  code: string;
}

export interface VerifySetupRequired2FAResponse {
  success: boolean;
  message: string;
}

export interface Check2FARequirementResponse {
  is_required: boolean;
  role: string | null;
}

export interface PasswordResetRequestRequest {
  email: string;
  method?: "email" | "sms";
}

export interface PasswordResetConfirmRequest {
  token?: string;
  code?: string;
  email?: string;
  new_password: string;
}

export interface UserUpdateRequest {
  full_name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface SessionResponse {
  id: string;
  user_id: string;
  device_info?: string;
  ip_address?: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
}

export interface SecurityActivity {
  id: string;
  user_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  status: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  status: "success" | "failed";
  created_at: string;
  location?: string;
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Authentication API Client
 */
export const authApi = {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      "/auth/register",
      data
    );
    return response.data;
  },

  /**
   * Login with email and password
   * POST /api/v1/auth/login
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      "/auth/login",
      data
    );
    return response.data;
  },

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      "/auth/refresh",
      data
    );
    return response.data;
  },

  /**
   * Enable 2FA for current user
   * POST /api/v1/auth/2fa/enable
   */
  enable2FA: async (): Promise<Enable2FAResponse> => {
    const response: AxiosResponse<Enable2FAResponse> = await apiClient.post(
      "/auth/2fa/enable"
    );
    return response.data;
  },

  /**
   * Complete login after 2FA (when login returns requires_2fa).
   * POST /api/v1/auth/2fa/complete-login
   */
  completeLogin2FA: async (
    data: CompleteLogin2FARequest
  ): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await apiClient.post(
      "/auth/2fa/complete-login",
      data
    );
    return response.data;
  },

  /**
   * Verify 2FA token
   * POST /api/v1/auth/2fa/verify
   */
  verify2FA: async (data: Verify2FARequest): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/2fa/verify", data);
    return response.data;
  },

  /**
   * Disable 2FA for current user
   * POST /api/v1/auth/2fa/disable
   */
  disable2FA: async (data: Verify2FARequest): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/2fa/disable", data);
    return response.data;
  },

  /**
   * Setup 2FA when required (unauthenticated endpoint)
   * POST /api/v1/auth/2fa/setup-required
   */
  setupRequired2FA: async (
    data: SetupRequired2FARequest
  ): Promise<Enable2FAResponse> => {
    const response: AxiosResponse<Enable2FAResponse> = await apiClient.post(
      "/auth/2fa/setup-required",
      data
    );
    return response.data;
  },

  /**
   * Verify 2FA setup when required (unauthenticated endpoint)
   * POST /api/v1/auth/2fa/verify-setup-required
   */
  verifySetupRequired2FA: async (
    data: VerifySetupRequired2FARequest
  ): Promise<VerifySetupRequired2FAResponse> => {
    const response: AxiosResponse<VerifySetupRequired2FAResponse> =
      await apiClient.post("/auth/2fa/verify-setup-required", data);
    return response.data;
  },

  /**
   * Check if 2FA is required for a user's role
   * GET /api/v1/auth/2fa/check-requirement?email=...
   */
  check2FARequirement: async (
    email: string
  ): Promise<Check2FARequirementResponse> => {
    const response: AxiosResponse<Check2FARequirementResponse> =
      await apiClient.get("/auth/2fa/check-requirement", {
        params: { email },
      });
    return response.data;
  },

  /**
   * Request password reset email
   * POST /api/v1/auth/password-reset/request
   */
  requestPasswordReset: async (
    data: PasswordResetRequestRequest
  ): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/password-reset/request", data);
    return response.data;
  },

  /**
   * Confirm password reset with token
   * POST /api/v1/auth/password-reset/confirm
   */
  confirmPasswordReset: async (
    data: PasswordResetConfirmRequest
  ): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/password-reset/confirm", data);
    return response.data;
  },

  /**
   * Get all active sessions for current user
   * GET /api/v1/auth/sessions
   */
  getSessions: async (): Promise<SessionResponse[]> => {
    const response: AxiosResponse<SessionResponse[]> = await apiClient.get(
      "/auth/sessions"
    );
    return response.data;
  },

  /**
   * Invalidate a specific session
   * DELETE /api/v1/auth/sessions/{session_id}
   */
  deleteSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get security activity for current user
   * GET /api/v1/auth/security/activity
   */
  getSecurityActivity: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<SecurityActivity[]> => {
    const response: AxiosResponse<SecurityActivity[]> = await apiClient.get(
      "/auth/security/activity",
      { params }
    );
    return response.data;
  },

  /**
   * Get login history for current user
   * GET /api/v1/auth/security/login-history
   */
  getLoginHistory: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<LoginHistory[]> => {
    const response: AxiosResponse<{ data: LoginHistory[]; total: number; page: number; page_size: number }> = await apiClient.get(
      "/auth/security/login-history",
      { params }
    );
    // Backend returns AuditLogListResponse with { data: [...], total, page, page_size }
    // Extract data array from the response
    return response.data.data || [];
  },

  /**
   * Update current user's profile
   * PUT /api/v1/auth/profile
   */
  updateProfile: async (data: UserUpdateRequest): Promise<UserResponse> => {
    const response: AxiosResponse<UserResponse> = await apiClient.put(
      "/auth/profile",
      data
    );
    return response.data;
  },

  /**
   * Change current user's password
   * PUT /api/v1/auth/change-password
   */
  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.put("/auth/change-password", data);
    return response.data;
  },
};

export default authApi;

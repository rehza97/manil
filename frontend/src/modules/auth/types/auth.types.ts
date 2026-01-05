/**
 * Auth Module Types
 *
 * Type definitions for authentication module
 *
 * @module modules/auth/types
 */

import { AuditFields } from "@/shared/types";

/**
 * User interface
 */
export interface User extends AuditFields {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_2fa_enabled: boolean;
}

/**
 * User roles
 */
export type UserRole = "admin" | "corporate" | "client";

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
}

/**
 * Register data
 */
export interface RegisterData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

/**
 * Auth tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth response
 */
export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * 2FA setup response
 */
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

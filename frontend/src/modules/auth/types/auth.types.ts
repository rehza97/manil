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
  name: string;
  role: UserRole;
  isActive: boolean;
  has2FA: boolean;
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
  tokens: AuthTokens;
}

/**
 * 2FA setup response
 */
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

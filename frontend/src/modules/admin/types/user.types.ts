/**
 * User Management Types
 *
 * Type definitions for user management in admin panel
 */

import type { UserRole } from "@/modules/auth/types";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_2fa_enabled: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  last_failed_login: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UserUpdate {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserFilters {
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  browser: string;
  os: string;
  location: string | null;
  is_current: boolean;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

export interface UserSessionListResponse {
  data: UserSession[];
  total: number;
}

export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface UserActivityListResponse {
  data: UserActivity[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserStats {
  total_logins: number;
  failed_logins: number;
  last_login: string | null;
  active_sessions: number;
  total_actions: number;
  account_age_days: number;
}

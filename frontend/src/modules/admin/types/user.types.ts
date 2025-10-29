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
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
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

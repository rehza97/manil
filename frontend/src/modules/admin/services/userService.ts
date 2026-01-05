/**
 * User Management Service
 *
 * API service for user management operations
 */

import { apiClient } from "@/shared/api";
import type {
  User,
  UserCreate,
  UserUpdate,
  UserListResponse,
  UserFilters,
  UserSession,
  UserSessionListResponse,
  UserActivity,
  UserActivityListResponse,
  UserStats,
} from "../types";

export const userService = {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    filters?: UserFilters
  ): Promise<UserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    // Add filter params if provided
    if (filters?.role) {
      params.append("role", filters.role);
    }
    if (filters?.is_active !== undefined) {
      params.append("is_active", filters.is_active.toString());
    }
    if (filters?.search) {
      params.append("search", filters.search);
    }

    // Backend returns { users, total, page, limit, total_pages }
    // Frontend expects { data, total, page, page_size }
    interface BackendUserListResponse {
      users: User[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }

    const url = `/users?${params.toString()}`;
    console.log("[userService.getUsers] Fetching users from:", url);
    console.log("[userService.getUsers] Filters:", filters);

    const response = await apiClient.get<BackendUserListResponse>(url);

    console.log("[userService.getUsers] Raw API response:", response.data);
    console.log("[userService.getUsers] Users count:", response.data.users?.length || 0);

    // Map backend response to frontend format
    const mappedResponse = {
      data: response.data.users,
      total: response.data.total,
      page: response.data.page,
      page_size: response.data.limit,
    };

    console.log("[userService.getUsers] Mapped response:", mappedResponse);
    return mappedResponse;
  },

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user
   */
  async createUser(data: UserCreate): Promise<User> {
    const response = await apiClient.post<User>("/users", data);
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(userId: string, data: UserUpdate): Promise<User> {
    const response = await apiClient.put<User>(`/users/${userId}`, data);
    return response.data;
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  },

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${userId}/status`, {
      is_active: true,
    });
    return response.data;
  },

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${userId}/status`, {
      is_active: false,
    });
    return response.data;
  },

  /**
   * Assign roles to user
   */
  async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    const response = await apiClient.put<User>(`/users/${userId}/roles`, {
      role_ids: roleIds,
    });
    return response.data;
  },

  /**
   * Force password reset for user
   */
  async forcePasswordReset(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/password-reset`);
  },

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string): Promise<User> {
    const response = await apiClient.post<User>(`/users/${userId}/unlock`);
    return response.data;
  },

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<UserSessionListResponse> {
    const response = await apiClient.get<UserSessionListResponse>(
      `/users/${userId}/sessions`
    );
    return response.data;
  },

  /**
   * Revoke user session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/sessions/${sessionId}`);
  },

  /**
   * Revoke all user sessions
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}/sessions`);
  },

  /**
   * Get user activity logs
   */
  async getUserActivity(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<UserActivityListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    const response = await apiClient.get<UserActivityListResponse>(
      `/users/${userId}/activity?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await apiClient.get<UserStats>(`/users/${userId}/stats`);
    return response.data;
  },
};

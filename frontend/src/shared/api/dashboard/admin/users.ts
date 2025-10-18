/**
 * Admin User Management API
 *
 * Handles admin user management operations
 *
 * @module shared/api/dashboard/admin/users
 */

import { apiClient } from "../../client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "corporate" | "client";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginCount: number;
  permissions: string[];
  sessions: UserSession[];
}

export interface UserSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: "admin" | "corporate" | "client";
  permissions?: string[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: "admin" | "corporate" | "client";
  status?: "active" | "inactive" | "suspended";
  permissions?: string[];
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Admin user management API
 */
export const adminUsersApi = {
  /**
   * Get all users
   */
  getUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get("/admin/users", { params });
    return response.data;
  },

  /**
   * Get user by ID
   */
  getUser: async (userId: string): Promise<AdminUser> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Create new user
   */
  createUser: async (data: CreateUserData): Promise<AdminUser> => {
    const response = await apiClient.post("/admin/users", data);
    return response.data;
  },

  /**
   * Update user
   */
  updateUser: async (
    userId: string,
    data: UpdateUserData
  ): Promise<AdminUser> => {
    const response = await apiClient.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  /**
   * Delete user
   */
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  /**
   * Suspend user
   */
  suspendUser: async (userId: string, reason: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/suspend`, { reason });
  },

  /**
   * Reactivate user
   */
  reactivateUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/reactivate`);
  },

  /**
   * Reset user password
   */
  resetUserPassword: async (
    userId: string
  ): Promise<{ temporaryPassword: string }> => {
    const response = await apiClient.post(
      `/admin/users/${userId}/reset-password`
    );
    return response.data;
  },

  /**
   * Get user sessions
   */
  getUserSessions: async (userId: string): Promise<UserSession[]> => {
    const response = await apiClient.get(`/admin/users/${userId}/sessions`);
    return response.data;
  },

  /**
   * Terminate user session
   */
  terminateSession: async (
    userId: string,
    sessionId: string
  ): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}/sessions/${sessionId}`);
  },

  /**
   * Terminate all user sessions
   */
  terminateAllSessions: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}/sessions`);
  },

  /**
   * Get user activity
   */
  getUserActivity: async (
    userId: string,
    params?: {
      action?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    activities: UserActivity[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get(`/admin/users/${userId}/activity`, {
      params,
    });
    return response.data;
  },

  /**
   * Get user statistics
   */
  getUserStats: async (): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    byRole: Record<string, number>;
    recentLogins: number;
  }> => {
    const response = await apiClient.get("/admin/users/stats");
    return response.data;
  },

  /**
   * Bulk update users
   */
  bulkUpdateUsers: async (
    userIds: string[],
    data: UpdateUserData
  ): Promise<void> => {
    await apiClient.put("/admin/users/bulk", { userIds, data });
  },

  /**
   * Export users
   */
  exportUsers: async (filters?: {
    role?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> => {
    const response = await apiClient.get("/admin/users/export", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};

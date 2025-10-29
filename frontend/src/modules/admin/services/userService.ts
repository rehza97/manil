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
      ...filters,
    });

    const response = await apiClient.get<UserListResponse>(
      `/users?${params.toString()}`
    );
    return response.data;
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
    const response = await apiClient.post<User>(`/users/${userId}/activate`);
    return response.data;
  },

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<User> {
    const response = await apiClient.post<User>(`/users/${userId}/deactivate`);
    return response.data;
  },
};

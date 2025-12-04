/**
 * System API Client
 *
 * Handles system-level API calls:
 * - Health checks
 * - System statistics
 * - Recent activity
 * - User management
 *
 * @module shared/api/system
 */

import { apiClient, baseClient } from "./client";
import type { AxiosResponse } from "axios";

// ============================================================================
// Types
// ============================================================================

export interface HealthStatus {
  status: string;
  timestamp: string;
}

export interface DetailedHealthStatus {
  status: string;
  database: {
    status: string;
    response_time_ms?: number;
  };
  redis: {
    status: string;
    response_time_ms?: number;
  };
  timestamp: string;
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    by_role: Record<string, number>;
  };
  customers: {
    total: number;
    active: number;
    pending_kyc: number;
  };
  tickets: {
    total: number;
    open: number;
    closed: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
}

export interface RecentActivity {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  created_at: string;
}

export interface UsersByRole {
  role: string;
  count: number;
  users: Array<{
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
  }>;
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * System API Client
 */
export const systemApi = {
  /**
   * Basic health check
   * GET /health
   */
  health: async (): Promise<HealthStatus> => {
    const response: AxiosResponse<HealthStatus> = await baseClient.get(
      "/health"
    );
    return response.data;
  },

  /**
   * Detailed health check with service status
   * GET /api/v1/system/health/detailed
   */
  healthDetailed: async (): Promise<DetailedHealthStatus> => {
    const response: AxiosResponse<DetailedHealthStatus> = await apiClient.get(
      "/system/health/detailed"
    );
    return response.data;
  },

  /**
   * Get system statistics
   * GET /api/v1/system/stats
   */
  getStats: async (): Promise<SystemStats> => {
    const response: AxiosResponse<SystemStats> = await apiClient.get(
      "/system/stats"
    );
    return response.data;
  },

  /**
   * Get recent system activity
   * GET /api/v1/system/activity/recent
   */
  getRecentActivity: async (params?: {
    limit?: number;
  }): Promise<RecentActivity[]> => {
    const response: AxiosResponse<RecentActivity[]> = await apiClient.get(
      "/system/activity/recent",
      { params }
    );
    return response.data;
  },

  /**
   * Get users grouped by role
   * GET /api/v1/system/users/by-role
   */
  getUsersByRole: async (): Promise<UsersByRole[]> => {
    const response: AxiosResponse<UsersByRole[]> = await apiClient.get(
      "/system/users/by-role"
    );
    return response.data;
  },
};

export default systemApi;

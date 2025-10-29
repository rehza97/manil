/**
 * System Service
 *
 * API service for system overview and health monitoring
 */

import { apiClient, baseClient } from "@/shared/api/client";

export interface SystemHealth {
  uptime: number;
  database_status: "healthy" | "degraded" | "down";
  database_response_time: number;
  system_load: number;
  critical_alerts: number;
}

export interface SystemStats {
  total_users: number;
  active_sessions: number;
  total_customers: number;
  total_orders: number;
  monthly_revenue: number;
  revenue_growth: number;
}

export interface SystemOverview {
  health: SystemHealth;
  stats: SystemStats;
}

export const systemService = {
  /**
   * Get system overview data
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const [health, stats, detailedHealth] = await Promise.all([
      baseClient.get("/health").catch(() => ({ data: null })),
      apiClient.get("/system/stats").catch(() => ({ data: null })),
      apiClient.get("/system/health/detailed").catch(() => ({ data: null })),
    ]);

    const mappedHealth: SystemHealth = {
      uptime: stats.data?.system_uptime || 0,
      database_status: stats.data?.database_status || "healthy",
      database_response_time: stats.data?.api_response_time || 0,
      system_load: detailedHealth.data?.api_server?.cpu_usage || 0,
      critical_alerts: stats.data?.failed_logins_24h || 0,
    };

    const mappedStats: SystemStats = {
      total_users: stats.data?.total_users || 0,
      active_sessions: stats.data?.active_users || 0,
      total_customers: stats.data?.total_customers || 0,
      total_orders: 0, // Not available yet
      monthly_revenue: 0, // Not available yet
      revenue_growth: 0, // Not available yet
    };

    return { health: mappedHealth, stats: mappedStats };
  },

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [health, stats, detailedHealth] = await Promise.all([
      baseClient.get("/health").catch(() => ({ data: null })),
      apiClient.get("/system/stats").catch(() => ({ data: null })),
      apiClient.get("/system/health/detailed").catch(() => ({ data: null })),
    ]);

    return {
      uptime: stats.data?.system_uptime || 0,
      database_status: stats.data?.database_status || "healthy",
      database_response_time: stats.data?.api_response_time || 0,
      system_load: detailedHealth.data?.api_server?.cpu_usage || 0,
      critical_alerts: stats.data?.failed_logins_24h || 0,
    };
  },

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    const response = await apiClient
      .get("/system/stats")
      .catch(() => ({ data: null }));

    const stats = response.data;
    return {
      total_users: stats?.total_users || 0,
      active_sessions: stats?.active_users || 0,
      total_customers: stats?.total_customers || 0,
      total_orders: 0, // Not available yet
      monthly_revenue: 0, // Not available yet
      revenue_growth: 0, // Not available yet
    };
  },

  /**
   * Get detailed system health
   */
  async getDetailedHealth(): Promise<any> {
    const response = await apiClient.get("/system/health/detailed");
    return response.data;
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 10): Promise<any[]> {
    const response = await apiClient.get(
      `/system/activity/recent?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get users by role statistics
   */
  async getUsersByRole(): Promise<any> {
    const response = await apiClient.get("/system/users/by-role");
    return response.data;
  },
};

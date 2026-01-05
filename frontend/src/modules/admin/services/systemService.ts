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
      total_orders: stats.data?.total_orders || 0,
      monthly_revenue: stats.data?.monthly_revenue || 0,
      revenue_growth: stats.data?.revenue_growth || 0,
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
      total_orders: stats?.total_orders || 0,
      monthly_revenue: stats?.monthly_revenue || 0,
      revenue_growth: stats?.revenue_growth || 0,
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

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);

    const response = await apiClient.get(`/system/performance?${params}`);
    return response.data;
  },

  /**
   * Get system alerts
   */
  async getAlerts(filters?: {
    severity?: string;
    status?: string;
    resolved?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
    alerts: any[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append("severity", filters.severity);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.resolved !== undefined)
      params.append("resolved", String(filters.resolved));
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.page_size)
      params.append("page_size", String(filters.page_size));

    const response = await apiClient.get(`/system/alerts?${params}`);
    return response.data;
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    await apiClient.post(`/system/alerts/${alertId}/resolve`);
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await apiClient.post(`/system/alerts/${alertId}/acknowledge`);
  },

  /**
   * Get system logs
   */
  async getSystemLogs(filters?: {
    level?: string;
    component?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ logs: any[]; total: number; page: number; page_size: number }> {
    const params = new URLSearchParams();
    if (filters?.level) params.append("level", filters.level);
    if (filters?.component) params.append("component", filters.component);
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.page_size)
      params.append("page_size", String(filters.page_size));

    const queryString = params.toString();
    const url = `/admin/logs/system${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get(url);
    return response.data;
  },
};

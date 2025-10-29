/**
 * Report Service
 *
 * API service for system reports and analytics
 */

import { apiClient } from "@/shared/api/client";

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  user_id?: string;
  resource?: string;
  action?: string;
}

export interface UserReport {
  total_users: number;
  active_users: number;
  new_users: number;
  users_by_role: {
    role: string;
    count: number;
  }[];
  users_by_status: {
    status: string;
    count: number;
  }[];
  registration_trend: {
    date: string;
    count: number;
  }[];
}

export interface ActivityReport {
  total_activities: number;
  activities_by_type: {
    type: string;
    count: number;
  }[];
  activities_by_user: {
    user_id: string;
    user_name: string;
    count: number;
  }[];
  activity_trend: {
    date: string;
    count: number;
  }[];
  top_resources: {
    resource: string;
    count: number;
  }[];
}

export interface SecurityReport {
  total_security_events: number;
  failed_logins: number;
  successful_logins: number;
  security_events_by_type: {
    type: string;
    count: number;
  }[];
  security_trend: {
    date: string;
    count: number;
  }[];
  top_ips: {
    ip: string;
    count: number;
    location?: string;
  }[];
  suspicious_activities: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: "low" | "medium" | "high" | "critical";
  }[];
}

export interface PerformanceReport {
  system_uptime: number;
  average_response_time: number;
  database_performance: {
    query_time: number;
    connection_pool: number;
    slow_queries: number;
  };
  api_performance: {
    endpoint: string;
    average_response_time: number;
    request_count: number;
    error_rate: number;
  }[];
  resource_usage: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_usage: number;
  };
  performance_trend: {
    date: string;
    response_time: number;
    cpu_usage: number;
    memory_usage: number;
  }[];
}

export interface SystemReport {
  user_report: UserReport;
  activity_report: ActivityReport;
  security_report: SecurityReport;
  performance_report: PerformanceReport;
}

export const reportService = {
  /**
   * Get comprehensive system report
   */
  async getSystemReport(filters: ReportFilters = {}): Promise<SystemReport> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(`/admin/reports/system?${params}`);
    return response.data;
  },

  /**
   * Get user report
   */
  async getUserReport(filters: ReportFilters = {}): Promise<UserReport> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(`/admin/reports/users?${params}`);
    return response.data;
  },

  /**
   * Get activity report
   */
  async getActivityReport(
    filters: ReportFilters = {}
  ): Promise<ActivityReport> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(`/admin/reports/activity?${params}`);
    return response.data;
  },

  /**
   * Get security report
   */
  async getSecurityReport(
    filters: ReportFilters = {}
  ): Promise<SecurityReport> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(`/admin/reports/security?${params}`);
    return response.data;
  },

  /**
   * Get performance report
   */
  async getPerformanceReport(
    filters: ReportFilters = {}
  ): Promise<PerformanceReport> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(
      `/admin/reports/performance?${params}`
    );
    return response.data;
  },

  /**
   * Export report to CSV
   */
  async exportReport(
    reportType: string,
    filters: ReportFilters = {}
  ): Promise<Blob> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(
      `/admin/reports/${reportType}/export?${params}`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  /**
   * Export report to PDF
   */
  async exportReportPDF(
    reportType: string,
    filters: ReportFilters = {}
  ): Promise<Blob> {
    const params = new URLSearchParams(filters);
    const response = await apiClient.get(
      `/admin/reports/${reportType}/export/pdf?${params}`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },
};

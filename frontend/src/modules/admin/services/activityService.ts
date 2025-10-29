/**
 * Activity Service
 *
 * API service for activity logs and security monitoring
 */

import { apiClient } from "@/shared/api/client";

export interface ActivityLog {
  id: string;
  user_email: string;
  user_id: string;
  action: string;
  status: "success" | "failed";
  ip_address: string;
  timestamp: string;
  device: string;
  user_agent: string;
  location?: string;
}

export interface ActivityFilters {
  search?: string;
  action?: string;
  status?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ActivityStats {
  total_logins: number;
  failed_attempts: number;
  active_sessions: number;
  unique_ips: number;
}

export interface PaginatedActivityLogs {
  data: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const activityService = {
  /**
   * Get activity logs with pagination and filters
   */
  async getActivityLogs(
    page: number = 1,
    limit: number = 50,
    filters: ActivityFilters = {}
  ): Promise<PaginatedActivityLogs> {
    // Map frontend filters to backend audit filters
    const mapped: Record<string, string> = {
      page: page.toString(),
      page_size: limit.toString(),
    };

    if (filters.action) mapped["action"] = filters.action;
    if (filters.user_id) mapped["user_id"] = filters.user_id;
    if (filters.status)
      mapped["success"] = (filters.status === "success").toString();
    if (filters.date_from) mapped["start_date"] = filters.date_from;
    if (filters.date_to) mapped["end_date"] = filters.date_to;
    if (filters.search) mapped["user_email"] = filters.search;

    const params = new URLSearchParams(mapped);
    const response = await apiClient.get(`/audit?${params.toString()}`);

    // Normalize response shape
    const data = response.data;
    return {
      data: data.data.map((item: any) => ({
        id: item.id,
        user_email: item.user_email || "",
        user_id: item.user_id || "",
        action: item.action,
        status: item.success ? "success" : "failed",
        ip_address: item.ip_address || "",
        timestamp: item.created_at,
        device: item.user_agent || "",
        user_agent: item.user_agent || "",
        location: item.extra_data?.location,
      })),
      total: data.total,
      page: data.page,
      limit: data.page_size,
      total_pages: data.total_pages,
    } as PaginatedActivityLogs;
  },

  /**
   * Get activity statistics
   */
  async getActivityStats(): Promise<ActivityStats> {
    // Derive basic stats from audit totals
    const [logins, failed] = await Promise.all([
      apiClient.get(`/audit?action=login_success&page=1&page_size=1`),
      apiClient.get(`/audit?action=login_failed&page=1&page_size=1`),
    ]);

    return {
      total_logins: logins.data?.total ?? 0,
      failed_attempts: failed.data?.total ?? 0,
      active_sessions: 0,
      unique_ips: 0,
    };
  },

  /**
   * Get user login history
   */
  async getUserLoginHistory(userId: string): Promise<ActivityLog[]> {
    const params = new URLSearchParams({
      page: "1",
      page_size: "100",
      user_id: userId,
      action: "login_success",
    });
    const response = await apiClient.get(`/audit?${params.toString()}`);
    return (response.data?.data || []).map((item: any) => ({
      id: item.id,
      user_email: item.user_email || "",
      user_id: item.user_id || "",
      action: item.action,
      status: item.success ? "success" : "failed",
      ip_address: item.ip_address || "",
      timestamp: item.created_at,
      device: item.user_agent || "",
      user_agent: item.user_agent || "",
      location: item.extra_data?.location,
    }));
  },

  /**
   * Get security activity
   */
  async getSecurityActivity(): Promise<ActivityLog[]> {
    const params = new URLSearchParams({ page: "1", page_size: "100" });
    const response = await apiClient.get(`/audit?${params.toString()}`);
    return (response.data?.data || []).map((item: any) => ({
      id: item.id,
      user_email: item.user_email || "",
      user_id: item.user_id || "",
      action: item.action,
      status: item.success ? "success" : "failed",
      ip_address: item.ip_address || "",
      timestamp: item.created_at,
      device: item.user_agent || "",
      user_agent: item.user_agent || "",
      location: item.extra_data?.location,
    }));
  },
};

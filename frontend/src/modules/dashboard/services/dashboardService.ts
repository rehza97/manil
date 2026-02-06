/**
 * Dashboard Service
 *
 * Service layer for dashboard operations
 *
 * @module modules/dashboard/services
 */

import { dashboardApi } from "@/shared/api";
import type {
  DashboardResponse,
  CorporateDashboardResponse,
  SupportDashboardResponse,
} from "@/shared/api/dashboard";

export const dashboardService = {
  /**
   * Get customer dashboard data
   */
  getCustomerDashboard: async (period: string = "month"): Promise<DashboardResponse> => {
    return await dashboardApi.getCustomerDashboard(period);
  },

  /**
   * Get corporate dashboard data
   */
  getCorporateDashboard: async (
    period: string = "month"
  ): Promise<CorporateDashboardResponse> => {
    return await dashboardApi.getCorporateDashboard(period);
  },

  /**
   * Get support dashboard data (Support Agent / Support Supervisor)
   */
  getSupportDashboard: async (
    period: string = "month"
  ): Promise<SupportDashboardResponse> => {
    return await dashboardApi.getSupportDashboard(period);
  },
};


/**
 * Dashboard Service
 *
 * Service layer for dashboard operations
 *
 * @module modules/dashboard/services
 */

import { dashboardApi } from "@/shared/api";
import type { DashboardResponse } from "@/shared/api/dashboard";

export const dashboardService = {
  /**
   * Get customer dashboard data
   */
  getCustomerDashboard: async (period: string = "month"): Promise<DashboardResponse> => {
    return await dashboardApi.getCustomerDashboard(period);
  },
};


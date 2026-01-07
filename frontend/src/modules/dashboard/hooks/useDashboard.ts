/**
 * Dashboard Hooks
 *
 * React Query hooks for dashboard operations
 *
 * @module modules/dashboard/hooks
 */

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";

/**
 * Get customer dashboard data
 */
export const useCustomerDashboard = (period: string = "month") => {
  return useQuery({
    queryKey: ["dashboard", "customer", period],
    queryFn: () => dashboardService.getCustomerDashboard(period),
  });
};











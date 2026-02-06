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

/**
 * Get corporate dashboard data
 */
export const useCorporateDashboard = (period: string = "month") => {
  return useQuery({
    queryKey: ["dashboard", "corporate", period],
    queryFn: () => dashboardService.getCorporateDashboard(period),
  });
};

/**
 * Get support dashboard data (Support Agent / Support Supervisor)
 */
export const useSupportDashboard = (period: string = "month") => {
  return useQuery({
    queryKey: ["dashboard", "support", period],
    queryFn: () => dashboardService.getSupportDashboard(period),
  });
};












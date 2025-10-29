/**
 * Activity Hooks
 *
 * React Query hooks for activity logs and security monitoring
 */

import { useQuery } from "@tanstack/react-query";
import {
  activityService,
  type ActivityLog,
  type ActivityFilters,
  type ActivityStats,
  type PaginatedActivityLogs,
} from "../services/activityService";

export const useActivityLogs = (
  page: number = 1,
  limit: number = 50,
  filters: ActivityFilters = {}
) => {
  return useQuery<PaginatedActivityLogs>({
    queryKey: ["admin", "activity", "logs", page, limit, filters],
    queryFn: () => activityService.getActivityLogs(page, limit, filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useActivityStats = () => {
  return useQuery<ActivityStats>({
    queryKey: ["admin", "activity", "stats"],
    queryFn: activityService.getActivityStats,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useUserLoginHistory = (userId: string) => {
  return useQuery<ActivityLog[]>({
    queryKey: ["admin", "activity", "user", userId, "login-history"],
    queryFn: () => activityService.getUserLoginHistory(userId),
    enabled: !!userId,
  });
};

export const useSecurityActivity = () => {
  return useQuery<ActivityLog[]>({
    queryKey: ["admin", "activity", "security"],
    queryFn: activityService.getSecurityActivity,
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

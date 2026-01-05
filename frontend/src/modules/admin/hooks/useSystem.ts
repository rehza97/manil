/**
 * System Hooks
 *
 * React Query hooks for system overview and health monitoring
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  systemService,
  type SystemOverview,
  type SystemHealth,
  type SystemStats,
} from "../services/systemService";

export const useSystemOverview = () => {
  return useQuery<SystemOverview>({
    queryKey: ["admin", "system", "overview"],
    queryFn: systemService.getSystemOverview,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useSystemHealth = () => {
  return useQuery<SystemHealth>({
    queryKey: ["admin", "system", "health"],
    queryFn: systemService.getSystemHealth,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useSystemStats = () => {
  return useQuery<SystemStats>({
    queryKey: ["admin", "system", "stats"],
    queryFn: systemService.getSystemStats,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useDetailedHealth = () => {
  return useQuery({
    queryKey: ["admin", "system", "detailed-health"],
    queryFn: () => systemService.getDetailedHealth(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useRecentActivity = (limit: number = 10) => {
  return useQuery({
    queryKey: ["admin", "system", "recent-activity", limit],
    queryFn: () => systemService.getRecentActivity(limit),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const useUsersByRole = () => {
  return useQuery({
    queryKey: ["admin", "system", "users-by-role"],
    queryFn: () => systemService.getUsersByRole(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

export const usePerformanceMetrics = (filters?: {
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: ["admin", "system", "performance", filters],
    queryFn: () => systemService.getPerformanceMetrics(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // 10 seconds
  });
};

export const useSystemAlerts = (filters?: {
  severity?: string;
  status?: string;
  resolved?: boolean;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ["admin", "system", "alerts", filters],
    queryFn: () => systemService.getAlerts(filters),
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useSystemLogs = (filters?: {
  level?: string;
  component?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ["admin", "system", "logs", filters],
    queryFn: () => systemService.getSystemLogs(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => systemService.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system", "alerts"] });
    },
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => systemService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system", "alerts"] });
    },
  });
};

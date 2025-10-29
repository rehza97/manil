/**
 * System Hooks
 *
 * React Query hooks for system overview and health monitoring
 */

import { useQuery } from "@tanstack/react-query";
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
    refetchInterval: 30000, // Refetch every 30 seconds
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
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useDetailedHealth = () => {
  return useQuery({
    queryKey: ["admin", "system", "detailed-health"],
    queryFn: () => systemService.getDetailedHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useRecentActivity = (limit: number = 10) => {
  return useQuery({
    queryKey: ["admin", "system", "recent-activity", limit],
    queryFn: () => systemService.getRecentActivity(limit),
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useUsersByRole = () => {
  return useQuery({
    queryKey: ["admin", "system", "users-by-role"],
    queryFn: () => systemService.getUsersByRole(),
    refetchInterval: 60000, // Refetch every minute
  });
};

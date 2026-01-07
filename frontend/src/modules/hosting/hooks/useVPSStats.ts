/**
 * React Query hooks for VPS Stats and Timeline
 */

import { useQuery } from "@tanstack/react-query";
import { vpsService } from "../services";

/**
 * Get VPS stats with auto-refresh
 */
export const useVPSStats = (subscriptionId: string, hours: number = 24) => {
  return useQuery({
    queryKey: ["vps", "stats", subscriptionId, hours],
    queryFn: () => vpsService.getContainerStats(subscriptionId, hours),
    enabled: !!subscriptionId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
};

/**
 * Get container logs
 */
export const useVPSLogs = (subscriptionId: string, tail: number = 100) => {
  return useQuery({
    queryKey: ["vps", "logs", subscriptionId, tail],
    queryFn: () => vpsService.getContainerLogs(subscriptionId, tail),
    enabled: !!subscriptionId,
  });
};

/**
 * Get subscription timeline
 */
export const useVPSTimeline = (subscriptionId: string) => {
  return useQuery({
    queryKey: ["vps", "timeline", subscriptionId],
    queryFn: () => vpsService.getTimeline(subscriptionId),
    enabled: !!subscriptionId,
  });
};










/**
 * DNS Statistics Hooks
 *
 * React Query hooks for DNS statistics and metrics.
 */
import { useQuery } from "@tanstack/react-query";
import { dnsService } from "../services";
import type { DNSZoneStatistics } from "../types";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get DNS zone statistics
 * Available to both clients (their zones) and admins (all zones)
 */
export const useDNSStatistics = () => {
  return useQuery({
    queryKey: ["dns", "statistics"],
    queryFn: () => dnsService.getZoneStatistics(),
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};

/**
 * Get real-time DNS metrics for monitoring dashboard
 */
export const useDNSMetrics = () => {
  return useQuery({
    queryKey: ["dns", "metrics"],
    queryFn: () => dnsService.getZoneStatistics(),
    refetchInterval: 30000, // Poll every 30 seconds for live dashboard
  });
};

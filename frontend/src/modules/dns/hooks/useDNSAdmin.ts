/**
 * DNS Admin Hooks
 *
 * React Query hooks for admin-level DNS operations.
 * CoreDNS management, sync logs, and system zones.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/components/ui/use-toast";
import { dnsService } from "../services";
import type {
  CoreDNSStatus,
  DNSSyncLog,
  DNSSyncLogListResponse,
  CreateSystemZoneRequest,
  DNSZone,
} from "../types";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format DNS admin error messages to be user-friendly
 * @param error - The error object from axios/react-query
 * @returns User-friendly error message
 */
function formatDNSAdminError(error: any): string {
  const errorMessage = error?.response?.data?.detail || error?.message || "";
  const statusCode = error?.response?.status;

  // Check for connection errors
  if (
    errorMessage.toLowerCase().includes("connection attempts failed") ||
    errorMessage.toLowerCase().includes("connecterror") ||
    errorMessage.toLowerCase().includes("connection refused") ||
    errorMessage.toLowerCase().includes("network error")
  ) {
    return "CoreDNS service is currently unavailable. Please check the service status.";
  }

  // Check for timeout errors
  if (
    errorMessage.toLowerCase().includes("timeout") ||
    errorMessage.toLowerCase().includes("timed out")
  ) {
    return "Request timed out. Please try again.";
  }

  // Handle by HTTP status code
  if (statusCode === 500) {
    return "Service unavailable. The CoreDNS service encountered an error.";
  }

  if (statusCode === 400) {
    return "Invalid request. Please check your input and try again.";
  }

  if (statusCode === 503) {
    return "Service unavailable. Please try again later.";
  }

  // Fallback: return the error message if it's reasonably user-friendly,
  // otherwise return a generic message
  if (errorMessage && errorMessage.length > 0 && errorMessage.length < 200) {
    // If the message is short and doesn't look too technical, use it
    return errorMessage;
  }

  return "An unexpected error occurred. Please try again.";
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get CoreDNS health status (admin)
 */
export const useCoreDNSStatus = () => {
  return useQuery({
    queryKey: ["dns", "admin", "coredns", "status"],
    queryFn: () => dnsService.getCoreDNSStatus(),
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

/**
 * Get DNS sync operation logs (admin)
 */
export const useDNSSyncLogs = (params?: {
  skip?: number;
  limit?: number;
  zone_id?: string;
  operation?: string;
  success?: boolean;
}) => {
  return useQuery({
    queryKey: ["dns", "admin", "sync-logs", params],
    queryFn: () => dnsService.getSyncLogs(params),
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Reload CoreDNS configuration (admin)
 */
export const useReloadCoreDNS = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => dnsService.reloadCoreDNS(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns", "admin", "coredns"] });
      queryClient.invalidateQueries({
        queryKey: ["dns", "admin", "sync-logs"],
      });

      toast({
        title: "CoreDNS Reloaded",
        description: "CoreDNS configuration has been reloaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reload Failed",
        description: formatDNSAdminError(error),
        variant: "destructive",
      });
    },
  });
};

/**
 * Regenerate CoreDNS configuration (admin)
 */
export const useRegenerateCoreDNSConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => dnsService.regenerateCoreDNSConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns", "admin", "coredns"] });
      queryClient.invalidateQueries({
        queryKey: ["dns", "admin", "sync-logs"],
      });

      toast({
        title: "Configuration Regenerated",
        description: "CoreDNS configuration has been regenerated and reloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Regeneration Failed",
        description: formatDNSAdminError(error),
        variant: "destructive",
      });
    },
  });
};

/**
 * Create system DNS zone (admin)
 * System zones are not linked to any VPS subscription
 */
export const useCreateSystemZone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSystemZoneRequest) =>
      dnsService.createSystemZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns", "admin", "zones"] });
      queryClient.invalidateQueries({ queryKey: ["dns", "statistics"] });

      toast({
        title: "System Zone Created",
        description: "System DNS zone has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while creating the system zone",
        variant: "destructive",
      });
    },
  });
};

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
    return "Le service CoreDNS est actuellement indisponible. Vérifiez l'état du service.";
  }

  // Check for timeout errors
  if (
    errorMessage.toLowerCase().includes("timeout") ||
    errorMessage.toLowerCase().includes("timed out")
  ) {
    return "Délai d'attente dépassé. Veuillez réessayer.";
  }

  // Handle by HTTP status code
  if (statusCode === 500) {
    return "Service indisponible. Le service CoreDNS a rencontré une erreur.";
  }

  if (statusCode === 400) {
    return "Requête invalide. Vérifiez vos données et réessayez.";
  }

  if (statusCode === 503) {
    return "Service indisponible. Veuillez réessayer plus tard.";
  }

  // Fallback: return the error message if it's reasonably user-friendly,
  // otherwise return a generic message
  if (errorMessage && errorMessage.length > 0 && errorMessage.length < 200) {
    // If the message is short and doesn't look too technical, use it
    return errorMessage;
  }

  return "Une erreur inattendue s'est produite. Veuillez réessayer.";
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
        title: "CoreDNS rechargé",
        description: "La configuration CoreDNS a été rechargée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec du rechargement",
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
        title: "Configuration régénérée",
        description: "La configuration CoreDNS a été régénérée et rechargée.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la régénération",
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
        title: "Zone système créée",
        description: "La zone DNS système a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la création",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la création de la zone système",
        variant: "destructive",
      });
    },
  });
};

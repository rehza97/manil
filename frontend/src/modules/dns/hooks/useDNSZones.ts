/**
 * DNS Zone Hooks
 * 
 * React Query hooks for DNS zone operations.
 * Follows the pattern from useVPSSubscriptions.ts
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/components/ui/use-toast";
import { dnsService } from "../services";
import type {
  DNSZone,
  DNSZoneDetail,
  DNSZoneListResponse,
  CreateDNSZoneRequest,
  UpdateDNSZoneRequest,
  DNSZoneStatus,
} from "../types";

// ============================================================================
// Query Hooks (Client)
// ============================================================================

/**
 * Get customer's DNS zones with pagination and filters
 */
export const useDNSZones = (params?: {
  skip?: number;
  limit?: number;
  subscription_id?: string;
  status?: DNSZoneStatus;
  zone_name?: string;
}) => {
  return useQuery({
    queryKey: ["dns", "zones", params],
    queryFn: () => dnsService.getZones(params),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (Forbidden) errors
      if (error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Get DNS zone by ID with records
 */
export const useDNSZone = (zoneId: string | undefined) => {
  return useQuery({
    queryKey: ["dns", "zones", zoneId],
    queryFn: () => dnsService.getZone(zoneId!),
    enabled: !!zoneId,
  });
};

// ============================================================================
// Mutation Hooks (Client)
// ============================================================================

/**
 * Create new DNS zone
 */
export const useCreateDNSZone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateDNSZoneRequest) => dnsService.createZone(data),
    onSuccess: () => {
      // Invalidate zones list
      queryClient.invalidateQueries({ queryKey: ["dns", "zones"] });
      queryClient.invalidateQueries({ queryKey: ["dns", "statistics"] });
      
      toast({
        title: "DNS Zone Created",
        description: "Your DNS zone has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Zone",
        description:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          "An error occurred while creating the DNS zone",
        variant: "destructive",
      });
    },
  });
};

/**
 * Update DNS zone settings
 */
export const useUpdateDNSZone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      zoneId,
      data,
    }: {
      zoneId: string;
      data: UpdateDNSZoneRequest;
    }) => dnsService.updateZone(zoneId, data),
    onSuccess: (_, { zoneId }) => {
      // Invalidate specific zone and list
      queryClient.invalidateQueries({ queryKey: ["dns", "zones", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "zones"] });
      
      toast({
        title: "Zone Updated",
        description: "DNS zone settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while updating the zone",
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete DNS zone
 */
export const useDeleteDNSZone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (zoneId: string) => dnsService.deleteZone(zoneId),
    onSuccess: () => {
      // Invalidate all zone queries
      queryClient.invalidateQueries({ queryKey: ["dns", "zones"] });
      queryClient.invalidateQueries({ queryKey: ["dns", "statistics"] });
      
      toast({
        title: "Zone Deleted",
        description: "DNS zone has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while deleting the zone",
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// Admin Query Hooks
// ============================================================================

/**
 * Get all DNS zones (admin view)
 */
export const useAllDNSZones = (params?: {
  skip?: number;
  limit?: number;
  customer_id?: string;
  subscription_id?: string;
  status?: DNSZoneStatus;
  zone_name?: string;
}) => {
  return useQuery({
    queryKey: ["dns", "admin", "zones", params],
    queryFn: () => dnsService.getAllZones(params),
  });
};

/**
 * Get zone by ID (admin)
 */
export const useAdminDNSZone = (zoneId: string | undefined) => {
  return useQuery({
    queryKey: ["dns", "admin", "zones", zoneId],
    queryFn: () => dnsService.getZoneById(zoneId!),
    enabled: !!zoneId,
  });
};

// ============================================================================
// Admin Mutation Hooks
// ============================================================================

/**
 * Activate DNS zone (admin)
 */
export const useActivateDNSZone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (zoneId: string) => dnsService.activateZone(zoneId),
    onSuccess: (_, zoneId) => {
      queryClient.invalidateQueries({ queryKey: ["dns"] });
      
      toast({
        title: "Zone Activated",
        description: "DNS zone has been activated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.response?.data?.detail || "Failed to activate zone",
        variant: "destructive",
      });
    },
  });
};

/**
 * Suspend DNS zone (admin)
 */
export const useSuspendDNSZone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ zoneId, reason }: { zoneId: string; reason: string }) =>
      dnsService.suspendZone(zoneId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns"] });
      
      toast({
        title: "Zone Suspended",
        description: "DNS zone has been suspended successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Suspension Failed",
        description: error.response?.data?.detail || "Failed to suspend zone",
        variant: "destructive",
      });
    },
  });
};

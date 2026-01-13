/**
 * React Query hooks for VPS Service Domains
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vpsService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";
import type {
  ServiceDomainCreate,
  ServiceDomainUpdate,
} from "../types";

/**
 * Get service domains for a subscription
 */
export const useServiceDomains = (
  subscriptionId: string,
  isActive?: boolean
) => {
  return useQuery({
    queryKey: ["vps", "service-domains", subscriptionId, isActive],
    queryFn: () => vpsService.getServiceDomainsBySubscription(subscriptionId, isActive),
    enabled: !!subscriptionId,
  });
};

/**
 * Create custom domain mutation
 */
export const useCreateCustomDomain = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ServiceDomainCreate) => vpsService.createCustomDomain(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vps", "service-domains", variables.subscription_id],
      });
      toast({
        title: "Custom Domain Added",
        description: `Domain ${variables.custom_domain} has been added successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Domain",
        description: error.response?.data?.detail || error.message || "Failed to add custom domain",
        variant: "destructive",
      });
    },
  });
};

/**
 * Update service domain mutation
 */
export const useUpdateServiceDomain = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      domainId,
      data,
      subscriptionId,
    }: {
      domainId: string;
      data: ServiceDomainUpdate;
      subscriptionId: string;
    }) => vpsService.updateServiceDomain(domainId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vps", "service-domains", variables.subscriptionId],
      });
      toast({
        title: "Domain Updated",
        description: "Domain status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || error.message || "Failed to update domain",
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete service domain mutation
 */
export const useDeleteServiceDomain = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      domainId,
      subscriptionId,
    }: {
      domainId: string;
      subscriptionId: string;
    }) => vpsService.deleteServiceDomain(domainId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["vps", "service-domains", variables.subscriptionId],
      });
      toast({
        title: "Domain Deleted",
        description: "Domain has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.response?.data?.detail || error.message || "Failed to delete domain",
        variant: "destructive",
      });
    },
  });
};

/**
 * Get service domain statistics
 */
export const useServiceDomainStatistics = () => {
  return useQuery({
    queryKey: ["vps", "service-domains", "statistics"],
    queryFn: () => vpsService.getServiceDomainStatistics(),
  });
};

/**
 * React Query hooks for VPS Subscriptions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vpsService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";
import { formatDZD } from "@/shared/utils/formatters";
import type {
  CreateVPSRequestBody,
  UpgradeSubscriptionBody,
  CancelSubscriptionBody,
  SubscriptionStatus,
} from "../types";

/**
 * Get my VPS subscriptions
 */
export const useMyVPSSubscriptions = (params?: {
  status?: SubscriptionStatus;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ["vps", "subscriptions", "my", params],
    queryFn: () => vpsService.getMySubscriptions(params),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (Forbidden) errors
      if (error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryOnMount: false,
  });
};

/**
 * Get VPS subscription by ID
 */
export const useVPSSubscription = (subscriptionId: string) => {
  return useQuery({
    queryKey: ["vps", "subscriptions", subscriptionId],
    queryFn: () => vpsService.getSubscription(subscriptionId),
    enabled: !!subscriptionId,
  });
};

/**
 * Request VPS mutation
 */
export const useRequestVPS = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateVPSRequestBody) => vpsService.requestVPS(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "subscriptions"] });
      toast({
        title: "VPS Requested",
        description: "Your VPS request has been submitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.response?.data?.detail || error.message || "Failed to request VPS",
        variant: "destructive",
      });
    },
  });
};

/**
 * Upgrade subscription mutation
 */
export const useUpgradeSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      body,
    }: {
      subscriptionId: string;
      body: UpgradeSubscriptionBody;
    }) => vpsService.upgradeSubscription(subscriptionId, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "subscriptions"] });
      toast({
        title: "Subscription Upgraded",
        description: `Pro-rated amount: ${formatDZD(data.prorated_amount)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.response?.data?.detail || error.message || "Failed to upgrade subscription",
        variant: "destructive",
      });
    },
  });
};

/**
 * Cancel subscription mutation
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      body,
    }: {
      subscriptionId: string;
      body: CancelSubscriptionBody;
    }) => vpsService.cancelSubscription(subscriptionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "subscriptions"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your VPS subscription has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.response?.data?.detail || error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });
};


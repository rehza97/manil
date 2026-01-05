/**
 * React Query hooks for VPS Admin Operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vpsService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";
import type { SubscriptionStatus } from "../types";

/**
 * Get pending VPS requests
 */
export const usePendingVPSRequests = (params?: {
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ["vps", "admin", "requests", "pending", params],
    queryFn: () => vpsService.getPendingRequests(params),
    retry: (failureCount, error: any) => {
      // Don't retry on 403 Forbidden errors
      if (error?.response?.status === 403) return false;
      return failureCount < 1;
    },
  });
};

/**
 * Approve VPS request mutation
 */
export const useApproveVPSRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subscriptionId: string) => vpsService.approveRequest(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "subscriptions"] });
      toast({
        title: "VPS Request Approved",
        description: "Provisioning started in background...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.response?.data?.detail || error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });
};

/**
 * Reject VPS request mutation
 */
export const useRejectVPSRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) =>
      vpsService.rejectRequest(subscriptionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "requests"] });
      toast({
        title: "VPS Request Rejected",
        description: "The request has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.response?.data?.detail || error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });
};

/**
 * Get all VPS subscriptions (admin view)
 */
export const useAllVPSSubscriptions = (params?: {
  status?: SubscriptionStatus;
  customer_id?: string;
  plan_id?: string;
  page?: number;
  page_size?: number;
}) => {
  return useQuery({
    queryKey: ["vps", "admin", "subscriptions", params],
    queryFn: () => vpsService.getAllSubscriptions(params),
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: (failureCount, error: any) => {
      // Don't retry on 403 Forbidden errors
      if (error?.response?.status === 403) return false;
      return failureCount < 1;
    },
  });
};

/**
 * Suspend subscription mutation
 */
export const useSuspendSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) =>
      vpsService.suspendSubscription(subscriptionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "subscriptions"] });
      toast({
        title: "Subscription Suspended",
        description: "The subscription has been suspended.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Suspension Failed",
        description: error.response?.data?.detail || error.message || "Failed to suspend subscription",
        variant: "destructive",
      });
    },
  });
};

/**
 * Reactivate subscription mutation
 */
export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subscriptionId: string) => vpsService.reactivateSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "subscriptions"] });
      toast({
        title: "Subscription Reactivated",
        description: "The subscription has been reactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reactivation Failed",
        description: error.response?.data?.detail || error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
    },
  });
};

/**
 * Terminate subscription mutation
 */
export const useTerminateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      removeVolumes,
    }: {
      subscriptionId: string;
      removeVolumes: boolean;
    }) => vpsService.terminateSubscription(subscriptionId, removeVolumes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "subscriptions"] });
      toast({
        title: "Subscription Terminated",
        description: "Container and all data deleted.",
        variant: "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Termination Failed",
        description: error.response?.data?.detail || error.message || "Failed to terminate subscription",
        variant: "destructive",
      });
    },
  });
};

/**
 * Get monitoring overview with auto-refresh
 */
export const useMonitoringOverview = () => {
  return useQuery({
    queryKey: ["vps", "admin", "monitoring", "overview"],
    queryFn: () => vpsService.getMonitoringOverview(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on 403 Forbidden errors
      if (error?.response?.status === 403) return false;
      return failureCount < 1;
    },
  });
};

/**
 * Get alerts with auto-refresh
 */
export const useAlerts = (severity?: string) => {
  return useQuery({
    queryKey: ["vps", "admin", "alerts", severity],
    queryFn: () => vpsService.getAlerts(severity),
    refetchInterval: 60000, // Refresh every minute
    retry: (failureCount, error: any) => {
      // Don't retry on 403 Forbidden errors
      if (error?.response?.status === 403) return false;
      return failureCount < 1;
    },
  });
};


/**
 * React Query hooks for VPS Plans
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vpsService } from "../services";
import type { VPSPlanCreate, VPSPlanUpdate } from "../types";

/**
 * Get all VPS plans
 */
export const useVPSPlans = (isActive?: boolean) => {
  return useQuery({
    queryKey: ["vps", "plans", isActive],
    queryFn: () => vpsService.getPlans(isActive),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
 * Get VPS plan by ID
 */
export const useVPSPlan = (planId: string) => {
  return useQuery({
    queryKey: ["vps", "plans", planId],
    queryFn: () => vpsService.getPlan(planId),
    enabled: !!planId,
  });
};

// ============================================================================
// Admin Hooks
// ============================================================================

/**
 * Get all VPS plans (admin view - includes inactive)
 */
export const useAllVPSPlans = (isActive?: boolean) => {
  return useQuery({
    queryKey: ["vps", "admin", "plans", isActive],
    queryFn: () => vpsService.getAllPlans(isActive),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Create VPS plan (admin only)
 */
export const useCreateVPSPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VPSPlanCreate) => vpsService.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "plans"] });
    },
  });
};

/**
 * Update VPS plan (admin only)
 */
export const useUpdateVPSPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: VPSPlanUpdate }) =>
      vpsService.updatePlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "plans"] });
    },
  });
};

/**
 * Delete VPS plan (admin only)
 */
export const useDeleteVPSPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => vpsService.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "plans"] });
    },
  });
};

/**
 * Activate VPS plan (admin only)
 */
export const useActivateVPSPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => vpsService.activatePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "plans"] });
    },
  });
};

/**
 * Deactivate VPS plan (admin only)
 */
export const useDeactivateVPSPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => vpsService.deactivatePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps", "admin", "plans"] });
      queryClient.invalidateQueries({ queryKey: ["vps", "plans"] });
    },
  });
};


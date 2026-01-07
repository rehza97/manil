/**
 * React Query hooks for VPS Container Control
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vpsService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";

/**
 * Start container mutation
 */
export const useStartContainer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subscriptionId: string) => vpsService.startContainer(subscriptionId),
    onSuccess: (_, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "subscriptions", subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["vps", "stats", subscriptionId] });
      toast({
        title: "Container Started",
        description: "Your VPS container is now running.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Start Failed",
        description: error.response?.data?.detail || error.message || "Failed to start container",
        variant: "destructive",
      });
    },
  });
};

/**
 * Stop container mutation
 */
export const useStopContainer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subscriptionId: string) => vpsService.stopContainer(subscriptionId),
    onSuccess: (_, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "subscriptions", subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["vps", "stats", subscriptionId] });
      toast({
        title: "Container Stopped",
        description: "Your VPS container has been stopped.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Stop Failed",
        description: error.response?.data?.detail || error.message || "Failed to stop container",
        variant: "destructive",
      });
    },
  });
};

/**
 * Reboot container mutation
 */
export const useRebootContainer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subscriptionId: string) => vpsService.rebootContainer(subscriptionId),
    onSuccess: (_, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: ["vps", "subscriptions", subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["vps", "stats", subscriptionId] });
      toast({
        title: "Container Rebooting",
        description: "Your VPS container is rebooting...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reboot Failed",
        description: error.response?.data?.detail || error.message || "Failed to reboot container",
        variant: "destructive",
      });
    },
  });
};










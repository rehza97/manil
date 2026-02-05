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
        title: "Conteneur démarré",
        description: "Le VPS est en cours d'exécution.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec du démarrage",
        description: error.response?.data?.detail || error.message || "Impossible de démarrer le conteneur.",
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
        title: "Redémarrage en cours",
        description: "Le VPS redémarre. Il sera de nouveau disponible dans quelques instants.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec du redémarrage",
        description: error.response?.data?.detail || error.message || "Impossible de redémarrer le conteneur.",
        variant: "destructive",
      });
    },
  });
};











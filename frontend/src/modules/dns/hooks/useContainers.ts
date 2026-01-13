/**
 * DNS Container Hooks
 *
 * React Query hooks for fetching containers from VPS subscriptions.
 */
import { useQuery } from "@tanstack/react-query";
import { vpsService } from "@/modules/hosting/services";

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  ports_parsed: Array<{
    host_ip: string;
    host_port: number;
    container_port: number;
    protocol: string;
    display: string;
  }>;
}

/**
 * Get containers running inside a VPS subscription
 */
export const useSubscriptionContainers = (subscriptionId: string | undefined) => {
  return useQuery({
    queryKey: ["vps", "subscriptions", subscriptionId, "containers"],
    queryFn: () => vpsService.getSubscriptionContainers(subscriptionId!),
    enabled: !!subscriptionId,
  });
};

/**
 * React Query hook for executing commands in VPS container
 */

import { useMutation } from "@tanstack/react-query";
import { vpsService } from "../services";
import { useToast } from "@/shared/components/ui/use-toast";

export interface ExecCommandResponse {
  exit_code: number;
  output: string;
  command: string;
  executed_at: string;
}

/**
 * Execute command in VPS container mutation
 */
export const useExecCommand = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      command,
      tty = false,
    }: {
      subscriptionId: string;
      command: string;
      tty?: boolean;
    }) => vpsService.execCommand(subscriptionId, command, tty),
    onError: (error: any) => {
      toast({
        title: "Command Execution Failed",
        description: error.response?.data?.detail || error.message || "Failed to execute command",
        variant: "destructive",
      });
    },
  });
};

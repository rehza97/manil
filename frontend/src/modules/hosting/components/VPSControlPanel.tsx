/**
 * VPS Control Panel Component
 *
 * Container control buttons (start/stop/reboot) with status indicator.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Play, Square, RotateCw, Loader2 } from "lucide-react";
import type { VPSSubscription } from "../types";
import { ContainerStatus } from "../types";
import { VPSStatusBadge } from "./VPSStatusBadge";

interface VPSControlPanelProps {
  subscription: VPSSubscription;
  onStart: () => void;
  onStop: () => void;
  onReboot: () => void;
  isLoading?: boolean;
}

export function VPSControlPanel({
  subscription,
  onStart,
  onStop,
  onReboot,
  isLoading = false,
}: VPSControlPanelProps) {
  const containerStatus =
    subscription.container?.status || ContainerStatus.STOPPED;

  const statusConfig: Record<
    ContainerStatus,
    { color: string; text: string }
  > = {
    [ContainerStatus.RUNNING]: {
      color: "bg-green-500",
      text: "Running",
    },
    [ContainerStatus.STOPPED]: {
      color: "bg-gray-500",
      text: "Stopped",
    },
    [ContainerStatus.REBOOTING]: {
      color: "bg-yellow-500",
      text: "Rebooting",
    },
    [ContainerStatus.CREATING]: {
      color: "bg-blue-500",
      text: "Creating",
    },
    [ContainerStatus.ERROR]: {
      color: "bg-red-500",
      text: "Error",
    },
    [ContainerStatus.TERMINATED]: {
      color: "bg-gray-500",
      text: "Terminated",
    },
  };

  const config =
    statusConfig[containerStatus] || statusConfig[ContainerStatus.STOPPED];

  const canStart = containerStatus === ContainerStatus.STOPPED;
  const canStop = containerStatus === ContainerStatus.RUNNING;
  const canReboot = containerStatus === ContainerStatus.RUNNING;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Container Control
          <Badge variant="outline" className="ml-auto">
            <div
              className={`w-2 h-2 rounded-full ${config.color} mr-2`}
              aria-label="Status indicator"
            />
            {config.text}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Button
            onClick={onStart}
            disabled={!canStart || isLoading}
            variant="default"
            className="flex-1"
            aria-label="Start container"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start
          </Button>

          <Button
            onClick={onStop}
            disabled={!canStop || isLoading}
            variant="destructive"
            className="flex-1"
            aria-label="Stop container"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            Stop
          </Button>

          <Button
            onClick={onReboot}
            disabled={!canReboot || isLoading}
            variant="outline"
            className="flex-1"
            aria-label="Reboot container"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Reboot
          </Button>
        </div>

        {subscription.container && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <VPSStatusBadge status={containerStatus} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


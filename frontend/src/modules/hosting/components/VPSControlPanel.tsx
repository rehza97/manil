/**
 * VPS Control Panel Component
 *
 * Container control buttons (start/stop/reboot) with status indicator.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Play, Square, RotateCw, Loader2, Trash2 } from "lucide-react";
import type { VPSSubscription } from "../types";
import { ContainerStatus } from "../types";
import { VPSStatusBadge } from "./VPSStatusBadge";
import { useState } from "react";

interface VPSControlPanelProps {
  subscription: VPSSubscription;
  onStart: () => void;
  onStop: () => void;
  onReboot: () => void;
  onDelete: () => void;
  isLoading?: boolean;
}

export function VPSControlPanel({
  subscription,
  onStart,
  onStop,
  onReboot,
  onDelete,
  isLoading = false,
}: VPSControlPanelProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const containerStatus =
    subscription.container?.status || ContainerStatus.STOPPED;

  const statusConfig: Record<
    ContainerStatus,
    { color: string; text: string }
  > = {
    [ContainerStatus.RUNNING]: {
      color: "bg-green-500",
      text: "En cours",
    },
    [ContainerStatus.STOPPED]: {
      color: "bg-gray-500",
      text: "Arrêté",
    },
    [ContainerStatus.REBOOTING]: {
      color: "bg-yellow-500",
      text: "Redémarrage",
    },
    [ContainerStatus.CREATING]: {
      color: "bg-blue-500",
      text: "Création",
    },
    [ContainerStatus.ERROR]: {
      color: "bg-red-500",
      text: "Erreur",
    },
    [ContainerStatus.TERMINATED]: {
      color: "bg-gray-500",
      text: "Résilié",
    },
  };

  const config =
    statusConfig[containerStatus] || statusConfig[ContainerStatus.STOPPED];

  const canStart = containerStatus === ContainerStatus.STOPPED;
  const canStop = containerStatus === ContainerStatus.RUNNING;
  const canReboot = containerStatus === ContainerStatus.RUNNING;
  const canDelete = containerStatus !== ContainerStatus.TERMINATED && containerStatus !== ContainerStatus.CREATING;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Contrôle du conteneur
          <Badge variant="outline" className="ml-auto">
            <div
              className={`w-2 h-2 rounded-full ${config.color} mr-2`}
              aria-label="Indicateur de statut"
            />
            {config.text}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onStart}
            disabled={!canStart || isLoading}
            variant="default"
            className="flex-1 min-w-[100px]"
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
            className="flex-1 min-w-[100px]"
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
            className="flex-1 min-w-[100px]"
            aria-label="Reboot container"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Reboot
          </Button>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!canDelete || isLoading}
                variant="destructive"
                className="flex-1 min-w-[100px]"
                aria-label="Delete container"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Container</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this container? This action will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Permanently delete the container and all its data</li>
                    <li>Cancel your subscription immediately</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDelete();
                    setIsDeleteDialogOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Container
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {subscription.container && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Statut :</span>
              <VPSStatusBadge status={containerStatus} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


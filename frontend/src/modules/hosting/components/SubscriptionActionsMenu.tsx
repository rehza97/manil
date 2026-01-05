/**
 * Subscription Actions Menu Component
 *
 * Admin dropdown menu with contextual actions for subscriptions.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import type { VPSSubscription } from "../types";
import { SubscriptionStatus } from "../types";
import { useState } from "react";

interface SubscriptionActionsMenuProps {
  subscription: VPSSubscription;
  onSuspend: (reason: string) => void;
  onReactivate: () => void;
  onTerminate: (removeVolumes: boolean) => void;
  isLoading?: boolean;
}

export function SubscriptionActionsMenu({
  subscription,
  onSuspend,
  onReactivate,
  onTerminate,
  isLoading = false,
}: SubscriptionActionsMenuProps) {
  const [suspendReason, setSuspendReason] = useState("");
  const [removeVolumes, setRemoveVolumes] = useState(true);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);

  const canSuspend = subscription.status === SubscriptionStatus.ACTIVE;
  const canReactivate = subscription.status === SubscriptionStatus.SUSPENDED;
  const canTerminate =
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.SUSPENDED ||
    subscription.status === SubscriptionStatus.CANCELLED;

  const hasAnyActions = canSuspend || canReactivate || canTerminate;

  const handleSuspend = () => {
    if (suspendReason.trim()) {
      onSuspend(suspendReason);
      setSuspendReason("");
      setIsSuspendDialogOpen(false);
    }
  };

  const handleTerminate = () => {
    onTerminate(removeVolumes);
    setIsTerminateDialogOpen(false);
    setRemoveVolumes(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading}
            aria-label="Subscription actions"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {!hasAnyActions && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No actions available for {subscription.status.toLowerCase()} subscriptions
            </DropdownMenuItem>
          )}

          {canSuspend && (
            <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-yellow-600 focus:text-yellow-600"
                >
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    Suspending will stop the container but retain all data. The
                    customer will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="suspend-reason">Suspension Reason</Label>
                    <Textarea
                      id="suspend-reason"
                      placeholder="Enter reason for suspension..."
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSuspendReason("")}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSuspend}
                    disabled={!suspendReason.trim()}
                    className="bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    Suspend Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canReactivate && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-green-600 focus:text-green-600"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reactivate Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will start the container and change the status back to
                    ACTIVE. The customer will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onReactivate}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    Reactivate Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canTerminate && (
            <AlertDialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Terminate
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminate Subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Terminating will permanently delete the container and all associated data. The customer will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-destructive">
                        This action cannot be undone.
                      </strong>
                    </p>
                    <p>
                      Terminating will permanently delete the container and
                      all associated data. The customer will be notified.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remove-volumes"
                      checked={removeVolumes}
                      onCheckedChange={(checked) =>
                        setRemoveVolumes(checked === true)
                      }
                    />
                    <Label
                      htmlFor="remove-volumes"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Delete persistent volumes (all data will be lost)
                    </Label>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setRemoveVolumes(true)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleTerminate}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Terminate Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}


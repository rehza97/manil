/**
 * Pending Request Card Component
 *
 * Admin card for pending VPS requests with approve/reject actions.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { CheckCircle2, X, User, Calendar, Server } from "lucide-react";
import type { VPSSubscription } from "../types";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface PendingRequestCardProps {
  request: VPSSubscription;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function PendingRequestCard({
  request,
  onApprove,
  onReject,
}: PendingRequestCardProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const plan = request.plan;
  const customer = request.customer;

  if (!plan) {
    return null;
  }

  const planSpecs = `${plan.cpu_cores} CPU, ${plan.ram_gb}GB RAM, ${plan.storage_gb}GB Storage`;

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
      setRejectReason("");
      setIsRejectDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {request.subscription_number}
            </CardTitle>
            <CardDescription>
              Requested{" "}
              {formatDistanceToNow(new Date(request.created_at), {
                addSuffix: true,
              })}
            </CardDescription>
          </div>
          <Badge variant="secondary">Pending</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Customer:</span>
            <span>
              {customer?.full_name || "Unknown"} ({customer?.email || "N/A"})
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Requested:</span>
            <span>{new Date(request.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Plan Info */}
        <div className="p-4 bg-muted rounded-md space-y-2">
          <div className="font-medium">{plan.name}</div>
          <div className="text-sm text-muted-foreground">{planSpecs}</div>
          <div className="text-sm">
            <span className="font-medium">Monthly Price: </span>
            <span>{formatDZD(plan.monthly_price)}</span>
            {plan.setup_fee > 0 && (
              <span className="text-muted-foreground">
                {" "}
                + {formatDZD(plan.setup_fee)} setup fee
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onApprove}
            className="flex-1"
            variant="default"
            aria-label="Approve request"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>

          <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1"
                aria-label="Reject request"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject VPS Request</AlertDialogTitle>
                <AlertDialogDescription>
                  Please provide a reason for rejecting this request. The
                  customer will be notified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reject-reason">Rejection Reason</Label>
                  <Textarea
                    id="reject-reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRejectReason("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reject Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}


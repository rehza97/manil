/**
 * ApprovalWorkflow Component
 * Handles customer approval workflow
 */

import { useState } from "react";
import { useCustomer, useSubmitForApproval, useApproveCustomer, useRejectCustomer } from "../hooks/useCustomers";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

const APPROVAL_STATUS_COLORS = {
  not_required: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const APPROVAL_STATUS_LABELS = {
  not_required: "Non requis",
  pending: "En attente d'approbation",
  approved: "Approuvé",
  rejected: "Rejeté",
};

interface ApprovalWorkflowProps {
  customerId: string;
}

export function ApprovalWorkflow({ customerId }: ApprovalWorkflowProps) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const submitForApproval = useSubmitForApproval();
  const approveCustomer = useApproveCustomer();
  const rejectCustomer = useRejectCustomer();
  
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    );
  }

  if (!customer) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Customer not found</AlertDescription>
      </Alert>
    );
  }

  const approvalStatus = customer.approval_status || "not_required";

  const handleSubmitForApproval = async () => {
    setError(null);
    try {
      await submitForApproval.mutateAsync({ id: customerId, notes });
      setNotes("");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Échec de la soumission pour approbation");
    }
  };

  const handleApprove = async () => {
    setError(null);
    try {
      await approveCustomer.mutateAsync({ id: customerId, notes });
      setNotes("");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Échec de l'approbation du client");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setError(null);
    try {
      await rejectCustomer.mutateAsync({ id: customerId, reason: rejectionReason });
      setRejectionReason("");
      setShowRejectDialog(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Échec du rejet du client");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow d&apos;approbation</CardTitle>
        <CardDescription>
          Gérer le processus d&apos;approbation du client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Statut d&apos;approbation :</span>
          <Badge className={APPROVAL_STATUS_COLORS[approvalStatus]}>
            {APPROVAL_STATUS_LABELS[approvalStatus]}
          </Badge>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {approvalStatus === "not_required" && (
          <div className="space-y-4">
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                placeholder="Ajouter des notes pour la soumission..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleSubmitForApproval}
              disabled={submitForApproval.isPending}
            >
              {submitForApproval.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Soumettre pour approbation
            </Button>
          </div>
        )}

        {approvalStatus === "pending" && (
          <div className="space-y-4">
            <div>
              <Label>Notes d&apos;approbation (optionnel)</Label>
              <Textarea
                placeholder="Ajouter des notes d'approbation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={approveCustomer.isPending}
                variant="default"
              >
                {approveCustomer.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                disabled={rejectCustomer.isPending}
                variant="destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {approvalStatus === "approved" && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Le client a été approuvé. Statut : {customer.status}
            </AlertDescription>
          </Alert>
        )}

        {approvalStatus === "rejected" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              L&apos;approbation du client a été rejetée. Statut : {customer.status}
            </AlertDescription>
          </Alert>
        )}

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
            <DialogTitle>Rejeter l&apos;approbation du client</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du rejet de cette approbation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Raison du rejet *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Saisissez la raison du rejet..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectCustomer.isPending}
              >
                {rejectCustomer.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Rejeter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

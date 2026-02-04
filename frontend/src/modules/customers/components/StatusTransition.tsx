/**
 * StatusTransition Component
 * Handles customer status transitions with validation
 */

import { useState } from "react";
import { useCustomer, useActivateCustomer, useSuspendCustomer } from "../hooks/useCustomers";
import type { CustomerStatus } from "../types";
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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { toast } from "sonner";

const STATUS_COLORS: Record<CustomerStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<CustomerStatus, string> = {
  pending: "En attente",
  active: "Actif",
  suspended: "Suspendu",
  inactive: "Inactif",
};

// Valid status transitions
const VALID_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  pending: ["active", "inactive"],
  active: ["suspended", "inactive"],
  suspended: ["active", "inactive"],
  inactive: ["pending"],
};

interface StatusTransitionProps {
  customerId: string;
}

export function StatusTransition({ customerId }: StatusTransitionProps) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const activateCustomer = useActivateCustomer();
  const suspendCustomer = useSuspendCustomer();
  
  const [reason, setReason] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus | null>(null);
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
        <AlertDescription>Client introuvable</AlertDescription>
      </Alert>
    );
  }

  const currentStatus = customer.status;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    
    console.log("[StatusTransition.handleStatusChange] Before validation:", {
      selectedStatus,
      reason,
      reasonLength: reason?.length,
      reasonTrimmed: reason?.trim(),
      reasonTrimmedLength: reason?.trim()?.length
    });
    
    if (!reason.trim()) {
      setError("Reason is required for status transitions");
      return;
    }

    setError(null);

    try {
      console.log("[StatusTransition.handleStatusChange] Calling mutation with:", {
        id: customerId,
        reason
      });
      
      if (selectedStatus === "active") {
        await activateCustomer.mutateAsync({ id: customerId, reason });
      } else if (selectedStatus === "suspended") {
        await suspendCustomer.mutateAsync({ id: customerId, reason });
      }
      setReason("");
      setSelectedStatus(null);
      toast.success(`Statut du client mis à jour vers ${STATUS_LABELS[selectedStatus]} avec succès`);
    } catch (err: any) {
      console.error("[StatusTransition.handleStatusChange] Error:", err);
      console.error("[StatusTransition.handleStatusChange] Error response:", err?.response?.data);
      const errorMessage = err?.response?.data?.detail || "Failed to change status";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion du statut</CardTitle>
        <CardDescription>
          Modifier le statut du compte client avec validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Statut actuel :</span>
          <Badge className={STATUS_COLORS[currentStatus]}>
            {STATUS_LABELS[currentStatus]}
          </Badge>
        </div>

        {allowedTransitions.length > 0 ? (
          <div className="space-y-4">
            <div>
              <Label>Changer le statut vers</Label>
              <div className="flex gap-2 mt-2">
                {allowedTransitions.map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    onClick={() => {
                      setSelectedStatus(status);
                      setError(null);
                    }}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>

            {selectedStatus && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Required)</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for status change..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {selectedStatus && (
              <Button
                onClick={handleStatusChange}
                disabled={
                  !reason.trim() ||
                  activateCustomer.isPending ||
                  suspendCustomer.isPending
                }
                className="w-full"
              >
                {(activateCustomer.isPending || suspendCustomer.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Changer le statut vers {STATUS_LABELS[selectedStatus]}
              </Button>
            )}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun changement de statut possible depuis le statut {STATUS_LABELS[currentStatus]}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

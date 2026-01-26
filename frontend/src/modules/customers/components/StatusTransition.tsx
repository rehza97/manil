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

const STATUS_COLORS: Record<CustomerStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<CustomerStatus, string> = {
  pending: "Pending",
  active: "Active",
  suspended: "Suspended",
  inactive: "Inactive",
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
        <AlertDescription>Customer not found</AlertDescription>
      </Alert>
    );
  }

  const currentStatus = customer.status;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    
    if (!reason.trim()) {
      setError("Reason is required for status transitions");
      return;
    }

    setError(null);

    try {
      if (selectedStatus === "active") {
        await activateCustomer.mutateAsync({ id: customerId, reason });
      } else if (selectedStatus === "suspended") {
        await suspendCustomer.mutateAsync({ id: customerId, reason });
      }
      setReason("");
      setSelectedStatus(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to change status");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Management</CardTitle>
        <CardDescription>
          Change customer account status with validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className={STATUS_COLORS[currentStatus]}>
            {STATUS_LABELS[currentStatus]}
          </Badge>
        </div>

        {allowedTransitions.length > 0 ? (
          <div className="space-y-4">
            <div>
              <Label>Change Status To</Label>
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
                Change Status to {STATUS_LABELS[selectedStatus]}
              </Button>
            )}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No status transitions available from {STATUS_LABELS[currentStatus]} status
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

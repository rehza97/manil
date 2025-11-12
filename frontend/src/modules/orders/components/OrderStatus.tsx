/**
 * OrderStatus Component
 * Handles order status transitions
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOrder, useUpdateOrderStatus } from "../hooks/useOrders";
import type { OrderStatus } from "../types/order.types";
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
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const STATUS_COLORS: Record<OrderStatus, string> = {
  request: "bg-blue-100 text-blue-800",
  validated: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  request: "Request",
  validated: "Validated",
  in_progress: "In Progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  request: "Order has been created and is awaiting validation",
  validated: "Order has been validated and approved",
  in_progress: "Order is being prepared for delivery",
  delivered: "Order has been delivered to customer",
  cancelled: "Order has been cancelled",
};

// Valid status transitions based on workflow
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  request: ["validated", "cancelled"],
  validated: ["in_progress", "cancelled"],
  in_progress: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("");
  const [notes, setNotes] = useState("");

  if (!orderId) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Invalid Order ID</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const { data: order, isLoading: orderLoading, isError: orderError } = useOrder(orderId);
  const updateStatusMutation = useUpdateOrderStatus();

  const handleStatusChange = async () => {
    if (!selectedStatus || !order) return;

    try {
      await updateStatusMutation.mutateAsync({
        orderId,
        data: {
          status: selectedStatus,
          notes: notes || undefined,
        },
      });
      navigate(`/orders/${orderId}`);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const availableTransitions = order ? VALID_TRANSITIONS[order.status] : [];
  const isTransitionAvailable = selectedStatus && availableTransitions.includes(selectedStatus);

  if (orderError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Order</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">Order not found or unable to load</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(`/orders/${orderId}`)}
        >
          ← Back to Order
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Update Order Status</h1>
        {orderLoading ? (
          <Skeleton className="mt-2 h-4 w-48" />
        ) : (
          order && (
            <p className="mt-2 text-gray-600">
              for {order.order_number}
            </p>
          )
        )}
      </div>

      {/* Current Status */}
      {orderLoading ? (
        <Skeleton className="h-40" />
      ) : (
        order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={`${STATUS_COLORS[order.status]} text-base`}>
                  {STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {STATUS_DESCRIPTIONS[order.status]}
              </p>
            </CardContent>
          </Card>
        )
      )}

      {/* Available Transitions */}
      {!orderLoading && order && (
        <>
          {availableTransitions.length === 0 ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">No Transitions Available</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">
                  This order status cannot be changed. Orders in{" "}
                  <Badge variant="outline">{STATUS_LABELS[order.status]}</Badge> status are final.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Change Status</CardTitle>
                <CardDescription>Select a new status for this order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Options */}
                <div className="space-y-3">
                  {availableTransitions.map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                        selectedStatus === status
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          checked={selectedStatus === status}
                          onChange={() => setSelectedStatus(status)}
                          className="mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_COLORS[status]}>
                              {STATUS_LABELS[status]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {STATUS_DESCRIPTIONS[status]}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Notes */}
                {selectedStatus && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">
                        Notes (Optional)
                      </label>
                      <p className="text-xs text-gray-600">
                        Add any additional notes about this status change
                      </p>
                    </div>
                    <Textarea
                      placeholder="Enter notes about this status change..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-24"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t pt-6">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/orders/${orderId}`)}
                    disabled={updateStatusMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStatusChange}
                    disabled={!isTransitionAvailable || updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Status Workflow Diagram */}
      {!orderLoading && order && availableTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Workflow</CardTitle>
            <CardDescription>Valid status transitions for orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Request</Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline">Validated</Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline">In Progress</Badge>
              <span className="text-gray-400">→</span>
              <Badge variant="outline">Delivered</Badge>
              <br />
              <span className="text-xs text-gray-600 italic">
                (At any stage, orders can be cancelled)
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

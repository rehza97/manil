/**
 * OrderTimeline Component
 * Displays the timeline of order status changes and events
 */

import { useOrderTimeline } from "../hooks/useOrders";
import type { OrderStatus } from "../types/order.types";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

const STATUS_COLORS: Record<OrderStatus, string> = {
  request: "bg-blue-100 text-blue-800",
  validated: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const ACTION_TYPE_ICONS: Record<string, string> = {
  order_created: "📝",
  status_changed: "🔄",
  note_added: "📌",
  item_updated: "🔧",
  deleted: "🗑️",
};

interface OrderTimelineProps {
  orderId: string | null;
  className?: string;
}

export function OrderTimeline({ orderId, className }: OrderTimelineProps) {
  const { data: timeline, isLoading, isError, error } = useOrderTimeline(orderId);

  if (!orderId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No order selected</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : "Unable to load timeline"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-3 w-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-96" />
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No timeline events yet</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Order Timeline</CardTitle>
        <CardDescription>{timeline.total} event(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timeline.data.map((entry, index) => {
            const icon =
              ACTION_TYPE_ICONS[entry.action_type] ||
              ACTION_TYPE_ICONS["note_added"];
            const isStatusChange =
              entry.previous_status && entry.new_status;

            return (
              <div key={entry.id} className="relative flex gap-4 pb-4">
                {/* Timeline line */}
                {index < timeline.data.length - 1 && (
                  <div className="absolute left-1 top-8 h-12 w-px bg-gray-200" />
                )}

                {/* Timeline dot with icon */}
                <div className="relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg">
                  {icon}
                </div>

                {/* Event content */}
                <div className="flex-1 pt-0.5">
                  <div className="space-y-1">
                    {isStatusChange ? (
                      <p className="text-sm font-medium">
                        Status changed from{" "}
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {entry.previous_status}
                        </Badge>{" "}
                        to{" "}
                        <Badge
                          className={`text-xs ${
                            STATUS_COLORS[
                              entry.new_status as OrderStatus
                            ]
                          }`}
                        >
                          {entry.new_status}
                        </Badge>
                      </p>
                    ) : (
                      <p className="text-sm font-medium">
                        {entry.action_type
                          .replace(/_/g, " ")
                          .charAt(0)
                          .toUpperCase() +
                          entry.action_type
                            .replace(/_/g, " ")
                            .slice(1)}
                      </p>
                    )}

                    {entry.description && (
                      <p className="text-xs text-gray-600">
                        {entry.description}
                      </p>
                    )}

                    <p className="text-xs text-gray-500">
                      <span>{formatDate(entry.created_at)}</span>
                      {entry.performed_by && (
                        <span> • by {entry.performed_by}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

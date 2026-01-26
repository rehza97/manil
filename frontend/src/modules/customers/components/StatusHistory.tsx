/**
 * StatusHistory Component
 * Displays customer status change history
 */

import { useStatusHistory } from "../hooks/useCustomers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Loader2, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-800",
};

interface StatusHistoryProps {
  customerId: string;
}

export function StatusHistory({ customerId }: StatusHistoryProps) {
  const { data: history, isLoading, error } = useStatusHistory(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Failed to load status history</p>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
          <CardDescription>No status changes recorded</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
        <CardDescription>
          Timeline of customer status changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div
              key={entry.id}
              className="flex gap-4 pb-4 border-b last:border-0"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[entry.old_status] || "bg-gray-100"}>
                    {entry.old_status}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className={STATUS_COLORS[entry.new_status] || "bg-gray-100"}>
                    {entry.new_status}
                  </Badge>
                </div>
                {entry.reason && (
                  <p className="text-sm text-muted-foreground">
                    Reason: {entry.reason}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {entry.changed_by_email || entry.changed_by}
                  </span>
                  <span>•</span>
                  <span>
                    {format(new Date(entry.changed_at), "PPp")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

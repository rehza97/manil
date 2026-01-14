/**
 * DNS Sync Log Viewer Component
 *
 * Displays DNS synchronization operation logs.
 */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import type { DNSSyncLog } from "../types";
import { DNSSyncStatus } from "../types";
import { format } from "date-fns";

interface SyncLogViewerProps {
  logs: DNSSyncLog[];
  isLoading?: boolean;
}

export function SyncLogViewer({ logs, isLoading }: SyncLogViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No sync logs found. Operations will appear here as they occur.
        </p>
      </div>
    );
  }

  // Show failed syncs alert if any
  const failedLogs = logs.filter((log) => log.status === DNSSyncStatus.FAILED);

  return (
    <div className="space-y-4">
      {failedLogs.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {failedLogs.length} sync operation{failedLogs.length > 1 ? "s" : ""}{" "}
            failed. Check the logs below for details.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              // Calculate duration if both timestamps are available
              const duration =
                log.triggered_at && log.completed_at
                  ? Math.round(
                      new Date(log.completed_at).getTime() -
                        new Date(log.triggered_at).getTime()
                    )
                  : null;

              // Format timestamp with validation
              const timestamp = log.triggered_at
                ? (() => {
                    try {
                      const date = new Date(log.triggered_at);
                      return isNaN(date.getTime()) ? null : date;
                    } catch {
                      return null;
                    }
                  })()
                : null;

              return (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.status === DNSSyncStatus.SUCCESS ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Success
                      </Badge>
                    ) : log.status === DNSSyncStatus.FAILED ? (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="mr-1 h-3 w-3" />
                        Failed
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{log.sync_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.zone_id ? (
                      <span className="font-mono text-sm">{log.zone_id}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        All zones
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {duration !== null ? `${duration}ms` : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timestamp ? format(timestamp, "MMM d, HH:mm:ss") : "-"}
                  </TableCell>
                  <TableCell>
                    {log.error_message ? (
                      <span className="text-sm text-destructive">
                        {log.error_message}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

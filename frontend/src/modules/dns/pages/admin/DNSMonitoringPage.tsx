/**
 * DNS Monitoring Page (Admin)
 *
 * CoreDNS health monitoring and sync operation logs.
 */
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {  RefreshCw, Settings, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { CoreDNSStatusIndicator, SyncLogViewer } from "../../components";
import {
  useCoreDNSStatus,
  useDNSSyncLogs,
  useReloadCoreDNS,
  useRegenerateCoreDNSConfig,
  useDNSStatistics,
} from "../../hooks";

export default function DNSMonitoringPage() {
  const [showReloadDialog, setShowReloadDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Fetch data
  const { data: coreDNSStatus, isLoading: statusLoading } = useCoreDNSStatus();
  const { data: syncLogsData, isLoading: logsLoading } = useDNSSyncLogs({
    limit: 20,
  });
  const { data: statistics } = useDNSStatistics();

  const syncLogs = syncLogsData?.items || [];

  // Mutations
  const reloadMutation = useReloadCoreDNS();
  const regenerateMutation = useRegenerateCoreDNSConfig();

  const handleReload = () => {
    reloadMutation.mutate(undefined, {
      onSuccess: () => {
        setShowReloadDialog(false);
      },
    });
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate(undefined, {
      onSuccess: () => {
        setShowRegenerateDialog(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DNS Monitoring</h1>
          <p className="text-muted-foreground">
            CoreDNS health status and sync operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowReloadDialog(true)}
            disabled={reloadMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload CoreDNS
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={regenerateMutation.isPending}
          >
            <Settings className="mr-2 h-4 w-4" />
            Regenerate Config
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_zones}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.active_zones}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_records}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.system_records}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CoreDNS Status */}
      <CoreDNSStatusIndicator status={coreDNSStatus} isLoading={statusLoading} />

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <div>
              <CardTitle>Recent Sync Operations</CardTitle>
              <CardDescription>
                Latest DNS synchronization operations and their status
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SyncLogViewer logs={syncLogs} isLoading={logsLoading} />
        </CardContent>
      </Card>

      {/* Reload Confirmation Dialog */}
      <AlertDialog open={showReloadDialog} onOpenChange={setShowReloadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reload CoreDNS Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reload the CoreDNS configuration from the current zone files
              without regenerating them. This is a safe operation that won't affect
              existing DNS records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reloadMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReload}
              disabled={reloadMutation.isPending}
            >
              {reloadMutation.isPending ? "Reloading..." : "Reload CoreDNS"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate CoreDNS Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will regenerate all CoreDNS zone files from the database and
              reload the server. Use this if you suspect zone files are out of sync
              with the database. This operation may take a few moments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending
                ? "Regenerating..."
                : "Regenerate Config"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
          <h1 className="text-3xl font-bold">Surveillance DNS</h1>
          <p className="text-muted-foreground">
            État de santé CoreDNS et opérations de synchronisation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowReloadDialog(true)}
            disabled={reloadMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recharger CoreDNS
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={regenerateMutation.isPending}
          >
            <Settings className="mr-2 h-4 w-4" />
            Régénérer la config
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zones total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_zones}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Zones actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.active_zones}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enregistrements total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_records}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enregistrements système
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
              <CardTitle>Opérations de synchronisation récentes</CardTitle>
              <CardDescription>
                Dernières opérations de synchronisation DNS et leur statut
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
            <AlertDialogTitle>Recharger la configuration CoreDNS ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela rechargera la configuration CoreDNS à partir des fichiers de zone actuels
              sans les régénérer. Opération sûre qui n&apos;affecte pas les enregistrements DNS existants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reloadMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReload}
              disabled={reloadMutation.isPending}
            >
              {reloadMutation.isPending ? "Rechargement…" : "Recharger CoreDNS"}
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
            <AlertDialogTitle>Régénérer la configuration CoreDNS ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela régénérera tous les fichiers de zone CoreDNS à partir de la base de données et
              rechargera le serveur. Utilisez cette option si les fichiers de zone semblent désynchronisés
              avec la base. L&apos;opération peut prendre quelques instants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerateMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending
                ? "Régénération…"
                : "Régénérer la config"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

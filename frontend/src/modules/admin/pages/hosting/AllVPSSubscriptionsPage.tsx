/**
 * All VPS Subscriptions Page
 *
 * Admin page for managing all VPS hosting subscriptions across all customers
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAllVPSSubscriptions,
  useMonitoringOverview,
  useSuspendSubscription,
  useReactivateSubscription,
  useTerminateSubscription,
} from "@/modules/hosting/hooks";
import { ResourceGauge, SubscriptionActionsMenu } from "@/modules/hosting/components";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Server,
  DollarSign,
  Cpu,
  MemoryStick,
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { formatDZD } from "@/shared/utils/formatters";
import { formatDateSafe } from "@/shared/utils/formatters";
import type { SubscriptionStatus } from "@/modules/hosting/types";
import { useExportReport, useDownloadExport } from "@/modules/reports/hooks/useReports";
import { useToast } from "@/shared/components/ui/use-toast";
import { CreateSubscriptionDialog } from "./CreateSubscriptionDialog";

const ADMIN_VPS_BASE = "/admin/hosting";

export const AllVPSSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const suspendMutation = useSuspendSubscription();
  const reactivateMutation = useReactivateSubscription();
  const terminateMutation = useTerminateSubscription();
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const {
    data: subscriptionsData,
    isLoading,
    error,
    refetch: refetchSubscriptions,
  } = useAllVPSSubscriptions({
    page,
    page_size: 20,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } =
    useMonitoringOverview();

  const handleRefresh = () => {
    refetchSubscriptions();
    refetchOverview();
  };

  const handleSuspend = (subId: string, reason: string) => {
    setActioningId(subId);
    suspendMutation
      .mutateAsync({ subscriptionId: subId, reason })
      .then(() => refetchSubscriptions())
      .finally(() => setActioningId(null));
  };
  const handleReactivate = (subId: string) => {
    setActioningId(subId);
    reactivateMutation
      .mutateAsync(subId)
      .then(() => refetchSubscriptions())
      .finally(() => setActioningId(null));
  };
  const handleTerminate = (subId: string, removeVolumes: boolean) => {
    setActioningId(subId);
    const sub = subscriptions.find((s: { id: string; subscription_number?: string }) => s.id === subId);
    const subNumber = sub?.subscription_number ?? subId;
    terminateMutation
      .mutateAsync({ subscriptionId: subId, removeVolumes })
      .then(() => {
        toast({
          title: "VPS supprimé",
          description: `${subNumber} a été supprimé. Le conteneur et les données ont été supprimés.`,
          variant: "success",
        });
        refetchSubscriptions();
      })
      .finally(() => setActioningId(null));
  };

  const subscriptions = subscriptionsData?.items || [];

  const getStatusBadge = (status: SubscriptionStatus) => {
    const statusConfig: Record<
      SubscriptionStatus,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      PENDING: { label: "En attente", variant: "outline" },
      DOWNLOADING_IMAGE: { label: "Téléchargement", variant: "secondary" },
      PROVISIONING: { label: "Provisionnement", variant: "secondary" },
      ACTIVE: { label: "Actif", variant: "default" },
      SUSPENDED: { label: "Suspendu", variant: "destructive" },
      CANCELLED: { label: "Annulé", variant: "outline" },
      TERMINATED: { label: "Résilié", variant: "destructive" },
    };

    const config = statusConfig[status] || {
      label: status,
      variant: "outline",
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredSubscriptions = searchQuery
    ? subscriptions.filter(
        (sub: (typeof subscriptions)[0]) =>
          sub.subscription_number
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          sub.customer?.full_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          sub.customer?.email
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          sub.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subscriptions;

  // Export hooks
  const exportMutation = useExportReport();
  const downloadMutation = useDownloadExport();

  // Export handler (csv or excel)
  const handleExportVPS = async (format: "csv" | "excel") => {
    try {
      const exportResponse = await exportMutation.mutateAsync({
        report_type: "vps",
        format,
        filters: {},
      });
      await downloadMutation.mutateAsync(exportResponse.file_name);
      const ext = format === "excel" ? "xlsx" : "csv";
      toast({
        title: "Export réussi",
        description: `Abonnements VPS exportés (${ext.toUpperCase()}).`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Échec de l'export",
        description: error instanceof Error ? error.message : "Échec de l'export des abonnements VPS",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Tous les abonnements VPS
          </h1>
          <p className="text-slate-600 mt-1">
            Gérer tous les abonnements VPS pour tous les clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || overviewLoading}
            title="Actualiser les données"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading || overviewLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                disabled={exportMutation.isPending || downloadMutation.isPending}
              >
                <Download className="w-4 h-4" />
                {exportMutation.isPending || downloadMutation.isPending
                  ? "Export en cours…"
                  : "Exporter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportVPS("csv")}>
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportVPS("excel")}>
                Exporter en Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="flex items-center gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Créer un abonnement
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(error as { response?: { status?: number } })?.response?.status ===
            403
              ? "Vous n'avez pas la permission de voir les abonnements VPS. Contactez votre administrateur."
              : "Échec du chargement des abonnements. Veuillez réessayer."}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Abonnements actifs
              </CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview.total_subscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {subscriptionsData?.total || 0} sur{" "}
                {subscriptionsData?.total || 0} au total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDZD(Number(overview.total_monthly_revenue || 0))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Récurrent mensuel
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Utilisation CPU moy.
              </CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ResourceGauge
                value={overview.avg_cpu_usage ?? 0}
                max={100}
                label="CPU"
                unit="%"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Utilisation mémoire moy.
              </CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ResourceGauge
                value={overview.avg_memory_usage ?? 0}
                max={100}
                label="Memory"
                unit="%"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par n° abonnement, client, e-mail ou plan…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as SubscriptionStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="DOWNLOADING_IMAGE">Téléchargement</SelectItem>
                <SelectItem value="PROVISIONING">Provisionnement</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="SUSPENDED">Suspendu</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
                <SelectItem value="TERMINATED">Résilié</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              Aucun abonnement trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° abonnement</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prix mensuel</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map(
                    (subscription: (typeof subscriptions)[0]) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">
                          {subscription.subscription_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {subscription.customer?.full_name || "N/A"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.customer?.email || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {subscription.plan?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(subscription.status)}
                        </TableCell>
                        <TableCell>
                          {formatDZD(subscription.plan?.monthly_price || 0)}
                        </TableCell>
                        <TableCell>
                          {formatDateSafe(
                            subscription.created_at,
                            "MMM dd, yyyy"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `${ADMIN_VPS_BASE}/subscriptions/${subscription.id}`
                                )
                              }
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Voir
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `${ADMIN_VPS_BASE}/subscriptions/${subscription.id}`
                                )
                              }
                              title="Modifier / Gérer"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Modifier
                            </Button>
                            <SubscriptionActionsMenu
                              subscription={subscription as import("@/modules/hosting/types").VPSSubscription}
                              onSuspend={(reason) =>
                                handleSuspend(subscription.id, reason)
                              }
                              onReactivate={() =>
                                handleReactivate(subscription.id)
                              }
                              onTerminate={(removeVolumes) =>
                                handleTerminate(subscription.id, removeVolumes)
                              }
                              isLoading={actioningId === subscription.id}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {subscriptionsData && subscriptionsData.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {subscriptionsData.page} sur {subscriptionsData.total_pages}{" "}
                ({subscriptionsData.total} au total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(subscriptionsData.total_pages, p + 1)
                    )
                  }
                  disabled={page === subscriptionsData.total_pages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSubscriptionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetchSubscriptions()}
      />
    </div>
  );
};

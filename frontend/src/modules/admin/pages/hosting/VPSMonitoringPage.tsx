/**
 * VPS Monitoring Page
 *
 * Admin page for system-wide VPS monitoring and alerts
 */

import React, { useState } from "react";
import {
  useMonitoringOverview,
  useAlerts,
} from "@/modules/hosting/hooks";
import { ResourceGauge } from "@/modules/hosting/components";
import { useExportReport } from "@/modules/admin/hooks/useReports";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Server,
  DollarSign,
  Cpu,
  MemoryStick,
  AlertTriangle,
  Activity,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { formatRevenue } from "@/shared/utils/revenueFormatters";

export const VPSMonitoringPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const { data: overview, isLoading: overviewLoading, error: overviewError } =
    useMonitoringOverview();
  const { data: alerts, isLoading: alertsLoading } = useAlerts(
    severityFilter || undefined
  );

  const filteredAlerts = alerts || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Surveillance VPS</h1>
          <p className="text-slate-600 mt-1">
            Surveillance et alertes système pour toutes les instances VPS
          </p>
        </div>
        {overview && (
          <Badge variant="outline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dernière mise à jour : {format(new Date(), "HH:mm:ss")}
          </Badge>
        )}
      </div>

      {/* Error State */}
      {overviewError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(overviewError as any)?.response?.status === 403
              ? "Vous n'avez pas la permission de voir les données de surveillance VPS. Contactez votre administrateur."
              : "Échec du chargement des données de surveillance. Veuillez réessayer."}
          </AlertDescription>
        </Alert>
      )}

      {/* System Metrics Cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.total_subscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conteneurs actifs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.active_containers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRevenue(Number(overview.total_monthly_revenue || 0))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisation CPU moy.</CardTitle>
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
              <CardTitle className="text-sm font-medium">Utilisation mémoire moy.</CardTitle>
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

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alertes actives</CardTitle>
            <Select
              value={severityFilter || "all"}
              onValueChange={(value) => setSeverityFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toutes les sévérités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sévérités</SelectItem>
                <SelectItem value="HIGH">Élevée</SelectItem>
                <SelectItem value="CRITICAL">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              Aucune alerte active
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abonnement</TableHead>
                    <TableHead>Type d&apos;alerte</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Valeur actuelle</TableHead>
                    <TableHead>Seuil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {alert.subscription_number || "N/A"}
                      </TableCell>
                      <TableCell>{alert.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            alert.severity === "CRITICAL" ? "destructive" : "default"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.message}</TableCell>
                      <TableCell>
                        {alert.current_value?.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        {alert.threshold?.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


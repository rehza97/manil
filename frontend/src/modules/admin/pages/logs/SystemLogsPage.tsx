/**
 * System Logs Page
 *
 * Admin page for viewing system-level logs
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Loader2,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
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
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useToast } from "@/shared/components/ui/use-toast";
import { adminLogsApi } from "@/shared/api/dashboard/admin/logs";
import { useDownloadExport } from "@/modules/reports/hooks/useReports";
import { useSystemLogs } from "../../hooks/useSystem";
import { format } from "date-fns";

export const SystemLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [componentFilter, setComponentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const downloadMutation = useDownloadExport();

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const res = await adminLogsApi.exportSystemLogs(format);
      await downloadMutation.mutateAsync(res.file_name);
      toast({
        title: "Export réussi",
        description: `Journaux système exportés (${format.toUpperCase()}).`,
      });
    } catch (err) {
      toast({
        title: "Échec de l'export",
        description: err instanceof Error ? err.message : "Échec de l'export des journaux système",
        variant: "destructive",
      });
    }
  };

  const filters = {
    level: levelFilter !== "all" ? levelFilter : undefined,
    component: componentFilter !== "all" ? componentFilter : undefined,
    page,
    page_size: 50,
  };

  const { data: logsData, isLoading, error } = useSystemLogs(filters);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [levelFilter, componentFilter]);

  const logs = logsData?.logs || [];
  const filteredLogs = logs.filter((log: any) => {
    if (
      searchQuery &&
      !log.message?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.component?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erreur
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Avertissement
          </Badge>
        );
      case "info":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Info className="h-3 w-3 mr-1" />
            Info
          </Badge>
        );
      default:
        return <Badge variant="outline">{level || "Inconnu"}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Chargement des journaux système…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Journaux système
          </h1>
          <p className="text-slate-600 mt-2">
            Consulter les journaux applicatifs et d'erreur au niveau système.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={downloadMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {downloadMutation.isPending ? "Export en cours…" : "Exporter les journaux"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("csv")}>Exporter CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("excel")}>Exporter Excel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Échec du chargement des journaux système. Veuillez réessayer plus tard.
            {error instanceof Error && ` Erreur : ${error.message}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher dans les journaux…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Select value={componentFilter} onValueChange={setComponentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Composant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les composants</SelectItem>
                <SelectItem value="api">Serveur API</SelectItem>
                <SelectItem value="database">Base de données</SelectItem>
                <SelectItem value="cache">Cache</SelectItem>
                <SelectItem value="email">Service e-mail</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setLevelFilter("all");
                setComponentFilter("all");
                setSearchQuery("");
                setPage(1);
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Effacer les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>
            System Logs ({filteredLogs.length}{" "}
            {logsData?.total ? `of ${logsData.total}` : ""})
          </CardTitle>
          <CardDescription>Application and system event logs</CardDescription>
        </CardHeader>
        <CardContent>
          {!error && logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun journal système pour la période sélectionnée.</p>
              <p className="text-sm mt-2">
                Les journaux système s'afficheront ici au fur et à mesure des événements.
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun journal ne correspond à vos filtres</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log: any) => (
                <div
                  key={log.id || log.timestamp}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getLevelBadge(log.level)}
                        {log.component && (
                          <Badge variant="outline" className="font-normal">
                            {log.component}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500 font-mono">
                          {log.timestamp
                            ? format(new Date(log.timestamp), "PPp")
                            : "N/A"}
                        </span>
                      </div>
                      <p className="text-slate-900 break-words text-sm font-mono">
                        {log.message || log.content || "Aucun message"}
                      </p>
                      {log.stack_trace && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                            Voir la pile d'appels
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-100 p-3 rounded overflow-x-auto border border-slate-200">
                            {log.stack_trace}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {logsData && logsData.total > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-slate-600">
                Affichage de {filteredLogs.length} sur {logsData.total} journaux
                {logsData.total > filteredLogs.length && ` (Page ${page} sur ${Math.ceil(logsData.total / 50)})`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={page >= Math.ceil(logsData.total / 50)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};










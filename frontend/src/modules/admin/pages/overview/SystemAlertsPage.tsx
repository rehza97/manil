/**
 * System Alerts Page
 *
 * Admin page for viewing and managing system alerts
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Loader2,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { format } from "date-fns";
import { useSystemAlerts } from "../../hooks/useSystem";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { systemService } from "../../services/systemService";
import { toast } from "sonner";

export interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  status: "active" | "acknowledged" | "resolved";
  component?: string;
  timestamp: string;
  resolved_at?: string;
  resolved_by?: string;
}

export const SystemAlertsPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Use actual API hook
  const {
    data: alertsData,
    isLoading,
    refetch,
  } = useSystemAlerts({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const alerts: SystemAlert[] = alertsData?.alerts || [];

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => systemService.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system", "alerts"],
      });
      toast.success("Alert resolved successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to resolve alert");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => systemService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system", "alerts"],
      });
      toast.success("Alert acknowledged successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to acknowledge alert");
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (severityFilter !== "all" && alert.severity !== severityFilter)
      return false;
    if (statusFilter !== "all" && alert.status !== statusFilter) return false;
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
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
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case "acknowledged":
        return (
          <Badge className="bg-blue-100 text-blue-800">Acknowledged</Badge>
        );
      case "active":
        return <Badge className="bg-orange-100 text-orange-800">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            System Alerts
          </h1>
          <p className="text-slate-600 mt-2">
            Monitor and manage system alerts and notifications.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
          <CardDescription>
            System alerts and notifications requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No system alerts found. The system is running normally.
              </AlertDescription>
            </Alert>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No alerts found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                        {alert.component && (
                          <Badge variant="outline">{alert.component}</Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg">{alert.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {alert.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{format(new Date(alert.timestamp), "PPp")}</span>
                        {alert.resolved_at && (
                          <span>
                            Resolved:{" "}
                            {format(new Date(alert.resolved_at), "PPp")}
                          </span>
                        )}
                        {alert.resolved_by && (
                          <span>By: {alert.resolved_by}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {alert.status === "active" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            disabled={resolveMutation.isPending}
                          >
                            Resolve
                          </Button>
                        </>
                      )}
                      {alert.status === "acknowledged" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={resolveMutation.isPending}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};












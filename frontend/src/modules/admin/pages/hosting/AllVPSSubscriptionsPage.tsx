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
    terminateMutation
      .mutateAsync({ subscriptionId: subId, removeVolumes })
      .then(() => refetchSubscriptions())
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
      PENDING: { label: "Pending", variant: "outline" },
      DOWNLOADING_IMAGE: { label: "Downloading", variant: "secondary" },
      PROVISIONING: { label: "Provisioning", variant: "secondary" },
      ACTIVE: { label: "Active", variant: "default" },
      SUSPENDED: { label: "Suspended", variant: "destructive" },
      CANCELLED: { label: "Cancelled", variant: "outline" },
      TERMINATED: { label: "Terminated", variant: "destructive" },
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
  const { toast } = useToast();
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
        title: "Export successful",
        description: `VPS subscriptions exported (${ext.toUpperCase()}).`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export VPS subscriptions",
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
            All VPS Subscriptions
          </h1>
          <p className="text-slate-600 mt-1">
            Manage all VPS hosting subscriptions across all customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || overviewLoading}
            title="Refresh data"
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
                  ? "Exporting..."
                  : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportVPS("csv")}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportVPS("excel")}>
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="flex items-center gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create Subscription
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
              ? "You don't have permission to view VPS subscriptions. Please contact your administrator."
              : "Failed to load subscriptions. Please try again."}
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
                Active Subscriptions
              </CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview.total_subscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {subscriptionsData?.total || 0} of{" "}
                {subscriptionsData?.total || 0} total
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
                Recurring monthly
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg CPU Usage
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
                Avg Memory Usage
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
                placeholder="Search by subscription number, customer name, email, or plan..."
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
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="DOWNLOADING_IMAGE">Downloading</SelectItem>
                <SelectItem value="PROVISIONING">Provisioning</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
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
              No subscriptions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Monthly Price</TableHead>
                    <TableHead>Created</TableHead>
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
                              title="View details"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `${ADMIN_VPS_BASE}/subscriptions/${subscription.id}`
                                )
                              }
                              title="Edit / Manage"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
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
                Page {subscriptionsData.page} of {subscriptionsData.total_pages}{" "}
                ({subscriptionsData.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
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
                  Next
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

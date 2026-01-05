/**
 * All VPS Subscriptions Page
 *
 * Admin page for viewing and managing all VPS subscriptions
 */

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useAllVPSSubscriptions,
  useMonitoringOverview,
  useSuspendSubscription,
  useReactivateSubscription,
  useTerminateSubscription,
  useRequestVPS,
  useVPSPlans,
} from "@/modules/hosting/hooks";
import { VPSStatusBadge, SubscriptionActionsMenu } from "@/modules/hosting/components";
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
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { ResourceGauge } from "@/modules/hosting/components";
import { exportToCSV } from "@/shared/utils/csvExport";
import { useUsers } from "@/modules/admin/hooks/useUsers";
import {
  Search,
  Filter,
  Download,
  AlertCircle,
  RefreshCw,
  X,
  Server,
  DollarSign,
  Cpu,
  MemoryStick,
  Plus,
  Loader2,
  Eye,
} from "lucide-react";
import { SubscriptionStatus } from "@/modules/hosting/types";
import { format } from "date-fns";
import type { VPSSubscription } from "@/modules/hosting/types";
import { useToast } from "@/shared/components/ui/use-toast";
import { formatDZD } from "@/shared/utils/formatters";

export const AllVPSSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/corporate") ? "/corporate" : "/admin";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "">("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedDistroId, setSelectedDistroId] = useState("ubuntu-22.04");
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useAllVPSSubscriptions({
    status: statusFilter || undefined,
    customer_id: customerFilter || undefined,
    plan_id: planFilter || undefined,
    page,
    page_size: pageSize,
  });
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useMonitoringOverview();

  const suspendSubscription = useSuspendSubscription();
  const reactivateSubscription = useReactivateSubscription();
  const terminateSubscription = useTerminateSubscription();
  const { data: plansData } = useVPSPlans(true);
  const plans = plansData || [];
  const { data: usersData } = useUsers(1, 100);
  const users = usersData?.data || [];
  const [isCreating, setIsCreating] = useState(false);

  const { data: distros = [] } = useQuery({
    queryKey: ["vps", "admin", "distros"],
    queryFn: async () => {
      const { vpsService } = await import("@/modules/hosting/services");
      return vpsService.getSupportedDistrosAdmin();
    },
  });

  const subscriptions = data?.items || [];
  const pagination = data
    ? {
        total: data.total,
        page: data.page,
        page_size: data.page_size,
        total_pages: data.total_pages,
      }
    : null;

  const hasActiveFilters =
    statusFilter !== "" ||
    customerFilter !== "" ||
    planFilter !== "";

  const handleSuspend = (subscriptionId: string, reason: string) => {
    suspendSubscription.mutate({ subscriptionId, reason });
  };

  const handleReactivate = (subscriptionId: string) => {
    reactivateSubscription.mutate(subscriptionId);
  };

  const handleTerminate = (subscriptionId: string, removeVolumes: boolean) => {
    terminateSubscription.mutate({ subscriptionId, removeVolumes });
  };

  const handleExportCSV = () => {
    if (!subscriptions || subscriptions.length === 0) return;

    const csvData = subscriptions.map((sub) => ({
      "Subscription Number": sub.subscription_number,
      Customer: sub.customer?.full_name || "N/A",
      "Customer Email": sub.customer?.email || "N/A",
      Plan: sub.plan?.name || "N/A",
      Status: sub.status,
      "Container Status": sub.container?.status || "N/A",
      "Next Billing": sub.next_billing_date
        ? format(new Date(sub.next_billing_date), "yyyy-MM-dd")
        : "N/A",
      Created: format(new Date(sub.created_at), "yyyy-MM-dd"),
    }));

    exportToCSV(csvData, `vps-subscriptions-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const clearFilters = () => {
    setStatusFilter("");
    setCustomerFilter("");
    setPlanFilter("");
    setPage(1);
  };

  const handleCreateSubscription = async () => {
    if (!selectedCustomerId || !selectedPlanId) {
      toast({
        title: "Validation Error",
        description: "Please select both a customer and a plan",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { vpsService } = await import("@/modules/hosting/services");
      await vpsService.createSubscriptionAdmin({
        customer_id: selectedCustomerId,
        plan_id: selectedPlanId,
        os_distro_id: selectedDistroId || "ubuntu-22.04",
      });
      toast({
        title: "Subscription Created",
        description: "The subscription has been created successfully and is pending approval.",
      });
      setShowCreateDialog(false);
      setSelectedCustomerId("");
      setSelectedPlanId("");
      setSelectedDistroId("ubuntu-22.04");
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.detail || "Failed to create subscription",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">All VPS Subscriptions</h1>
          <p className="text-slate-600 mt-1">
            Manage all VPS hosting subscriptions across all customers
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Subscription</DialogTitle>
                <DialogDescription>
                  Create a new VPS subscription for a customer. The subscription will be created in PENDING status and can be approved immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">VPS Plan *</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger id="plan">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.cpu_cores} CPU, {plan.ram_gb}GB RAM, {plan.storage_gb}GB Storage
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="distro">OS Distro</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDistroId("ubuntu-22.04")}
                    >
                      Easy Start (Ubuntu)
                    </Button>
                  </div>
                  <Select value={selectedDistroId} onValueChange={setSelectedDistroId}>
                    <SelectTrigger id="distro">
                      <SelectValue placeholder="Select a distro" />
                    </SelectTrigger>
                    <SelectContent>
                      {distros.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedCustomerId("");
                    setSelectedPlanId("");
                    setSelectedDistroId("ubuntu-22.04");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSubscription} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Subscription"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleExportCSV} disabled={!subscriptions || subscriptions.length === 0} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : overviewError ? (
              <div className="text-sm text-muted-foreground">Error loading data</div>
            ) : overview ? (
              <>
                <div className="text-2xl font-bold">{overview.active_containers ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {overview.total_subscriptions ?? 0} total
                </p>
              </>
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : overviewError ? (
              <div className="text-sm text-muted-foreground">Error loading data</div>
            ) : overview ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDZD(Number(overview.total_monthly_revenue || 0))}
                </div>
                <p className="text-xs text-muted-foreground">Recurring monthly</p>
              </>
            ) : (
              <Skeleton className="h-8 w-20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : overviewError ? (
              <div className="text-sm text-muted-foreground">Error loading data</div>
            ) : overview ? (
              <ResourceGauge
                value={overview.avg_cpu_usage ?? 0}
                max={100}
                label="CPU"
                unit="%"
              />
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : overviewError ? (
              <div className="text-sm text-muted-foreground">Error loading data</div>
            ) : overview ? (
              <ResourceGauge
                value={overview.avg_memory_usage ?? 0}
                max={100}
                label="Memory"
                unit="%"
              />
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter by customer ID..."
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                  {(statusFilter ? 1 : 0) +
                    (customerFilter ? 1 : 0) +
                    (planFilter ? 1 : 0)}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Filter Subscriptions</SheetTitle>
              <SheetDescription>
                Use filters to find specific subscriptions
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => {
                    setStatusFilter(value === "all" ? "" : (value as SubscriptionStatus));
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={SubscriptionStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={SubscriptionStatus.PROVISIONING}>
                      Provisioning
                    </SelectItem>
                    <SelectItem value={SubscriptionStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={SubscriptionStatus.SUSPENDED}>Suspended</SelectItem>
                    <SelectItem value={SubscriptionStatus.CANCELLED}>Cancelled</SelectItem>
                    <SelectItem value={SubscriptionStatus.TERMINATED}>Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Input
                  id="plan"
                  placeholder="Filter by plan name..."
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="w-full" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilter && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Status: {statusFilter}
              <button
                onClick={() => setStatusFilter("")}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {planFilter && (
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Plan: {planFilter}
              <button
                onClick={() => setPlanFilter("")}
                className="ml-1 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {(error as any)?.response?.status === 403
                ? "You don't have permission to view VPS subscriptions. Please contact your administrator."
                : "Failed to load subscriptions. Please try again."}
            </span>
            {(error as any)?.response?.status !== 403 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-24" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Subscriptions Table */}
      {!isLoading && !error && subscriptions.length > 0 && (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Container Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">
                        {subscription.subscription_number}
                      </TableCell>
                      <TableCell>
                        {subscription.customer ? (
                          <div>
                            <div className="font-medium">
                              {subscription.customer.full_name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {subscription.customer.email}
                            </div>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{subscription.plan?.name || "N/A"}</TableCell>
                      <TableCell>
                        <VPSStatusBadge status={subscription.status} />
                      </TableCell>
                      <TableCell>
                        {subscription.container ? (
                          <VPSStatusBadge status={subscription.container.status} />
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription.next_billing_date
                          ? format(
                              new Date(subscription.next_billing_date),
                              "MMM dd, yyyy"
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(subscription.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`${basePath}/hosting/subscriptions/${subscription.id}`)}
                          className="mr-2"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                        <SubscriptionActionsMenu
                          subscription={subscription}
                          onSuspend={(reason) => handleSuspend(subscription.id, reason)}
                          onReactivate={() => handleReactivate(subscription.id)}
                          onTerminate={(removeVolumes) =>
                            handleTerminate(subscription.id, removeVolumes)
                          }
                          isLoading={
                            suspendSubscription.isPending ||
                            reactivateSubscription.isPending ||
                            terminateSubscription.isPending
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, pagination.total)} of{" "}
                {pagination.total} subscriptions
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage(Math.min(pagination.total_pages, page + 1))
                  }
                  disabled={page === pagination.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && subscriptions.length === 0 && (
        <Card className="p-12 text-center">
          <Server className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No subscriptions found
          </h3>
          <p className="text-slate-600">
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "No VPS subscriptions have been created yet."}
          </p>
        </Card>
      )}
    </div>
  );
};


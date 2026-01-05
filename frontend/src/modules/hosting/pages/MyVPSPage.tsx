/**
 * My VPS Page
 *
 * Client page for viewing and managing VPS subscriptions
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyVPSSubscriptions } from "../hooks";
import { VPSStatusBadge } from "../components";
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
import { Card } from "@/shared/components/ui/card";
import { Search, RefreshCw, AlertCircle, Server, Eye } from "lucide-react";
import { SubscriptionStatus } from "../types";
import { format } from "date-fns";

export const MyVPSPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error, refetch } = useMyVPSSubscriptions({
    status: statusFilter || undefined,
    page,
    page_size: pageSize,
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

  const handleRowClick = (subscriptionId: string) => {
    navigate(`/dashboard/vps/subscriptions/${subscriptionId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My VPS Subscriptions</h1>
          <p className="text-slate-600 mt-1">
            Manage your VPS hosting subscriptions
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/vps/plans")}>
          <Server className="h-4 w-4 mr-2" />
          Browse Plans
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by subscription number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? "" : (value as SubscriptionStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
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

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {(error as any)?.response?.status === 403
                ? "You don't have permission to access VPS subscriptions. Please contact your administrator."
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

      {/* Empty State */}
      {!isLoading && !error && subscriptions.length === 0 && (
        <Card className="p-12 text-center">
          <Server className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No VPS subscriptions yet
          </h3>
          <p className="text-slate-600 mb-4">
            Get started by browsing our VPS hosting plans.
          </p>
          <Button onClick={() => navigate("/dashboard/vps/plans")}>
            Browse Plans
          </Button>
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
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions
                    .filter((sub) => {
                      if (!searchQuery) return true;
                      return sub.subscription_number
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    })
                    .map((subscription) => (
                      <TableRow
                        key={subscription.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleRowClick(subscription.id)}
                      >
                        <TableCell className="font-medium">
                          {subscription.subscription_number}
                        </TableCell>
                        <TableCell>
                          {subscription.plan?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <VPSStatusBadge status={subscription.status} />
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(subscription.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
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
                {pagination.total === 0 ? (
                  "No subscriptions found"
                ) : (
                  <>
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, pagination.total)} of{" "}
                    {pagination.total} subscriptions
                  </>
                )}
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
    </div>
  );
};


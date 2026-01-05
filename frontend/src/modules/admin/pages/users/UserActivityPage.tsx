/**
 * User Activity Page
 *
 * Admin page for viewing user activity logs
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader, DataTable } from "../../components/shared";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useUser, useUserActivity } from "../../hooks/useUsers";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  Download,
  Activity as ActivityIcon,
} from "lucide-react";
import type { DataTableColumn } from "../../types";
import type { UserActivity } from "../../types";

export const UserActivityPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: user, isLoading: userLoading } = useUser(id!);
  const { data: activityData, isLoading: activityLoading } = useUserActivity(
    id!,
    page,
    pageSize
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionBadgeColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("create")) return "bg-green-100 text-green-800";
    if (actionLower.includes("update") || actionLower.includes("edit"))
      return "bg-blue-100 text-blue-800";
    if (actionLower.includes("delete")) return "bg-red-100 text-red-800";
    if (actionLower.includes("login")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const columns: DataTableColumn<UserActivity>[] = [
    {
      key: "success",
      label: "Status",
      width: "80px",
      render: (value) =>
        value ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        ),
    },
    {
      key: "action",
      label: "Action",
      render: (value) => (
        <Badge className={getActionBadgeColor(value)}>{value}</Badge>
      ),
    },
    {
      key: "resource_type",
      label: "Resource",
      render: (value, row) => (
        <div>
          <p className="font-medium">{value}</p>
          {row.resource_id && (
            <p className="text-xs text-gray-500 font-mono">{row.resource_id}</p>
          )}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (value) => <p className="text-sm max-w-md truncate">{value}</p>,
    },
    {
      key: "ip_address",
      label: "IP Address",
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: "created_at",
      label: "Timestamp",
      render: (value) => <span className="text-sm">{formatDate(value)}</span>,
    },
  ];

  if (userLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading activity...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">User not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/users")}
          className="mt-4"
        >
          Back to Users
        </Button>
      </div>
    );
  }

  const activities = activityData?.data || [];
  const totalActivities = activityData?.total || 0;
  const successCount = activities.filter((a) => a.success).length;
  const failedCount = activities.filter((a) => !a.success).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="User Activity Logs"
        description={`Activity history for ${user.full_name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.full_name, href: `/admin/users/${id}` },
          { label: "Activity" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/users/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to User
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ActivityIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Activities</p>
              <p className="text-2xl font-bold">{totalActivities}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Successful</p>
              <p className="text-2xl font-bold">{successCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold">{failedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ActivityIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Page</p>
              <p className="text-2xl font-bold">{activities.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Activity Logs</h3>
            <p className="text-sm text-gray-500 mt-1">
              Complete history of user actions and events
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login Events</SelectItem>
                <SelectItem value="create">Create Actions</SelectItem>
                <SelectItem value="update">Update Actions</SelectItem>
                <SelectItem value="delete">Delete Actions</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={activities}
          loading={activityLoading}
          emptyMessage="No activity logs found"
        />

        {/* Pagination */}
        {totalActivities > pageSize && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalActivities)} of {totalActivities}{" "}
              activities
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.ceil(totalActivities / pageSize) },
                  (_, i) => i + 1
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === Math.ceil(totalActivities / pageSize) ||
                      Math.abs(p - page) <= 1
                  )
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <Button
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="w-10"
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalActivities / pageSize)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Activity Log Information</p>
            <p className="mt-1">
              Activity logs are retained for 90 days. Successful actions are shown with
              a green checkmark, while failed actions are shown with a red X. Click on
              any row to view more details about the activity.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

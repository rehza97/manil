/**
 * User Activity Logs Page
 *
 * Admin page for viewing activity logs for a specific user
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar,
  Activity,
  Loader2,
  Filter,
  Download,
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
import { useUserAuditLogs } from "../../hooks/useAudit";
import { format } from "date-fns";
import { useUsers } from "../../hooks/useUsers";

export const UserActivityLogsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: users } = useUsers(1, 1000);
  const user = users?.data?.find((u: any) => u.id === id);

  const { data: auditLogs, isLoading } = useUserAuditLogs(id || "", page, 50);

  const logs = auditLogs || [];
  const filteredLogs = logs.filter((log: any) => {
    if (
      actionFilter !== "all" &&
      log.action?.toLowerCase() !== actionFilter.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      login: "bg-purple-100 text-purple-800",
      logout: "bg-gray-100 text-gray-800",
    };

    const color =
      actionColors[action?.toLowerCase()] || "bg-gray-100 text-gray-800";
    return (
      <Badge className={color}>
        {action?.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-green-100 text-green-800">Success</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Failed</Badge>
    );
  };

  // Calculate statistics
  const totalActions = filteredLogs.length;
  const successfulActions = filteredLogs.filter(
    (log: any) => log.success !== false
  ).length;
  const failedActions = filteredLogs.filter(
    (log: any) => log.success === false
  ).length;
  const uniqueActions = new Set(filteredLogs.map((log: any) => log.action))
    .size;

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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/logs")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Logs
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              User Activity Logs
            </h1>
            {user && (
              <p className="text-slate-600 mt-2">
                Activity logs for {user.full_name || user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* User Info & Statistics */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActions}</div>
              <p className="text-xs text-slate-500 mt-1">All logged actions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {successfulActions}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Successful operations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {failedActions}
              </div>
              <p className="text-xs text-slate-500 mt-1">Failed operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Action Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueActions}</div>
              <p className="text-xs text-slate-500 mt-1">
                Different action types
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Detailed activity history for this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No activity logs found for this user</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log: any, index: number) => (
                <div
                  key={log.id || index}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getActionBadge(log.action || "")}
                        {getStatusBadge(log.success !== false)}
                        {log.resource_type && (
                          <Badge variant="outline">{log.resource_type}</Badge>
                        )}
                      </div>

                      <div className="text-sm text-slate-600">
                        {log.resource_type && (
                          <p className="font-medium">
                            {log.action} {log.resource_type}
                            {log.resource_id && ` (${log.resource_id})`}
                          </p>
                        )}
                        {log.metadata && (
                          <p className="text-xs mt-1 text-slate-500">
                            {JSON.stringify(log.metadata)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {log.timestamp && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.timestamp), "PPp")}
                          </span>
                        )}
                        {log.ip_address && (
                          <span className="font-mono">{log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-600">Page {page}</p>
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
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};













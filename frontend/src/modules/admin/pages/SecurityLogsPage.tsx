/**
 * Security Logs Page
 *
 * Admin page for viewing security-related logs
 */

import React, { useState } from "react";
import {
  Shield,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
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
import { useAuditLogs } from "../hooks/useAudit";
import { format } from "date-fns";

export const SecurityLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Filter for security-related actions
  const securityActions = [
    "login",
    "login_failed",
    "logout",
    "password_reset",
    "password_change",
    "2fa_enabled",
    "2fa_disabled",
    "account_locked",
    "account_unlocked",
    "session_revoked",
    "permission_denied",
  ];

  const filters: any = {
    action: actionFilter !== "all" ? actionFilter : undefined,
    // Map status filter to success boolean for backend
    success:
      statusFilter === "success"
        ? true
        : statusFilter === "failed"
        ? false
        : undefined,
  };

  const { data: auditData, isLoading } = useAuditLogs(page, 50, filters);

  // Filter logs for security-related actions
  const securityLogs =
    auditData?.data?.filter((log) =>
      securityActions.some((action) =>
        log.action?.toLowerCase().includes(action.toLowerCase())
      )
    ) || [];

  // Apply search filter
  const filteredLogs = securityLogs.filter(
    (log) =>
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip_address?.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "failed":
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      login: "bg-blue-100 text-blue-800",
      login_failed: "bg-red-100 text-red-800",
      logout: "bg-gray-100 text-gray-800",
      password_reset: "bg-purple-100 text-purple-800",
      password_change: "bg-indigo-100 text-indigo-800",
      "2fa_enabled": "bg-green-100 text-green-800",
      "2fa_disabled": "bg-orange-100 text-orange-800",
      account_locked: "bg-red-100 text-red-800",
      account_unlocked: "bg-green-100 text-green-800",
      session_revoked: "bg-yellow-100 text-yellow-800",
      permission_denied: "bg-red-100 text-red-800",
    };

    const color =
      actionColors[action?.toLowerCase()] || "bg-gray-100 text-gray-800";
    return (
      <Badge className={color}>
        {action?.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Logs
        </h1>
        <p className="text-slate-600 mt-2">
          Monitor security events, login attempts, and authentication
          activities.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {securityActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Security Events ({filteredLogs.length}{" "}
            {auditData?.total ? `of ${auditData.total}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No security logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getActionBadge(log.action || "")}
                        {getStatusBadge(log.status || "")}
                        <span className="text-sm text-slate-600">
                          {log.user_email || "System"}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600">
                        <p className="font-medium">
                          {log.resource_type || "Security Event"}
                        </p>
                        {log.metadata && (
                          <p className="text-xs mt-1 text-slate-500">
                            {JSON.stringify(log.metadata)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {log.ip_address && (
                          <span className="flex items-center gap-1">
                            <span>IP:</span>
                            <span className="font-mono">{log.ip_address}</span>
                          </span>
                        )}
                        {log.timestamp && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.timestamp), "PPp")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {auditData && auditData.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-slate-600">
                Page {page} of {auditData.total_pages}
              </p>
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
                    setPage((p) => Math.min(auditData.total_pages, p + 1))
                  }
                  disabled={page === auditData.total_pages}
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



/**
 * Security Reports Page
 *
 * Admin page for security events and threat analysis
 */

import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  Lock,
  TrendingDown,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSecurityReport, useExportReport } from "../../hooks/useReports";
import { ReportFilters } from "../../components/reports/ReportFilters";
import type { ReportFilters as ReportFiltersType } from "../../components/reports/ReportFilters";

export const SecurityReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });

  const { data: securityReport, isLoading } = useSecurityReport(filters);
  const exportMutation = useExportReport();

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      await exportMutation.mutateAsync({
        reportType: "security",
        format,
        filters,
      });
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error("Export failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Use real API data - handle empty data gracefully
  if (!securityReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Reports
          </h1>
          <p className="text-slate-600 mt-2">
            Security events, threat analysis, and authentication activities.
          </p>
        </div>
        <Alert>
          <AlertDescription>
            No security report data available for the selected period.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData = securityReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Security Reports
        </h1>
        <p className="text-slate-600 mt-2">
          Security events, threat analysis, and authentication activities.
        </p>
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        exportLoading={exportMutation.isPending}
        searchPlaceholder="Search security events..."
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Security Events
            </CardTitle>
            <Shield className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.total_security_events || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total events tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reportData.failed_logins || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Failed attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Successful Logins
            </CardTitle>
            <Lock className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportData.successful_logins || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Successful authentications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Security Score
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.total_security_events > 0
                ? (
                    (reportData.successful_logins /
                      reportData.total_security_events) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-slate-500 mt-1">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Events by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Security Events by Type</CardTitle>
            <CardDescription>
              Distribution of security event types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.security_events_by_type || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="type"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ef4444" name="Event Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Security Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Security Events Trend</CardTitle>
            <CardDescription>Security events over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.security_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  name="Security Events"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top IPs */}
      <Card>
        <CardHeader>
          <CardTitle>Top IP Addresses</CardTitle>
          <CardDescription>Most active IP addresses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(reportData.top_ips || []).map((ip: any, index: number) => (
              <div
                key={ip.ip}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-mono font-medium">{ip.ip}</p>
                    {ip.location && (
                      <p className="text-sm text-slate-500">{ip.location}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{ip.count}</p>
                  <p className="text-xs text-slate-500">events</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suspicious Activities */}
      {reportData.suspicious_activities &&
        reportData.suspicious_activities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activities</CardTitle>
              <CardDescription>Activities requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.suspicious_activities.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="p-4 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-100 text-red-800">
                            {activity.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{activity.type}</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {activity.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};












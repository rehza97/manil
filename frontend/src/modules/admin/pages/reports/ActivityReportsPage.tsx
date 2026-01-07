/**
 * Activity Reports Page
 *
 * Admin page for system-wide activity analysis
 */

import React, { useState } from "react";
import { Activity, TrendingUp, Clock, Users, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useActivityReport, useExportReport } from "../../hooks/useReports";
import { ReportFilters } from "../../components/reports/ReportFilters";
import type { ReportFilters as ReportFiltersType } from "../../components/reports/ReportFilters";

export const ActivityReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });

  const { data: activityReport, isLoading } = useActivityReport(filters);
  const exportMutation = useExportReport();

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      await exportMutation.mutateAsync({
        reportType: "activity",
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
  if (!activityReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Reports
          </h1>
          <p className="text-slate-600 mt-2">
            System-wide activity analysis and usage patterns.
          </p>
        </div>
        <Alert>
          <AlertDescription>
            No activity report data available for the selected period.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData = activityReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Activity Reports
        </h1>
        <p className="text-slate-600 mt-2">
          System-wide activity analysis and usage patterns.
        </p>
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        exportLoading={exportMutation.isPending}
        searchPlaceholder="Search activities..."
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Activities
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.total_activities || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">All system activities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Activity Types
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(reportData.activities_by_type || []).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Different action types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(reportData.activities_by_user || []).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Users with activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Resources</CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(reportData.top_resources || []).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Most accessed resources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Activities by Type</CardTitle>
            <CardDescription>Distribution of action types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.activities_by_type || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Top Resources</CardTitle>
            <CardDescription>Most accessed resources</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.top_resources || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="resource" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Access Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Trend</CardTitle>
          <CardDescription>System activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.activity_trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                name="Activity Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Users by Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Activity</CardTitle>
          <CardDescription>Most active users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(reportData.activities_by_user || []).map(
              (user: any, index: number) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{user.user_name}</p>
                      <p className="text-sm text-slate-500">
                        User ID: {user.user_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{user.count}</p>
                    <p className="text-xs text-slate-500">activities</p>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};












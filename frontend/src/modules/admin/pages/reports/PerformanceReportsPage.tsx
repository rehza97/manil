/**
 * Performance Reports Page
 *
 * Admin page for system performance analytics
 */

import React, { useState } from "react";
import { TrendingUp, Activity, Database, Server, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { usePerformanceReport, useExportReport } from "../../hooks/useReports";
import { ReportFilters } from "../../components/reports/ReportFilters";
import type { ReportFilters as ReportFiltersType } from "../../components/reports/ReportFilters";

export const PerformanceReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFiltersType>({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });

  const { data: performanceReport, isLoading, error } = usePerformanceReport(filters);
  const exportMutation = useExportReport();

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      await exportMutation.mutateAsync({
        reportType: "performance",
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

  // Handle errors
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Performance Reports
          </h1>
          <p className="text-slate-600 mt-2">
            System performance analytics, resource usage, and API metrics.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load performance report data. Please try again later.
            {error instanceof Error && ` Error: ${error.message}`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Use real API data - handle empty data gracefully
  if (!performanceReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Performance Reports
          </h1>
          <p className="text-slate-600 mt-2">
            System performance analytics, resource usage, and API metrics.
          </p>
        </div>
        <Alert>
          <AlertDescription>
            No performance report data available for the selected period.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportData = performanceReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Performance Reports
        </h1>
        <p className="text-slate-600 mt-2">
          System performance analytics, resource usage, and API metrics.
        </p>
      </div>

      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
        exportLoading={exportMutation.isPending}
        searchPlaceholder="Search endpoints..."
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.system_uptime || 0}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Overall availability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.average_response_time || 0}ms
            </div>
            <p className="text-xs text-slate-500 mt-1">API average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Database Queries
            </CardTitle>
            <Database className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.database_performance?.query_time || 0}ms
            </div>
            <p className="text-xs text-slate-500 mt-1">Avg query time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resource Usage
            </CardTitle>
            <Server className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.resource_usage?.cpu_usage ?? "N/A"}
            </div>
            <p className="text-xs text-slate-500 mt-1">CPU utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>
            Response time and resource usage over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={reportData.performance_trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                yAxisId="left"
                label={{
                  value: "Time (ms)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "Usage (%)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="response_time"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                name="Response Time (ms)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="cpu_usage"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                name="CPU Usage (%)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="memory_usage"
                stackId="3"
                stroke="#10b981"
                fill="#10b981"
                name="Memory Usage (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* API Performance */}
      {reportData.api_performance && reportData.api_performance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>API Endpoint Performance</CardTitle>
            <CardDescription>Performance metrics by endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.api_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="endpoint"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="average_response_time"
                  fill="#3b82f6"
                  name="Avg Response Time (ms)"
                />
                <Bar
                  dataKey="error_rate"
                  fill="#ef4444"
                  name="Error Rate (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>
              Current system resource utilization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm text-slate-600">
                    {reportData.resource_usage?.cpu_usage ?? "N/A"}
                    {reportData.resource_usage?.cpu_usage !== null &&
                      reportData.resource_usage?.cpu_usage !== undefined &&
                      "%"}
                  </span>
                </div>
                {reportData.resource_usage?.cpu_usage !== null &&
                reportData.resource_usage?.cpu_usage !== undefined ? (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${reportData.resource_usage.cpu_usage}%`,
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not available</p>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm text-slate-600">
                    {reportData.resource_usage?.memory_usage ?? "N/A"}
                    {reportData.resource_usage?.memory_usage !== null &&
                      reportData.resource_usage?.memory_usage !== undefined &&
                      "%"}
                  </span>
                </div>
                {reportData.resource_usage?.memory_usage !== null &&
                reportData.resource_usage?.memory_usage !== undefined ? (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${reportData.resource_usage.memory_usage}%`,
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not available</p>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Disk Usage</span>
                  <span className="text-sm text-slate-600">
                    {reportData.resource_usage?.disk_usage ?? "N/A"}
                    {reportData.resource_usage?.disk_usage !== null &&
                      reportData.resource_usage?.disk_usage !== undefined &&
                      "%"}
                  </span>
                </div>
                {reportData.resource_usage?.disk_usage !== null &&
                reportData.resource_usage?.disk_usage !== undefined ? (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{
                        width: `${reportData.resource_usage.disk_usage}%`,
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not available</p>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Network Usage</span>
                  <span className="text-sm text-slate-600">
                    {reportData.resource_usage?.network_usage ?? "N/A"}
                    {reportData.resource_usage?.network_usage !== null &&
                      reportData.resource_usage?.network_usage !== undefined &&
                      "%"}
                  </span>
                </div>
                {reportData.resource_usage?.network_usage !== null &&
                reportData.resource_usage?.network_usage !== undefined ? (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${reportData.resource_usage.network_usage}%`,
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Performance</CardTitle>
            <CardDescription>
              Database query and connection metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">
                  Average Query Time
                </p>
                <p className="text-2xl font-bold">
                  {reportData.database_performance?.query_time || 0}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Connection Pool</p>
                <p className="text-2xl font-bold">
                  {reportData.database_performance?.connection_pool || 0} active
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Slow Queries</p>
                <p className="text-2xl font-bold text-red-600">
                  {reportData.database_performance?.slow_queries || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};










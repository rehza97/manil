/**
 * Performance Metrics Page
 *
 * Admin page for system performance monitoring
 */

import React, { useState } from "react";
import {
  TrendingUp,
  RefreshCw,
  Loader2,
  Activity,
  Database,
  Server,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSystemStats, useDetailedHealth } from "../../hooks/useSystem";
import { usePerformanceReport } from "../../hooks/useReports";
import type { ReportFilters } from "../../components/reports/ReportFilters";

export const PerformanceMetricsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useSystemStats();
  const {
    data: detailedHealth,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useDetailedHealth();
  const { data: performanceReport, isLoading: reportLoading } =
    usePerformanceReport(filters);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchHealth()]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const isLoading = statsLoading || healthLoading || reportLoading;

  // Use real API data - handle empty data gracefully
  const performanceTrendData = performanceReport?.performance_trend || [];

  if (isLoading && !performanceReport) {
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
            <TrendingUp className="h-8 w-8" />
            Performance Metrics
          </h1>
          <p className="text-slate-600 mt-2">
            Monitor system performance, response times, and resource usage.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Zap className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceReport?.average_response_time ||
                stats?.api_response_time ||
                45}
              ms
            </div>
            <p className="text-xs text-slate-500 mt-1">API endpoint average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceReport?.system_uptime || stats?.system_uptime || 99.9}
              %
            </div>
            <p className="text-xs text-slate-500 mt-1">Overall availability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Server className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {detailedHealth?.api_server?.cpu_usage || 45}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Current CPU utilization
            </p>
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
              {performanceReport?.database_performance?.query_time ||
                detailedHealth?.database?.response_time ||
                12}
              ms
            </div>
            <p className="text-xs text-slate-500 mt-1">Avg query time</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <Tabs defaultValue="response-time" className="space-y-4">
        <TabsList>
          <TabsTrigger value="response-time">Response Time</TabsTrigger>
          <TabsTrigger value="resource-usage">Resource Usage</TabsTrigger>
          <TabsTrigger value="api-performance">API Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="response-time">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trends</CardTitle>
              <CardDescription>API response time over time</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      label={{
                        value: "Time (ms)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="response_time"
                      stroke="#3b82f6"
                      name="Response Time (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>
                    No performance trend data available for the selected period.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resource-usage">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
              <CardDescription>CPU and memory usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      label={{
                        value: "Usage (%)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cpu_usage"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      name="CPU Usage (%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="memory_usage"
                      stackId="2"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      name="Memory Usage (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>
                    No resource usage data available for the selected period.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-performance">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Performance</CardTitle>
              <CardDescription>Performance by endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceReport?.api_performance &&
              performanceReport.api_performance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceReport.api_performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="endpoint"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      label={{
                        value: "Time (ms)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="average_response_time"
                      fill="#3b82f6"
                      name="Avg Response Time (ms)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>
                    API performance data will be available once the backend
                    endpoint is implemented.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Database Performance */}
      {performanceReport?.database_performance && (
        <Card>
          <CardHeader>
            <CardTitle>Database Performance</CardTitle>
            <CardDescription>
              Database query and connection metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Query Time</p>
                <p className="text-2xl font-bold">
                  {performanceReport.database_performance.query_time}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Connection Pool</p>
                <p className="text-2xl font-bold">
                  {performanceReport.database_performance.connection_pool}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Slow Queries</p>
                <p className="text-2xl font-bold text-red-600">
                  {performanceReport.database_performance.slow_queries}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};













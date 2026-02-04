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
import { ActiveVPSTab } from "./ActiveVPSTab";

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

  // Use real API data - handle empty data gracefully; coerce null to 0 for charts
  const performanceTrendData = (performanceReport?.performance_trend || []).map((d) => ({
    ...d,
    cpu_usage: d.cpu_usage ?? 0,
    memory_usage: d.memory_usage ?? 0,
  }));

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
            Métriques de performance
          </h1>
          <p className="text-slate-600 mt-2">
            Surveillez les performances, temps de réponse et utilisation des ressources.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Temps de réponse moyen
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
            <CardTitle className="text-sm font-medium">Disponibilité système</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceReport?.system_uptime || stats?.system_uptime || 99.9}
              %
            </div>
            <p className="text-xs text-slate-500 mt-1">Disponibilité globale</p>
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
              Utilisation CPU actuelle
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
            <p className="text-xs text-slate-500 mt-1">Temps de requête moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <Tabs defaultValue="response-time" className="space-y-4">
        <TabsList>
          <TabsTrigger value="response-time">Temps de réponse</TabsTrigger>
          <TabsTrigger value="resource-usage">Utilisation des ressources</TabsTrigger>
          <TabsTrigger value="api-performance">Performance API</TabsTrigger>
          <TabsTrigger value="active-vps">VPS actifs</TabsTrigger>
        </TabsList>

        <TabsContent value="response-time">
          <Card>
            <CardHeader>
              <CardTitle>Évolution du temps de réponse</CardTitle>
              <CardDescription>Temps de réponse API dans le temps</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      label={{
                        value: "Temps (ms)",
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
                    Aucune donnée de tendance de performance pour la période sélectionnée.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resource-usage">
          <Card>
            <CardHeader>
<CardTitle>Utilisation des ressources</CardTitle>
            <CardDescription>Utilisation CPU et mémoire dans le temps</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      domain={[0, 100]}
                      label={{
                        value: "Utilisation (%)",
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
                      name="Mémoire (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>
                    Aucune donnée d'utilisation des ressources pour la période sélectionnée.
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
                        value: "Temps (ms)",
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
                    Les données de performance API seront disponibles une fois l'endpoint backend implémenté.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active-vps">
          <ActiveVPSTab />
        </TabsContent>
      </Tabs>

      {/* Database Performance */}
      {performanceReport?.database_performance && (
        <Card>
          <CardHeader>
            <CardTitle>Performance base de données</CardTitle>
            <CardDescription>
              Métriques des requêtes et connexions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Temps des requêtes</p>
                <p className="text-2xl font-bold">
                  {performanceReport.database_performance.query_time}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Pool de connexions</p>
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













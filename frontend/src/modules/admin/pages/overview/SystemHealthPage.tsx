/**
 * System Health Page
 *
 * Admin page for monitoring system health in real-time
 */

import React, { useState } from "react";
import { Activity, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useDetailedHealth, useSystemHealth } from "../../hooks/useSystem";
import {
  HealthStatusCard,
  type ComponentHealth,
} from "../../components/charts/HealthStatusCard";

export const SystemHealthPage: React.FC = () => {
  const { data: detailedHealth, isLoading, refetch } = useDetailedHealth();
  const { data: systemHealth } = useSystemHealth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const mapComponentHealth = (): ComponentHealth[] => {
    if (!detailedHealth) return [];

    const components: ComponentHealth[] = [];

    // Database
    if (detailedHealth.database) {
      components.push({
        name: "Database",
        status:
          detailedHealth.database.status === "healthy" ? "healthy" : "error",
        uptime: detailedHealth.database.uptime,
        response_time: detailedHealth.database.response_time,
        connections: detailedHealth.database.connections,
        max_connections: detailedHealth.database.max_connections,
      });
    }

    // Redis
    if (detailedHealth.redis) {
      components.push({
        name: "Redis Cache",
        status: detailedHealth.redis.status === "healthy" ? "healthy" : "error",
        uptime: detailedHealth.redis.uptime,
        hit_rate: detailedHealth.redis.hit_rate,
        memory_usage: detailedHealth.redis.memory_usage,
      });
    }

    // API Server
    if (detailedHealth.api_server) {
      components.push({
        name: "API Server",
        status:
          detailedHealth.api_server.status === "healthy" ? "healthy" : "error",
        uptime: detailedHealth.api_server.uptime,
        response_time: detailedHealth.api_server.response_time,
        cpu_usage: detailedHealth.api_server.cpu_usage,
        memory_usage: detailedHealth.api_server.memory_usage,
      });
    }

    // Storage
    if (detailedHealth.storage) {
      components.push({
        name: "Storage",
        status:
          detailedHealth.storage.status === "healthy" ? "healthy" : "error",
        usage_percent: detailedHealth.storage.usage_percent,
        available_gb: detailedHealth.storage.available_gb,
        total_gb: detailedHealth.storage.total_gb,
      });
    }

    return components;
  };

  const components = mapComponentHealth();
  const allHealthy = components.every((c) => c.status === "healthy");
  const hasWarnings = components.some((c) => c.status === "warning");
  const hasErrors = components.some((c) => c.status === "error");

  const overallStatus = hasErrors
    ? "error"
    : hasWarnings
    ? "warning"
    : "healthy";

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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            System Health
          </h1>
          <p className="text-slate-600 mt-2">
            Real-time monitoring of system components and their health status.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card
        className={
          overallStatus === "error"
            ? "border-red-200"
            : overallStatus === "warning"
            ? "border-yellow-200"
            : "border-green-200"
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {overallStatus === "error" ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : overallStatus === "warning" ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            ) : (
              <Activity className="h-5 w-5 text-green-600" />
            )}
            Overall System Status
          </CardTitle>
          <CardDescription>
            {allHealthy
              ? "All systems operational"
              : hasErrors
              ? "Some components are experiencing issues"
              : "Some components require attention"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {components.map((component) => (
              <HealthStatusCard
                key={component.name}
                component={component}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health Summary */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                System Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemHealth.uptime.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Overall system availability
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Database Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {systemHealth.database_status}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Response time: {systemHealth.database_response_time}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {systemHealth.critical_alerts}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issues requiring attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};











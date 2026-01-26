/**
 * VPS Stats Dashboard Component
 *
 * Real-time resource monitoring with gauges and charts.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import type { ContainerStats } from "../types";
import { ResourceGauge } from "./ResourceGauge";
import { Loader2 } from "lucide-react";

interface VPSStatsDashboardProps {
  stats?: ContainerStats;
  isLoading: boolean;
  container?: {
    memory_limit_gb: number;
    storage_limit_gb: number;
  };
}

export function VPSStatsDashboard({
  stats,
  isLoading,
  container,
}: VPSStatsDashboardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-600">
            Statistiques non disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStats = stats.current.current_stats;
  const history = stats.history || [];

  // Transform history for charts
  const chartData = history.map((metric) => ({
    time: format(new Date(metric.recorded_at), "HH:mm"),
    timestamp: new Date(metric.recorded_at).getTime(),
    cpu: metric.cpu_usage_percent,
    memory: metric.memory_usage_percent,
    storage: metric.storage_usage_percent,
    networkRx: metric.network_rx_bytes / (1024 * 1024), // Convert to MB
    networkTx: metric.network_tx_bytes / (1024 * 1024), // Convert to MB
  }));

  const cpuPercent = currentStats?.cpu_usage_percent || 0;
  const memoryPercent = currentStats?.memory_usage_percent || 0;
  const storagePercent = currentStats?.storage_usage_percent || 0;
  const memoryMb = currentStats?.memory_usage_mb || 0;
  const storageMb = currentStats?.storage_usage_mb || 0;

  // Calculate limits from container if available, otherwise from usage percentage
  const memoryLimitMb = container
    ? container.memory_limit_gb * 1024
    : memoryPercent > 0
    ? Math.ceil(memoryMb / (memoryPercent / 100))
    : memoryMb * 2; // Fallback: assume 50% usage
  const storageLimitMb = container
    ? container.storage_limit_gb * 1024
    : storagePercent > 0
    ? Math.ceil(storageMb / (storagePercent / 100))
    : storageMb * 2; // Fallback: assume 50% usage

  const chartConfig = {
    cpu: {
      label: "CPU Usage",
      color: "hsl(var(--chart-1))",
    },
    memory: {
      label: "Memory Usage",
      color: "hsl(var(--chart-2))",
    },
    network: {
      label: "Network I/O",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisation des ressources</CardTitle>
        <CardDescription>
          Dernière mise à jour : {format(new Date(stats.current.last_updated), "HH:mm:ss")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ResourceGauge
            value={cpuPercent}
            max={100}
            label="CPU"
            unit="%"
          />
          <ResourceGauge
            value={memoryMb}
            max={memoryLimitMb}
            label="Memory"
            unit="MB"
          />
          <ResourceGauge
            value={storageMb}
            max={storageLimitMb}
            label="Storage"
            unit="MB"
          />
        </div>

        {/* Charts */}
        {chartData.length > 0 ? (
          <Tabs defaultValue="cpu" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cpu">CPU</TabsTrigger>
              <TabsTrigger value="memory">Mémoire</TabsTrigger>
              <TabsTrigger value="network">Réseau</TabsTrigger>
            </TabsList>

            <TabsContent value="cpu" className="mt-4">
              <ChartContainer config={chartConfig} className="h-[200px]">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    label={{ value: "%", angle: -90, position: "insideLeft" }}
                  />
                  <ChartTooltip />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke={chartConfig.cpu.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="memory" className="mt-4">
              <ChartContainer config={chartConfig} className="h-[200px]">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    label={{ value: "%", angle: -90, position: "insideLeft" }}
                  />
                  <ChartTooltip />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke={chartConfig.memory.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="network" className="mt-4">
              <ChartContainer config={chartConfig} className="h-[200px]">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: "MB", angle: -90, position: "insideLeft" }}
                  />
                  <ChartTooltip />
                  <Line
                    type="monotone"
                    dataKey="networkRx"
                    stroke={chartConfig.network.color}
                    strokeWidth={2}
                    dot={false}
                    name="Received"
                  />
                  <Line
                    type="monotone"
                    dataKey="networkTx"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                    name="Transmitted"
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Aucune donnée historique pour le moment
          </div>
        )}
      </CardContent>
    </Card>
  );
}


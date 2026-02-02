/**
 * Active VPS tab: list active VPS and show real-time performance + detail panel.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  Loader2,
  Cpu,
  HardDrive,
  Activity,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
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
import { useAllVPSSubscriptions } from "@/modules/hosting/hooks/useVPSAdmin";
import { vpsService } from "@/modules/hosting/services/vpsService";
import type { VPSSubscription, ContainerStats } from "@/modules/hosting/types";
import { SubscriptionStatus as SubStatus } from "@/modules/hosting/types";
import { Badge } from "@/shared/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const POLL_INTERVAL_MS = 5000;

export const ActiveVPSTab: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: listData, isLoading: listLoading } = useAllVPSSubscriptions({
    status: SubStatus.ACTIVE,
    page_size: 100,
  });

  const { data: currentStatsAll, isLoading: currentStatsLoading } = useQuery({
    queryKey: ["vps", "admin", "monitoring", "current-stats"],
    queryFn: () => vpsService.getCurrentStatsAll(),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["vps", "admin", "stats", selectedId],
    queryFn: () =>
      selectedId
        ? vpsService.getSubscriptionStatsAdmin(selectedId, 24)
        : Promise.resolve(null),
    enabled: !!selectedId,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const items = listData?.items ?? [];
  const resourceChartData =
    currentStatsAll?.map((row) => ({
      name: row.hostname || row.subscription_number,
      cpu: row.cpu_usage_percent ?? 0,
      memory: row.memory_usage_percent ?? 0,
    })) ?? [];

  const chartData =
    stats?.history?.map((h) => ({
      time: h.recorded_at ? formatDistanceToNow(new Date(h.recorded_at), { addSuffix: false }) : "",
      cpu: h.cpu_usage_percent ?? 0,
      memory: h.memory_usage_percent ?? 0,
    })) ?? [];

  const currentStats = stats?.current?.current_stats as
    | {
        cpu_usage_percent?: number;
        memory_usage_percent?: number;
        memory_usage_mb?: number;
        storage_usage_percent?: number;
      }
    | undefined;

  if (listLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resource usage by VPS (live)</CardTitle>
          <CardDescription>Refreshes every {POLL_INTERVAL_MS / 1000}s</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStatsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : resourceChartData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No stats available for active VPS.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resourceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 100]} label={{ value: "Usage (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cpu" fill="#ef4444" name="CPU %" />
                <Bar dataKey="memory" fill="#3b82f6" name="Memory %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Active VPS
          </CardTitle>
          <CardDescription>
            Live list of active VPS. Select a row to see real-time performance and resource usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No active VPS subscriptions at the moment.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((sub: VPSSubscription) => (
                  <TableRow
                    key={sub.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedId(sub.id)}
                  >
                    <TableCell className="font-medium">
                      {sub.subscription_number}
                    </TableCell>
                    <TableCell>
                      {sub.container?.hostname ?? "—"}
                    </TableCell>
                    <TableCell>{sub.plan?.name ?? sub.plan_id}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              VPS details {selectedId ? `· ${listData?.items?.find((s) => s.id === selectedId)?.subscription_number ?? ""}` : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {statsLoading && !stats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : stats?.current?.error ? (
              <p className="text-sm text-amber-600">{stats.current.error}</p>
            ) : (
              <>
                {currentStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          <Cpu className="h-4 w-4" /> CPU
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {currentStats.cpu_usage_percent?.toFixed(1) ?? "—"}%
                        </p>
                        <p className="text-xs text-slate-500">Current usage</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          <Activity className="h-4 w-4" /> Memory
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {currentStats.memory_usage_percent?.toFixed(1) ?? "—"}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {currentStats.memory_usage_mb != null
                            ? `${currentStats.memory_usage_mb} MB`
                            : "Current usage"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-1">
                          <HardDrive className="h-4 w-4" /> Storage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {currentStats.storage_usage_percent?.toFixed(1) ?? "—"}%
                        </p>
                        <p className="text-xs text-slate-500">Usage</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {chartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Resource usage over time</CardTitle>
                      <CardDescription>Refreshes every {POLL_INTERVAL_MS / 1000}s</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="cpu"
                            stroke="#ef4444"
                            name="CPU %"
                          />
                          <Line
                            type="monotone"
                            dataKey="memory"
                            stroke="#3b82f6"
                            name="Memory %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

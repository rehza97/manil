import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ticketService } from "../services";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
} from "lucide-react";

interface AgentPerformanceMetricsProps {
  agentId: string;
}

export const AgentPerformanceMetrics: React.FC<
  AgentPerformanceMetricsProps
> = ({ agentId }) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["agent-sla-metrics", agentId],
    queryFn: () => ticketService.getAgentSLAMetrics(agentId),
    enabled: !!agentId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-slate-500">No metrics available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolution Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.resolution_rate?.toFixed(1) || 0}%
          </div>
          <Badge
            variant={metrics.resolution_rate >= 90 ? "default" : "secondary"}
            className="mt-2"
          >
            {metrics.resolution_rate >= 90 ? "Excellent" : "Needs Improvement"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Avg Response Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.avg_response_time
              ? `${metrics.avg_response_time}h`
              : "N/A"}
          </div>
          <Badge
            variant={metrics.avg_response_time <= 2 ? "default" : "secondary"}
            className="mt-2"
          >
            {metrics.avg_response_time <= 2 ? "Fast" : "Slow"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tickets Resolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.tickets_resolved || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">This period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            SLA Breaches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {metrics.sla_breaches || 0}
          </div>
          <Badge
            variant={metrics.sla_breaches === 0 ? "default" : "destructive"}
            className="mt-2"
          >
            {metrics.sla_breaches === 0 ? "No Breaches" : "Action Required"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};











/**
 * Health Status Card Component
 *
 * Displays health status for a system component
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export interface ComponentHealth {
  name: string;
  status: "healthy" | "warning" | "error" | "unknown";
  uptime?: number;
  response_time?: number;
  cpu_usage?: number;
  memory_usage?: string;
  hit_rate?: number;
  usage_percent?: number;
  connections?: number;
  max_connections?: number;
  available_gb?: number;
  total_gb?: number;
}

interface HealthStatusCardProps {
  component: ComponentHealth;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({
  component,
  onRefresh,
  refreshing = false,
}) => {
  const getStatusBadge = () => {
    switch (component.status) {
      case "healthy":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Activity className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getStatusColor = () => {
    switch (component.status) {
      case "healthy":
        return "border-green-200";
      case "warning":
        return "border-yellow-200";
      case "error":
        return "border-red-200";
      default:
        return "border-gray-200";
    }
  };

  return (
    <Card className={`${getStatusColor()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{component.name}</CardTitle>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw
                className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {component.uptime !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">Uptime:</span>
              <span className="font-medium">
                {component.uptime.toFixed(1)}%
              </span>
            </div>
          )}
          {component.response_time !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">Response Time:</span>
              <span className="font-medium">{component.response_time}ms</span>
            </div>
          )}
          {component.cpu_usage !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">CPU Usage:</span>
              <span className="font-medium">{component.cpu_usage}%</span>
            </div>
          )}
          {component.memory_usage && (
            <div className="flex justify-between">
              <span className="text-slate-600">Memory:</span>
              <span className="font-medium">{component.memory_usage}</span>
            </div>
          )}
          {component.hit_rate !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">Hit Rate:</span>
              <span className="font-medium">
                {component.hit_rate.toFixed(1)}%
              </span>
            </div>
          )}
          {component.usage_percent !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">Usage:</span>
              <span className="font-medium">{component.usage_percent}%</span>
            </div>
          )}
          {component.connections !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">Connections:</span>
              <span className="font-medium">
                {component.connections}
                {component.max_connections && ` / ${component.max_connections}`}
              </span>
            </div>
          )}
          {component.available_gb !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-600">Available:</span>
              <span className="font-medium">
                {component.available_gb} GB
                {component.total_gb && ` / ${component.total_gb} GB`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};











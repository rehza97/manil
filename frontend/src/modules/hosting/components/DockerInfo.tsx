/**
 * Docker Info Component
 *
 * Displays Docker status and running containers in the VPS
 */

import React, { useState, useEffect } from "react";
import { useExecCommand } from "../hooks";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
} from "lucide-react";

interface DockerContainer {
  container_id: string;
  image: string;
  command: string;
  created: string;
  status: string;
  ports: string;
  names: string;
}

interface DockerInfoProps {
  subscriptionId: string;
}

export const DockerInfo: React.FC<DockerInfoProps> = ({ subscriptionId }) => {
  const [dockerAvailable, setDockerAvailable] = useState<boolean | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execCommand = useExecCommand();

  const checkDocker = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if Docker is available
      const dockerCheck = await execCommand.mutateAsync({
        subscriptionId,
        command: "which docker",
      });

      if (dockerCheck.exit_code !== 0) {
        setDockerAvailable(false);
        setContainers([]);
        setIsLoading(false);
        return;
      }

      setDockerAvailable(true);

      // Get all containers (including stopped)
      const psAllResult = await execCommand.mutateAsync({
        subscriptionId,
        command: "docker ps -a --format '{{.ID}}\t{{.Image}}\t{{.Command}}\t{{.CreatedAt}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}'",
      });

      if (psAllResult.exit_code === 0 && psAllResult.output.trim()) {
        const lines = psAllResult.output.trim().split("\n");
        const allContainers: DockerContainer[] = lines.map((line) => {
          const parts = line.split("\t");
          return {
            container_id: parts[0]?.substring(0, 12) || "",
            image: parts[1] || "",
            command: parts[2] || "",
            created: parts[3] || "",
            status: parts[4] || "",
            ports: parts[5] || "",
            names: parts[6] || "",
          };
        });
        setContainers(allContainers);
      } else {
        setContainers([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to check Docker status");
      setDockerAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDocker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  const getStatusBadge = (status: string) => {
    if (status.toLowerCase().includes("up") || status.toLowerCase().includes("running")) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Running
        </Badge>
      );
    } else if (status.toLowerCase().includes("exited") || status.toLowerCase().includes("stopped")) {
      return (
        <Badge variant="secondary">
          <XCircle className="h-3 w-3 mr-1" />
          Stopped
        </Badge>
      );
    } else if (status.toLowerCase().includes("unhealthy")) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Unhealthy
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Docker Status</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkDocker}
          disabled={isLoading || execCommand.isPending}
        >
          {isLoading || execCommand.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading && dockerAvailable === null ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : dockerAvailable === false ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Docker is not installed or not available in this VPS container.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-600">Docker is available</span>
          </div>

          {containers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No Docker containers found.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Containers ({containers.length})
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Image</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ports</TableHead>
                        <TableHead>Names</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {containers.map((container, index) => (
                        <TableRow key={`${container.container_id}-${index}`}>
                          <TableCell className="font-mono text-xs">
                            {container.container_id}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {container.image}
                          </TableCell>
                          <TableCell>{getStatusBadge(container.status)}</TableCell>
                          <TableCell className="text-xs">
                            {container.ports || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {container.names}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

/**
 * Image Build Logs Viewer Component
 *
 * Displays build logs for Docker images with color-coded log levels.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Copy, Download, AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/shared/components/ui/use-toast";
import type { ImageBuildLog } from "../types";
import { useState, useRef, useEffect } from "react";

interface ImageBuildLogsViewerProps {
  logs: ImageBuildLog[];
  isLoading?: boolean;
  autoScroll?: boolean;
  showTimestamps?: boolean;
}

export function ImageBuildLogsViewer({
  logs,
  isLoading = false,
  autoScroll = true,
  showTimestamps = true,
}: ImageBuildLogsViewerProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedStep, setSelectedStep] = useState<string | undefined>();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Get unique steps for filtering
  const steps = Array.from(new Set(logs.map((log) => log.step).filter(Boolean)));

  // Filter logs by selected step
  const filteredLogs = selectedStep
    ? logs.filter((log) => log.step === selectedStep)
    : logs;

  // Copy logs to clipboard
  const copyLogs = () => {
    const logText = filteredLogs.map((log) => {
      const timestamp = showTimestamps ? `[${new Date(log.timestamp).toLocaleTimeString()}] ` : "";
      const level = `[${log.log_level}] `;
      const step = log.step ? `[${log.step}] ` : "";
      return `${timestamp}${level}${step}${log.message}`;
    }).join("\n");

    navigator.clipboard.writeText(logText);
    toast({
      title: "Logs copiés",
      description: "Les logs de build ont été copiés dans le presse-papiers.",
    });
  };

  // Download logs as file
  const downloadLogs = () => {
    const logText = filteredLogs.map((log) => {
      const timestamp = `[${new Date(log.timestamp).toISOString()}] `;
      const level = `[${log.log_level}] `;
      const step = log.step ? `[${log.step}] ` : "";
      return `${timestamp}${level}${step}${log.message}`;
    }).join("\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `build-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs Downloaded",
      description: "Build logs have been downloaded.",
    });
  };

  // Get icon and color for log level
  const getLogLevelConfig = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return { icon: XCircle, className: "text-red-600", bgClassName: "bg-red-50" };
      case "WARNING":
      case "WARN":
        return { icon: AlertTriangle, className: "text-yellow-600", bgClassName: "bg-yellow-50" };
      case "INFO":
        return { icon: Info, className: "text-blue-600", bgClassName: "bg-blue-50" };
      default:
        return { icon: AlertCircle, className: "text-gray-600", bgClassName: "bg-gray-50" };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Logs de build</CardTitle>
            <CardDescription>
              {filteredLogs.length} entrée{filteredLogs.length !== 1 ? "s" : ""}
              {isLoading && " (en direct)"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {steps.length > 0 && (
              <div className="flex gap-1">
                <Badge
                  variant={!selectedStep ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedStep(undefined)}
                >
                  Toutes
                </Badge>
                {steps.map((step) => (
                  <Badge
                    key={step}
                    variant={selectedStep === step ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedStep(step)}
                  >
                    {step}
                  </Badge>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={copyLogs}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isLoading ? (
              <p>En attente des logs de build…</p>
            ) : (
              <p>Aucun log de build pour le moment.</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full rounded-md border" ref={scrollRef}>
            <div className="p-4 font-mono text-sm space-y-1">
              {filteredLogs.map((log) => {
                const config = getLogLevelConfig(log.log_level);
                const LogIcon = config.icon;

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 p-2 rounded ${config.bgClassName}`}
                  >
                    <LogIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.className}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {showTimestamps && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {log.log_level}
                        </Badge>
                        {log.step && (
                          <Badge variant="secondary" className="text-xs">
                            {log.step}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words">{log.message}</p>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="text-center py-2 text-muted-foreground animate-pulse">
                  <p className="text-sm">Construction…</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

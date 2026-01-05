/**
 * VPS Terminal Component
 *
 * Provides command execution interface for VPS containers with two modes:
 * 1. Simple Exec: Execute single command and view output
 * 2. Interactive Terminal: Stream command execution output in real-time
 */

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle, Terminal, Play, Loader2 } from "lucide-react";
import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/utils/sse";

type VPSTerminalProps = {
  subscriptionId: string;
  containerId?: string;
  apiBase?: string;
};

type ExecResult = {
  exit_code: number;
  output: string;
  command: string;
  executed_at: string;
};

export const VPSTerminal: React.FC<VPSTerminalProps> = ({
  subscriptionId,
  containerId,
  apiBase,
}) => {
  const [mode, setMode] = useState<"simple" | "interactive">("simple");
  const [command, setCommand] = useState("");
  const [simpleOutput, setSimpleOutput] = useState<string>("");
  const [simpleLoading, setSimpleLoading] = useState(false);
  const [simpleError, setSimpleError] = useState<string | null>(null);
  const [interactiveOutput, setInteractiveOutput] = useState<string[]>([]);
  const [interactiveLoading, setInteractiveLoading] = useState(false);
  const [interactiveError, setInteractiveError] = useState<string | null>(null);
  const [interactiveStatus, setInteractiveStatus] = useState<"idle" | "streaming">("idle");
  
  const abortRef = useRef<AbortController | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  const baseUrl = apiBase || (apiClient.defaults.baseURL || "").replace(/\/$/, "");

  // Auto-scroll to bottom of interactive output
  useEffect(() => {
    if (mode === "interactive" && outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [interactiveOutput, mode]);

  const executeSimpleCommand = async () => {
    if (!command.trim()) {
      setSimpleError("Please enter a command");
      return;
    }

    setSimpleLoading(true);
    setSimpleError(null);
    setSimpleOutput("");

    try {
      const response = await apiClient.post<ExecResult>(
        `/hosting/admin/subscriptions/${subscriptionId}/exec`,
        {
          command: command.trim(),
          tty: false,
        }
      );

      setSimpleOutput(response.data.output || "(no output)");
      if (response.data.exit_code !== 0) {
        setSimpleError(`Command exited with code ${response.data.exit_code}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to execute command";
      setSimpleError(errorMsg);
      setSimpleOutput("");
    } finally {
      setSimpleLoading(false);
    }
  };

  const executeInteractiveCommand = async () => {
    if (!command.trim()) {
      setInteractiveError("Please enter a command");
      return;
    }

    // Abort any existing stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setInteractiveLoading(true);
    setInteractiveError(null);
    setInteractiveOutput([]);
    setInteractiveStatus("streaming");

    const streamUrl = `${baseUrl}/hosting/admin/subscriptions/${subscriptionId}/exec/stream?command=${encodeURIComponent(command.trim())}&tty=true`;
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    try {
      // Connect to SSE stream (GET request with query params)
      streamSSE(streamUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: abortRef.current.signal,
        onOpen: () => {
          setInteractiveStatus("streaming");
        },
        onMessage: (msg) => {
          if (msg.event === "error") {
            setInteractiveError(msg.data || "Stream error");
            setInteractiveStatus("idle");
            return;
          }
          if (msg.event === "open" || msg.event === "close") {
            return;
          }
          // Add output line
          setInteractiveOutput((prev) => [...prev, msg.data]);
        },
        onError: (e) => {
          setInteractiveError(e instanceof Error ? e.message : "Failed to stream output");
          setInteractiveStatus("idle");
        },
      }).catch((e) => {
        if (abortRef.current?.signal.aborted) return;
        setInteractiveError(e instanceof Error ? e.message : "Failed to stream output");
        setInteractiveStatus("idle");
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to execute command";
      setInteractiveError(errorMsg);
      setInteractiveStatus("idle");
    } finally {
      setInteractiveLoading(false);
    }
  };

  const stopInteractive = () => {
    abortRef.current?.abort();
    setInteractiveStatus("idle");
    setInteractiveLoading(false);
  };

  const clearOutput = () => {
    if (mode === "simple") {
      setSimpleOutput("");
    } else {
      setInteractiveOutput([]);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Terminal</h3>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "interactive")}>
          <TabsList>
            <TabsTrigger value="simple">Simple Exec</TabsTrigger>
            <TabsTrigger value="interactive">Interactive Terminal</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter command (e.g., ls -la, pwd, whoami)"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    executeSimpleCommand();
                  }
                }}
                disabled={simpleLoading}
                className="flex-1"
              />
              <Button
                onClick={executeSimpleCommand}
                disabled={simpleLoading || !command.trim()}
              >
                {simpleLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={clearOutput} disabled={simpleLoading}>
                Clear
              </Button>
            </div>

            {simpleError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{simpleError}</AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-sm min-h-[200px] max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono">
                {simpleOutput || "(No output yet. Enter a command and click Execute.)"}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="interactive" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter command (e.g., tail -f /var/log/syslog)"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (interactiveStatus === "streaming") {
                      stopInteractive();
                    } else {
                      executeInteractiveCommand();
                    }
                  }
                }}
                disabled={interactiveLoading}
                className="flex-1"
              />
              {interactiveStatus === "streaming" ? (
                <Button onClick={stopInteractive} variant="destructive">
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={executeInteractiveCommand}
                  disabled={interactiveLoading || !command.trim()}
                >
                  {interactiveLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Stream
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={clearOutput} disabled={interactiveLoading}>
                Clear
              </Button>
            </div>

            {interactiveError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{interactiveError}</AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-sm min-h-[200px] max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono">
                {interactiveOutput.length > 0
                  ? interactiveOutput.join("")
                  : "(No output yet. Enter a command and click Stream.)"}
              </pre>
              <div ref={outputEndRef} />
            </div>

            {interactiveStatus === "streaming" && (
              <div className="text-sm text-slate-600 flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Streaming output...
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};


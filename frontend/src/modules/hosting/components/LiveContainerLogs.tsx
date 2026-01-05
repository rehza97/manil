import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Pause, Play, Trash2, AlertCircle } from "lucide-react";
import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/utils/sse";

type LiveContainerLogsProps = {
  /**
   * Full API URL for the SSE endpoint (including /api/v1...).
   * Example: `${apiBase}/hosting/instances/${id}/logs/stream?tail=100`
   */
  streamUrl: string;
  defaultTail?: number;
  maxLines?: number;
};

export const LiveContainerLogs: React.FC<LiveContainerLogsProps> = ({
  streamUrl,
  defaultTail = 100,
  maxLines = 2000,
}) => {
  const [tail, setTail] = useState(defaultTail);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  const url = useMemo(() => {
    const u = new URL(streamUrl);
    u.searchParams.set("tail", String(tail));
    return u.toString();
  }, [streamUrl, tail]);

  const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    // Ensure same base URL behavior as axios
    const base = apiClient.defaults.baseURL;
    if (base && url.startsWith(base)) {
      // no-op; kept for clarity
    }
    return h;
  }, [token, url]);

  const connect = () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setError(null);
    setStatus("connecting");
    setLines([]);

    streamSSE(url, {
      headers,
      signal: abortRef.current.signal,
      onOpen: () => setStatus("connected"),
      onMessage: (msg) => {
        if (paused) return;
        if (msg.event === "error") {
          setStatus("error");
          setError(msg.data || "Stream error");
          return;
        }
        if (msg.event === "open") return;
        setLines((prev) => {
          const next = [...prev, msg.data];
          return next.length > maxLines ? next.slice(next.length - maxLines) : next;
        });
      },
      onError: (e) => {
        if (!abortRef.current?.signal.aborted) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Failed to stream logs");
        }
      },
      onClose: () => {
        // Stream ended normally - update status but don't show error
        if (!abortRef.current?.signal.aborted) {
          setStatus("idle");
        }
      },
    }).catch((e) => {
      if (abortRef.current?.signal.aborted) return;
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to stream logs");
    });
  };

  useEffect(() => {
    if (!streamUrl) return;
    connect();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-600">Tail</div>
          <Input
            className="w-24"
            type="number"
            min={1}
            max={1000}
            value={tail}
            onChange={(e) => setTail(Math.max(1, Math.min(1000, Number(e.target.value) || 100)))}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines([])}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={connect}>
            Reconnect
          </Button>
        </div>

        <div className="ml-auto text-sm text-slate-600">
          Status: {status}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <pre className="bg-slate-900 text-slate-100 p-4 rounded-md overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
        {lines.join("\n")}
      </pre>
    </div>
  );
};




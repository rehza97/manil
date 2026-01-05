import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AlertCircle, Terminal as TerminalIcon, X } from "lucide-react";
import { attachTerminalSocket } from "../services/terminalSocketManager";

interface VPSTerminalProps {
  subscriptionId: string;
  containerId?: string;
  apiBase?: string;
  className?: string;
}

export const VPSTerminal: React.FC<VPSTerminalProps> = ({ subscriptionId, containerId, apiBase, className }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketHandleRef = useRef<ReturnType<typeof attachTerminalSocket> | null>(null);
  const onDataDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    let mounted = true;
    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;

    const initializeTerminal = () => {
      // Create xterm instance
      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#0f172a",
          foreground: "#e2e8f0",
          cursor: "#38bdf8",
        },
        rows: 24,
        cols: 80,
      });

      // Create fit addon
      fitAddon = new FitAddon();

      // Load addon BEFORE opening
      term.loadAddon(fitAddon);

      // Open terminal only when container is visible & measured.
      const el = terminalRef.current;
      if (!el || !term) return;

      // Store refs
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      let opened = false;
      const tryOpen = () => {
        if (!mounted || opened || !terminalRef.current || !term || !fitAddon) return;
        const rect = terminalRef.current.getBoundingClientRect();
        // We allow visibility:hidden (still measurable); but avoid display:none.
        const style = window.getComputedStyle(terminalRef.current);
        if (rect.width > 0 && rect.height > 0 && style.display !== "none") {
          opened = true;
          term.open(terminalRef.current);
          // Fit after next paint to let xterm measure.
          requestAnimationFrame(() => {
            try {
              fitAddon.fit();
            } catch (err) {
              console.warn("Error fitting terminal:", err);
            }
            setIsReady(true);
            connectWebSocket(term);
          });
          return;
        }
        requestAnimationFrame(tryOpen);
      };

      requestAnimationFrame(tryOpen);
    };

    // Initialize terminal
    initializeTerminal();

    // Handle window resize
    const handleResize = () => {
      if (mounted && fitAddonRef.current && terminalRef.current) {
        requestAnimationFrame(() => {
          try {
            const rect = terminalRef.current?.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
              fitAddonRef.current?.fit();
            }
          } catch (err) {
            console.warn("Error resizing terminal:", err);
          }
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);

      socketHandleRef.current?.detach();
      socketHandleRef.current = null;
      onDataDisposableRef.current?.dispose();
      onDataDisposableRef.current = null;

      if (term) {
        try {
          term.dispose();
        } catch (err) {
          console.error("Error disposing terminal:", err);
        }
      }

      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [subscriptionId, apiBase]);

  const connectWebSocket = (term: Terminal) => {
    // Get WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // Use same port as API
    const apiUrl = apiBase || import.meta.env.VITE_API_URL || "http://localhost:8000";
    const apiHost = new URL(apiUrl).hostname;
    const apiPort = new URL(apiUrl).port || (protocol === "wss:" ? "443" : "8000");

    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
    const wsUrl = `${protocol}//${apiHost}:${apiPort}/api/v1/hosting/instances/${subscriptionId}/terminal${tokenParam}`;

    console.log("Connecting to WebSocket:", wsUrl);

    try {
      // Reuse same socket across tab switches/unmounts.
      socketHandleRef.current?.detach();

      socketHandleRef.current = attachTerminalSocket(subscriptionId, wsUrl, {
        onOpen: () => {
          console.log("WebSocket connected");
          setConnected(true);
          setError(null);
          term.writeln("\x1b[1;32m✓ Connected to VPS terminal\x1b[0m");
          term.writeln("\x1b[36mType commands and press Enter to execute\x1b[0m");
          term.writeln("");
          // Trigger an initial prompt from bash.
          socketHandleRef.current?.send(JSON.stringify({ type: "input", data: "\n" }));
        },
        onMessage: (event) => {
          try {
            const message = JSON.parse(event.data as string);
            if (message.type === "output") {
              term.write(message.data);
            } else if (message.type === "error") {
              term.writeln(`\r\n\x1b[1;31m✗ Error: ${message.message}\x1b[0m\r\n`);
              setError(message.message);
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        },
        onError: (event) => {
          console.error("WebSocket error:", event);
          setError("WebSocket connection error");
        },
        onClose: () => {
          setConnected(false);
          term.writeln("\r\n\x1b[1;33m⚠ Connection closed\x1b[0m\r\n");
        },
      });

      // Handle terminal input
      onDataDisposableRef.current?.dispose();
      onDataDisposableRef.current = term.onData((data) => {
        socketHandleRef.current?.send(
          JSON.stringify({
            type: "input",
            data,
          })
        );
      });
    } catch (err) {
      console.error("Error connecting to WebSocket:", err);
      setError("Failed to connect to terminal");
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-5 w-5" />
            <CardTitle>Interactive Terminal</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                Disconnected
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isReady && (
          <div className="flex items-center justify-center h-[500px] bg-slate-900 rounded-md border">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Initializing terminal...</p>
            </div>
          </div>
        )}

        <div
          ref={terminalRef}
          className="rounded-md border"
          style={{
            width: "100%",
            height: "500px",
            minHeight: "500px",
            padding: "10px",
            backgroundColor: "#0f172a",
            overflow: "hidden",
            // Keep in layout so xterm can measure dimensions even while "loading".
            visibility: isReady ? "visible" : "hidden",
          }}
        />
      </CardContent>
    </Card>
  );
};

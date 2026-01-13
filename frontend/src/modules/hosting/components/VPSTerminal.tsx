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
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const focusListenerRef = useRef<(() => void) | null>(null);
  const clickListenerRef = useRef<(() => void) | null>(null);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 10;
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
        disableStdin: false, // Allow user input
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
            // Focus the terminal to enable input
            setTimeout(() => {
              if (term) {
                term.focus();
              }
            }, 100);
            // Only connect if not already connecting or connected
            if (!isConnectingRef.current && (!socketHandleRef.current || socketHandleRef.current.ws.readyState !== WebSocket.OPEN)) {
              connectWebSocket(term);
            }
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
              // Send resize event to backend
              if (socketHandleRef.current && socketHandleRef.current.ws.readyState === WebSocket.OPEN && term) {
                const cols = term.cols;
                const rows = term.rows;
                console.log(`[Terminal] Sending resize event: ${cols}x${rows}`);
                try {
                  socketHandleRef.current.send(JSON.stringify({
                    type: "resize",
                    cols,
                    rows
                  }));
                } catch (e) {
                  console.error("[Terminal] Failed to send resize event:", e);
                }
              }
            }
          } catch (err) {
            console.warn("Error resizing terminal:", err);
          }
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup - ONLY dispose terminal and resources, but keep WebSocket alive for tab switches
    return () => {
      console.log("[Terminal] Component unmounting - keeping WebSocket alive");
      mounted = false;
      window.removeEventListener("resize", handleResize);

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Cleanup focus and click listeners
      if (focusListenerRef.current) {
        focusListenerRef.current();
        focusListenerRef.current = null;
      }
      if (clickListenerRef.current) {
        clickListenerRef.current();
        clickListenerRef.current = null;
      }

      // Detach from socket manager - this decrements ref count but doesn't close the socket immediately
      // The socket manager will keep it alive for 10 minutes in case we remount
      if (socketHandleRef.current) {
        console.log("[Terminal] Detaching from socket on unmount, socket state:", socketHandleRef.current.ws.readyState);
        socketHandleRef.current.detach();
        socketHandleRef.current = null;
      }

      // Dispose the onData handler to prevent memory leaks
      onDataDisposableRef.current?.dispose();
      onDataDisposableRef.current = null;

      // Dispose terminal UI
      if (term) {
        try {
          term.dispose();
        } catch (err) {
          console.error("[Terminal] Error disposing terminal:", err);
        }
      }

      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [subscriptionId, apiBase]);

  const connectWebSocket = (term: Terminal) => {
    console.log("[Terminal] connectWebSocket called, current socket state:", socketHandleRef.current?.ws.readyState);

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("[Terminal] Connection already in progress, skipping...");
      return;
    }

    console.log("[Terminal] Attempting to attach to WebSocket (will reuse if exists)...");
    isConnectingRef.current = true;
    
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
      // Detach old socket handle (doesn't close the socket, just removes this component's listener)
      if (socketHandleRef.current) {
        console.log("[Terminal] Detaching old socket handle");
        socketHandleRef.current.detach();
      }

      // Attach to socket (will reuse existing socket if available)
      console.log("[Terminal] Attaching to terminal socket for subscription:", subscriptionId);
      socketHandleRef.current = attachTerminalSocket(subscriptionId, wsUrl, {
        onOpen: () => {
          console.log("[Terminal WS] WebSocket connected successfully, readyState:", socketHandleRef.current?.ws.readyState);
          isConnectingRef.current = false;
          setConnected(true);
          setError(null);
          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          term.writeln("\x1b[1;32m✓ Connected to VPS terminal\x1b[0m");
          term.writeln("\x1b[36mType commands and press Enter to execute\x1b[0m");
          term.writeln("");

          // Ensure terminal is focused and input is enabled
          setTimeout(() => {
            if (term) {
              term.focus();
              console.log("[Terminal] Terminal focused after connection");
            }
          }, 100);

          // Trigger an initial prompt from bash.
          console.log("[Terminal WS] Sending initial newline to trigger prompt");
          try {
            socketHandleRef.current?.send(JSON.stringify({ type: "input", data: "\n" }));
            console.log("[Terminal WS] Initial newline sent");
          } catch (e) {
            console.error("[Terminal WS] Failed to send initial newline:", e);
          }
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
          console.error("[Terminal WS] WebSocket error:", event);
          isConnectingRef.current = false;
          setConnected(false);
          setError("WebSocket connection error");
        },
        onClose: (event) => {
          console.log("[Terminal WS] WebSocket closed, code:", event.code, "reason:", event.reason);
          isConnectingRef.current = false;
          setConnected(false);
          term.writeln("\r\n\x1b[1;33m⚠ Connection closed\x1b[0m\r\n");

          // Auto-reconnect if not a normal closure and we haven't exceeded max attempts
          if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff, max 30s
            term.writeln(`\x1b[36mReconnecting in ${delay / 1000}s... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})\x1b[0m\r\n`);
            
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (xtermRef.current) {
                connectWebSocket(xtermRef.current);
              }
            }, delay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            term.writeln("\x1b[1;31m✗ Max reconnection attempts reached. Please refresh the page.\x1b[0m\r\n");
            setError("Connection lost. Please refresh the page to reconnect.");
          }
        },
      });

      // Handle terminal input - ensure it's enabled
      onDataDisposableRef.current?.dispose();
      onDataDisposableRef.current = term.onData((data) => {
        console.log("[Terminal Input] User typed:", data.length, "chars, socket state:", socketHandleRef.current?.ws.readyState);
        // Send input to WebSocket if connected and socket is open
        if (socketHandleRef.current && socketHandleRef.current.ws.readyState === WebSocket.OPEN) {
          try {
            const message = JSON.stringify({ type: "input", data });
            console.log("[Terminal Input] Sending to WebSocket:", message.substring(0, 100));
            socketHandleRef.current.send(message);
            console.log("[Terminal Input] Message sent successfully");
          } catch (err) {
            console.error("[Terminal Input] Error sending input:", err);
            // If send fails, try to reconnect
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              setConnected(false);
              reconnectAttemptsRef.current += 1;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
              term.writeln(`\r\n\x1b[33m⚠ Connection lost. Reconnecting in ${delay / 1000}s...\x1b[0m\r\n`);
              reconnectTimeoutRef.current = window.setTimeout(() => {
                if (xtermRef.current) {
                  connectWebSocket(xtermRef.current);
                }
              }, delay);
            }
          }
        } else {
          console.warn("[Terminal Input] Cannot send - socket not ready. State:", socketHandleRef.current?.ws.readyState);
          // Show feedback that connection is not ready
          term.write("\x07"); // Bell sound
          term.writeln("\r\n\x1b[31m✗ Not connected. Click Reconnect to restore connection.\x1b[0m\r\n");
        }
      });
      
      // Focus the terminal to enable typing - do this multiple times to ensure it works
      const focusTerminal = () => {
        if (term) {
          term.focus();
          // Also click on the terminal element to ensure it receives focus
          if (terminalRef.current) {
            terminalRef.current.click();
          }
        }
      };
      setTimeout(focusTerminal, 100);
      setTimeout(focusTerminal, 500);
      setTimeout(focusTerminal, 1000);
      
      // Re-focus on window focus (when user clicks back to tab)
      const handleWindowFocus = () => {
        if (term && connected) {
          term.focus();
        }
      };
      window.addEventListener("focus", handleWindowFocus);
      
      // Store cleanup function to remove focus listener
      focusListenerRef.current = () => {
        window.removeEventListener("focus", handleWindowFocus);
      };
      
      // Also add click handler to terminal container to ensure focus
      const handleTerminalClick = () => {
        if (term) {
          term.focus();
        }
      };
      if (terminalRef.current) {
        terminalRef.current.addEventListener("click", handleTerminalClick);
      }
      
      // Store cleanup for click listener
      clickListenerRef.current = () => {
        if (terminalRef.current) {
          terminalRef.current.removeEventListener("click", handleTerminalClick);
        }
      };
    } catch (err) {
      console.error("[Terminal] Error connecting to WebSocket:", err);
      isConnectingRef.current = false;
      setConnected(false);
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  Disconnected
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log("[Terminal] Manual reconnect triggered");
                    if (xtermRef.current) {
                      // Clear all existing state
                      if (reconnectTimeoutRef.current) {
                        window.clearTimeout(reconnectTimeoutRef.current);
                        reconnectTimeoutRef.current = null;
                      }

                      // Reset connecting flag to allow new connection
                      isConnectingRef.current = false;

                      // Detach and force close old socket
                      if (socketHandleRef.current) {
                        try {
                          console.log("[Terminal] Closing old socket, state:", socketHandleRef.current.ws.readyState);
                          socketHandleRef.current.ws.close();
                        } catch (e) {
                          console.warn("[Terminal] Error closing old socket:", e);
                        }
                        socketHandleRef.current.detach();
                        socketHandleRef.current = null;
                      }

                      // Clear terminal
                      xtermRef.current.clear();

                      // Reset reconnect attempts
                      reconnectAttemptsRef.current = 0;
                      setConnected(false);
                      setError(null);

                      // Create fresh connection
                      console.log("[Terminal] Calling connectWebSocket for manual reconnect");
                      connectWebSocket(xtermRef.current);
                    }
                  }}
                >
                  Reconnect
                </Button>
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
          className="rounded-md border cursor-text"
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
          onClick={() => {
            // Ensure terminal gets focus when clicking on container
            if (xtermRef.current) {
              xtermRef.current.focus();
            }
          }}
          tabIndex={-1}
        />
      </CardContent>
    </Card>
  );
};

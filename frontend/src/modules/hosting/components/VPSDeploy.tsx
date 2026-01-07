/**
 * VPS Deploy Component
 *
 * Provides file upload and deployment interface for VPS containers with live terminal logs.
 * 1. Direct Deploy: Extract archive and copy files to container's /data directory
 * 2. Build & Deploy: Upload project and trigger Docker image build workflow
 */

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Label } from "@/shared/components/ui/label";
import { AlertCircle, Upload, Loader2, CheckCircle2, FileArchive, Terminal, X, Info } from "lucide-react";
import { apiClient } from "@/shared/api/client";
import { streamSSE } from "@/shared/utils/sse";
import { vpsService } from "../services/vpsService";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

type VPSDeployProps = {
  subscriptionId: string;
};

type ServiceRoute = {
  service: string;
  port: number;
  url: string;
  internal_port?: number | null;
};

type DeployResult = {
  success: boolean;
  target_path?: string;
  files_deployed?: number;
  archive_size?: number;
  deployed_at?: string;
  error?: string;
  logs?: string[];
  service_routes?: ServiceRoute[];
};

type BuildResult = {
  subscription_id: string;
  image_id: string;
  image_name: string;
  image_tag: string;
  status: string;
  build_triggered_at: string;
  message: string;
};

export const VPSDeploy: React.FC<VPSDeployProps> = ({ subscriptionId }) => {
  const [mode, setMode] = useState<"direct" | "build" | "docker">("direct");
  const [file, setFile] = useState<File | null>(null);
  const [targetPath, setTargetPath] = useState("/data");
  const [imageName, setImageName] = useState("");
  const [imageTag, setImageTag] = useState("latest");
  const [dockerfilePath, setDockerfilePath] = useState("Dockerfile");
  const [composeFile, setComposeFile] = useState("docker-compose.yml");
  const [composeCommand, setComposeCommand] = useState("up -d");
  const [composeWorkingDir, setComposeWorkingDir] = useState("/data");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeployResult | BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // xterm.js terminal refs for each tab
  const directDeployTerminalRef = useRef<HTMLDivElement>(null);
  const buildDeployTerminalRef = useRef<HTMLDivElement>(null);
  const dockerSetupTerminalRef = useRef<HTMLDivElement>(null);
  const directDeployXtermRef = useRef<XTerm | null>(null);
  const buildDeployXtermRef = useRef<XTerm | null>(null);
  const dockerSetupXtermRef = useRef<XTerm | null>(null);
  const directDeployFitRef = useRef<FitAddon | null>(null);
  const buildDeployFitRef = useRef<FitAddon | null>(null);
  const dockerSetupFitRef = useRef<FitAddon | null>(null);
  const directOpenedRef = useRef(false);
  const buildOpenedRef = useRef(false);
  const dockerOpenedRef = useRef(false);
  const prevModeRef = useRef<"direct" | "build" | "docker">(mode);

  const disposeTerminal = (
    xtermRef: React.MutableRefObject<XTerm | null>,
    fitRef: React.MutableRefObject<FitAddon | null>,
    openedRef: React.MutableRefObject<boolean>
  ) => {
    try {
      xtermRef.current?.dispose();
    } catch {
      // ignore
    }
    xtermRef.current = null;
    fitRef.current = null;
    openedRef.current = false;
  };

  const initTerminalIfVisible = (
    containerRef: React.RefObject<HTMLDivElement>,
    xtermRef: React.MutableRefObject<XTerm | null>,
    fitRef: React.MutableRefObject<FitAddon | null>,
    openedRef: React.MutableRefObject<boolean>
  ) => {
    if (!xtermRef.current) {
      const term = new XTerm({
        cursorBlink: false,
        disableStdin: true, // Read-only terminal for logs
        convertEol: true, // Convert line feeds to carriage return + line feed
        theme: {
          background: "#0f172a", // slate-900
          foreground: "#ffffff",
          cursor: "#ffffff",
          selection: "#264f78",
          black: "#000000",
          red: "#cd3131",
          green: "#0dbc79",
          yellow: "#e5e510",
          blue: "#2472c8",
          magenta: "#bc3fbc",
          cyan: "#11a8cd",
          white: "#e5e5e5",
          brightBlack: "#666666",
          brightRed: "#f14c4c",
          brightGreen: "#23d18b",
          brightYellow: "#f5f543",
          brightBlue: "#3b8eea",
          brightMagenta: "#d670d6",
          brightCyan: "#29b8db",
          brightWhite: "#e5e5e5",
        },
        fontSize: 13,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        lineHeight: 1.2,
        letterSpacing: 0,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      xtermRef.current = term;
      fitRef.current = fitAddon;
    }

    const tryOpen = () => {
      if (openedRef.current) return;
      const el = containerRef.current;
      const term = xtermRef.current;
      const fit = fitRef.current;
      if (!el || !term || !fit) return;

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display !== "none" && rect.width > 0 && rect.height > 0) {
        openedRef.current = true;
        term.open(el);
        requestAnimationFrame(() => {
          try {
            fit.fit();
          } catch (err) {
            console.warn("Error fitting deploy terminal:", err);
          }
        });
        return;
      }
      requestAnimationFrame(tryOpen);
    };

    requestAnimationFrame(tryOpen);
  };

  // Initialize ONLY the active mode terminal (avoid opening xterm in hidden TabsContent)
  useEffect(() => {
    // Dispose the previous mode's terminal to avoid xterm running while hidden (can crash)
    const prevMode = prevModeRef.current;
    if (prevMode !== mode) {
      if (prevMode === "direct") disposeTerminal(directDeployXtermRef, directDeployFitRef, directOpenedRef);
      if (prevMode === "build") disposeTerminal(buildDeployXtermRef, buildDeployFitRef, buildOpenedRef);
      if (prevMode === "docker") disposeTerminal(dockerSetupXtermRef, dockerSetupFitRef, dockerOpenedRef);
      prevModeRef.current = mode;
    }

    if (mode === "direct") initTerminalIfVisible(directDeployTerminalRef, directDeployXtermRef, directDeployFitRef, directOpenedRef);
    if (mode === "build") initTerminalIfVisible(buildDeployTerminalRef, buildDeployXtermRef, buildDeployFitRef, buildOpenedRef);
    if (mode === "docker") initTerminalIfVisible(dockerSetupTerminalRef, dockerSetupXtermRef, dockerSetupFitRef, dockerOpenedRef);
  }, [mode]);

  // Cleanup terminals on unmount
  useEffect(() => {
    const handleResize = () => {
      if (mode === "direct") directDeployFitRef.current?.fit();
      if (mode === "build") buildDeployFitRef.current?.fit();
      if (mode === "docker") dockerSetupFitRef.current?.fit();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      disposeTerminal(directDeployXtermRef, directDeployFitRef, directOpenedRef);
      disposeTerminal(buildDeployXtermRef, buildDeployFitRef, buildOpenedRef);
      disposeTerminal(dockerSetupXtermRef, dockerSetupFitRef, dockerOpenedRef);
    };
  }, [mode]);

  // Fit active terminal shortly after mode changes (once visible)
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (mode === "direct") directDeployFitRef.current?.fit();
      if (mode === "build") buildDeployFitRef.current?.fit();
      if (mode === "docker") dockerSetupFitRef.current?.fit();
    }, 100);
    return () => window.clearTimeout(t);
  }, [mode]);

  // Helper function to write to terminal based on mode
  const writeToTerminal = (text: string, isError: boolean = false) => {
    let term: XTerm | null = null;
    
    if (mode === "direct") {
      term = directDeployXtermRef.current;
    } else if (mode === "build") {
      term = buildDeployXtermRef.current;
    } else if (mode === "docker") {
      term = dockerSetupXtermRef.current;
    }
    
    if (term) {
      // Parse ANSI-like colors from emoji/log prefixes
      if (isError || text.includes("❌") || text.includes("Error")) {
        term.writeln(`\x1b[31m${text}\x1b[0m`);
      } else if (text.includes("✅") || text.includes("Success")) {
        term.writeln(`\x1b[32m${text}\x1b[0m`);
      } else if (text.includes("⚠️") || text.includes("Warning")) {
        term.writeln(`\x1b[33m${text}\x1b[0m`);
      } else if (text.includes("🚀") || text.includes("Starting") || text.includes("🔌")) {
        term.writeln(`\x1b[36m${text}\x1b[0m`);
      } else {
        term.writeln(text);
      }
    }
    
    // Also keep in state for compatibility
    setLogs((prev) => [...prev, text]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedExtensions = ['.zip', '.tar', '.gz', '.tar.gz'];
      const fileName = selectedFile.name.toLowerCase();
      const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValid) {
        setError(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
        setFile(null);
        return;
      }
      
      // Check file size (500 MB limit)
      const maxSize = 500 * 1024 * 1024; // 500 MB
      if (selectedFile.size > maxSize) {
        setError("File too large. Maximum size: 500 MB");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setLogs([]);
    }
  };

  const handleDirectDeploy = async () => {
    if (!file) {
      setError("Please select a file to deploy");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setIsStreaming(true);
    
    // Clear terminal
    if (directDeployXtermRef.current) {
      directDeployXtermRef.current.clear();
    }

    // Abort any existing stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_path", targetPath);

      const baseUrl = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
      const streamUrl = `${baseUrl}/hosting/instances/${subscriptionId}/deploy/files/stream`;
      const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

      // Use fetch for multipart/form-data POST with streaming response
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response has no body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        let idx = buffer.indexOf("\n\n");
        while (idx !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          if (frame.startsWith(":")) {
            idx = buffer.indexOf("\n\n");
            continue;
          }

          let event = "message";
          const dataLines: string[] = [];

          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) {
              event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).replace(/^ /, ""));
            }
          }

          const data = dataLines.join("\n");

          if (event === "open") {
            writeToTerminal("🔌 Connected to deployment server...");
          } else if (event === "error" || event === "deploy_error") {
            try {
              const errorData = JSON.parse(data);
              const errorMsg = errorData.error || "Deployment failed";
              setError(errorMsg);
              writeToTerminal(`❌ Error: ${errorMsg}`, true);
            } catch {
              writeToTerminal(`❌ Error: ${data}`, true);
            }
            setIsStreaming(false);
            setLoading(false);
            return;
          } else if (event === "success") {
            try {
              const successData = JSON.parse(data);
              setResult({
                success: true,
                target_path: successData.target_path,
                files_deployed: successData.files_deployed,
                service_routes: successData.service_routes || [],
              });
            } catch {
              setResult({ success: true });
            }
          } else if (event === "close") {
            setIsStreaming(false);
            setLoading(false);
            return;
          } else if (data) {
            // Write directly to terminal for real-time display
            if (directDeployXtermRef.current) {
              directDeployXtermRef.current.write(data);
            }
            // Also keep in state
            setLogs((prev) => [...prev, data]);
          }

          idx = buffer.indexOf("\n\n");
        }
      }

      setIsStreaming(false);
      setLoading(false);
    } catch (err: any) {
      if (err.name === "AbortError") {
        writeToTerminal("⚠️ Deployment cancelled");
      } else {
        const errorMsg = err.message || "Failed to deploy files";
        setError(errorMsg);
        writeToTerminal(`❌ ${errorMsg}`, true);
      }
      setIsStreaming(false);
      setLoading(false);
    }
  };

  const handleBuildDeploy = async () => {
    if (!file) {
      setError("Please select a file to deploy");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    
    // Clear terminal
    if (buildDeployXtermRef.current) {
      buildDeployXtermRef.current.clear();
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (imageName) formData.append("image_name", imageName);
      formData.append("image_tag", imageTag);
      formData.append("dockerfile_path", dockerfilePath);

      const response = await apiClient.post(
        `/hosting/admin/subscriptions/${subscriptionId}/deploy/build`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data as BuildResult);
      const buildLogs = [`✅ Build process started!`, `Image: ${response.data.image_name}:${response.data.image_tag}`];
      buildLogs.forEach(log => writeToTerminal(log));
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "Failed to trigger build";
      setError(errorMsg);
      setLogs([`❌ ${errorMsg}`]);
    } finally {
      setLoading(false);
    }
  };

  const stopDeployment = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setLoading(false);
  };

  const resetForm = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setLogs([]);
    setIsStreaming(false);
    abortControllerRef.current?.abort();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearLogs = () => {
    setLogs([]);
    
    // Clear the appropriate terminal
    if (mode === "direct" && directDeployXtermRef.current) {
      directDeployXtermRef.current.clear();
    } else if (mode === "build" && buildDeployXtermRef.current) {
      buildDeployXtermRef.current.clear();
    } else if (mode === "docker" && dockerSetupXtermRef.current) {
      dockerSetupXtermRef.current.clear();
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Deploy Files</h3>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "direct" | "build" | "docker")}>
          <TabsList>
            <TabsTrigger value="direct">Direct Deploy</TabsTrigger>
            <TabsTrigger value="build">Build & Deploy</TabsTrigger>
            <TabsTrigger value="docker">Docker Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-direct">Project Archive</Label>
                <div className="mt-2">
                  <Input
                    id="file-direct"
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.tar,.tar.gz,.gz"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Upload zip, tar, or tar.gz archive. Files will be extracted to the target directory.
                  </p>
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <FileArchive className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="target-path">Target Directory</Label>
                <Input
                  id="target-path"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="/data"
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Directory in container where files will be deployed (default: /data)
                </p>
              </div>

              {/* Deployment Best Practices & Auto-Fix Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold">Automatic Fixes & Best Practices</div>
                    <div className="text-sm space-y-1.5">
                      <div>
                        <strong>Auto-fix behavior:</strong> CloudManager automatically fixes common deployment issues:
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
                          <li>Sets executable permissions on <code className="text-xs bg-slate-100 px-1 rounded">entrypoint.sh</code> and <code className="text-xs bg-slate-100 px-1 rounded">*.sh</code> scripts before running docker compose</li>
                          <li>If deployment fails with permission errors, automatically retries with a patched compose file that removes problematic bind mounts</li>
                        </ul>
                      </div>
                      <div className="mt-2">
                        <strong>Best practices for production deploys:</strong>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
                          <li>Avoid bind mounts like <code className="text-xs bg-slate-100 px-1 rounded">./backend:/app</code> in production (these are for development only)</li>
                          <li>Ensure <code className="text-xs bg-slate-100 px-1 rounded">entrypoint.sh</code> is executable in your repository (<code className="text-xs bg-slate-100 px-1 rounded">chmod +x entrypoint.sh</code>)</li>
                          <li>Include a proper shebang in entrypoint scripts (<code className="text-xs bg-slate-100 px-1 rounded">#!/bin/sh</code> or <code className="text-xs bg-slate-100 px-1 rounded">#!/bin/bash</code>)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                {isStreaming ? (
                  <Button onClick={stopDeployment} variant="destructive">
                    <X className="h-4 w-4 mr-2" />
                    Stop Deployment
                  </Button>
                ) : (
                  <Button
                    onClick={handleDirectDeploy}
                    disabled={loading || !file}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Deploy Files
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Reset
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && 'success' in result && result.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>Files deployed successfully!</div>
                    {result.files_deployed !== undefined && (
                      <div className="text-sm">
                        {result.files_deployed} files deployed to {result.target_path}
                      </div>
                    )}
                    {result.service_routes && result.service_routes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="font-semibold text-sm mb-2">🌐 Service Routes:</div>
                        <div className="space-y-1.5">
                          {result.service_routes.map((route, idx) => (
                            <div key={idx} className="text-sm flex items-center gap-2">
                              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                {route.service}
                              </span>
                              <span className="text-slate-500">→</span>
                              <a
                                href={route.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs"
                              >
                                {route.url}
                              </a>
                              <span className="text-slate-400 text-xs">(port {route.port})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Terminal Logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <Label>Deployment Logs</Label>
                  {logs.length > 0 && (
                    <span className="text-xs text-slate-500">({logs.length} lines)</span>
                  )}
                </div>
                {logs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearLogs}>
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="bg-slate-900 rounded-md overflow-hidden" style={{ minHeight: "400px" }}>
                <div 
                  ref={directDeployTerminalRef} 
                  className="w-full h-full xterm-container" 
                  style={{ 
                    minHeight: "400px", 
                    padding: "10px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="build" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-build">Project Archive with Dockerfile</Label>
                <div className="mt-2">
                  <Input
                    id="file-build"
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.tar,.tar.gz,.gz"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Upload archive containing Dockerfile. Image will be built automatically.
                  </p>
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <FileArchive className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-slate-400">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="image-name">Image Name (Optional)</Label>
                <Input
                  id="image-name"
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  placeholder="custom-app"
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Custom name for the Docker image (auto-generated if not provided)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="image-tag">Image Tag</Label>
                  <Input
                    id="image-tag"
                    value={imageTag}
                    onChange={(e) => setImageTag(e.target.value)}
                    placeholder="latest"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="dockerfile-path">Dockerfile Path</Label>
                  <Input
                    id="dockerfile-path"
                    value={dockerfilePath}
                    onChange={(e) => setDockerfilePath(e.target.value)}
                    placeholder="Dockerfile"
                    disabled={loading}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleBuildDeploy}
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Build...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Build & Deploy
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Reset
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && 'image_id' in result && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div>Build process started!</div>
                    <div className="text-sm">
                      Image: {result.image_name}:{result.image_tag}
                    </div>
                    <div className="text-sm text-slate-500">
                      Image ID: {result.image_id}
                    </div>
                    <div className="text-sm text-slate-500">
                      Status: {result.status}
                    </div>
                    <div className="text-sm text-slate-500 mt-2">
                      {result.message}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Build Logs Terminal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <Label>Build Logs</Label>
                  {logs.length > 0 && (
                    <span className="text-xs text-slate-500">({logs.length} lines)</span>
                  )}
                </div>
                {logs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearLogs}>
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="bg-slate-900 rounded-md overflow-hidden" style={{ minHeight: "300px" }}>
                <div ref={buildDeployTerminalRef} className="w-full h-full" style={{ minHeight: "300px", padding: "10px" }} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docker" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Docker Installation</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Install Docker and docker-compose in your VPS container. This is required before running docker-compose commands.
                </p>
                <Button
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    setLogs([]);
                    
                    // Clear terminal
                    if (dockerSetupXtermRef.current) {
                      dockerSetupXtermRef.current.clear();
                    }
                    
                    try {
                      const result = await vpsService.installDocker(subscriptionId);
                      if (result.success) {
                        writeToTerminal(`✅ Docker installed successfully!`);
                        writeToTerminal(`Docker version: ${result.docker_version || "unknown"}`);
                        writeToTerminal(`Docker Compose version: ${result.compose_version || "unknown"}`);
                        if (result.logs) {
                          result.logs.forEach((log: string) => writeToTerminal(log));
                        }
                      } else {
                        setError("Failed to install Docker");
                        if (result.logs) {
                          result.logs.forEach((log: string) => writeToTerminal(log, true));
                        }
                      }
                    } catch (err: any) {
                      const errorMsg = err.response?.data?.detail || err.message || "Failed to install Docker";
                      setError(errorMsg);
                      writeToTerminal(`❌ ${errorMsg}`, true);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Installing Docker...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Install Docker
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Docker Compose</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Run docker-compose commands in your VPS container. Make sure Docker is installed first.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="compose-file">Docker Compose File</Label>
                    <Input
                      id="compose-file"
                      value={composeFile}
                      onChange={(e) => setComposeFile(e.target.value)}
                      placeholder="docker-compose.yml"
                      disabled={loading}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="compose-command">Command</Label>
                    <Input
                      id="compose-command"
                      value={composeCommand}
                      onChange={(e) => setComposeCommand(e.target.value)}
                      placeholder="up -d"
                      disabled={loading}
                      className="mt-2"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Common commands: "up -d" (start), "down" (stop), "ps" (list), "logs" (show logs), "restart"
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="compose-working-dir">Working Directory</Label>
                    <Input
                      id="compose-working-dir"
                      value={composeWorkingDir}
                      onChange={(e) => setComposeWorkingDir(e.target.value)}
                      placeholder="/data"
                      disabled={loading}
                      className="mt-2"
                    />
                  </div>

                  <Button
                    onClick={async () => {
                      setLoading(true);
                      setError(null);
                      setLogs([]);
                      setIsStreaming(true);
                      
                      // Clear terminal
                      if (dockerSetupXtermRef.current) {
                        dockerSetupXtermRef.current.clear();
                      }

                      // Abort any existing stream
                      abortControllerRef.current?.abort();
                      abortControllerRef.current = new AbortController();

                      try {
                        const formData = new FormData();
                        formData.append("compose_file", composeFile);
                        formData.append("command", composeCommand);
                        formData.append("working_dir", composeWorkingDir);

                        const baseUrl = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
                        const streamUrl = `${baseUrl}/hosting/instances/${subscriptionId}/docker/compose/stream`;
                        const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

                        const response = await fetch(streamUrl, {
                          method: "POST",
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                          signal: abortControllerRef.current.signal,
                        });

                        if (!response.ok) {
                          throw new Error(`Docker compose failed: ${response.status} ${response.statusText}`);
                        }

                        if (!response.body) {
                          throw new Error("Response has no body");
                        }

                        const reader = response.body.getReader();
                        const decoder = new TextDecoder("utf-8");
                        let buffer = "";

                        while (true) {
                          const { value, done } = await reader.read();
                          if (done) break;

                          buffer += decoder.decode(value, { stream: true });
                          buffer = buffer.replace(/\r\n/g, "\n");

                          // Process complete SSE frames (separated by \n\n)
                          let frameEnd = buffer.indexOf("\n\n");
                          while (frameEnd !== -1) {
                            const frame = buffer.slice(0, frameEnd);
                            buffer = buffer.slice(frameEnd + 2);

                            // Skip comments
                            if (frame.startsWith(":")) {
                              frameEnd = buffer.indexOf("\n\n");
                              continue;
                            }

                            let event = "message";
                            const dataLines: string[] = [];

                            // Parse SSE frame
                            for (const line of frame.split("\n")) {
                              if (line.startsWith("event:")) {
                                event = line.slice(6).trim();
                              } else if (line.startsWith("data:")) {
                                const dataContent = line.slice(5).replace(/^ /, "");
                                dataLines.push(dataContent);
                              }
                            }

                            const data = dataLines.join("\n");

                            // Handle different event types
                            if (event === "open") {
                              writeToTerminal("🔌 Connected...");
                            } else if (event === "error" || event === "deploy_error") {
                              try {
                                const errorData = JSON.parse(data);
                                const errorMsg = errorData.error || errorData.message || data;
                                setError(errorMsg);
                                writeToTerminal(`❌ ${errorMsg}`, true);
                              } catch {
                                writeToTerminal(`❌ ${data}`, true);
                              }
                              setIsStreaming(false);
                              setLoading(false);
                              return;
                            } else if (event === "success") {
                              try {
                                const successData = JSON.parse(data);
                                writeToTerminal(`✅ ${successData.message || "Command completed"}`);
                              } catch {
                                writeToTerminal(`✅ Command completed`);
                              }
                            } else if (event === "close") {
                              setIsStreaming(false);
                              setLoading(false);
                              return;
                            } else if (data) {
                              // Write directly to terminal for real-time display
                              if (dockerSetupXtermRef.current) {
                                dockerSetupXtermRef.current.write(data);
                              }
                              // Also keep in state
                              const lines = data.split("\n").filter(line => line.trim().length > 0);
                              if (lines.length > 0) {
                                lines.forEach((line) => {
                                  setLogs((prev) => [...prev, line]);
                                });
                              }
                            }

                            frameEnd = buffer.indexOf("\n\n");
                          }
                          
                          // Also check for incomplete frames with just \n (might be a line without \n\n yet)
                          // This helps process lines faster without waiting for complete SSE frames
                          if (buffer.length > 0 && !buffer.includes("\n\n")) {
                            // If we have data but no complete frame, check if it ends with \n
                            // This means we might have a complete line waiting
                            const lastNewline = buffer.lastIndexOf("\n");
                            if (lastNewline > 0 && lastNewline < buffer.length - 1) {
                              // We have a complete line, process it
                              const line = buffer.slice(0, lastNewline);
                              buffer = buffer.slice(lastNewline + 1);
                              if (line.trim()) {
                                setLogs((prev) => [...prev, line]);
                              }
                            }
                          }
                        }
                        
                        // Process any remaining buffer content
                        if (buffer.trim()) {
                          if (dockerSetupXtermRef.current) {
                            dockerSetupXtermRef.current.write(buffer);
                          }
                          const remainingLines = buffer.split("\n").filter(line => line.trim().length > 0);
                          if (remainingLines.length > 0) {
                            setLogs((prev) => [...prev, ...remainingLines]);
                          }
                        }
                      } catch (err: any) {
                        if (err.name === "AbortError") {
                          writeToTerminal("⏹️ Stream cancelled");
                        } else {
                          const errorMsg = err.message || "Failed to run docker-compose";
                          setError(errorMsg);
                          writeToTerminal(`❌ ${errorMsg}`, true);
                        }
                        setIsStreaming(false);
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Terminal className="h-4 w-4 mr-2" />
                        Run Docker Compose
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Docker Logs Terminal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <Label>Docker Logs</Label>
                  {logs.length > 0 && (
                    <span className="text-xs text-slate-500">({logs.length} lines)</span>
                  )}
                </div>
                {logs.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearLogs}>
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="bg-slate-900 rounded-md overflow-hidden" style={{ minHeight: "400px" }}>
                <div ref={dockerSetupTerminalRef} className="w-full h-full" style={{ minHeight: "400px", padding: "10px" }} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

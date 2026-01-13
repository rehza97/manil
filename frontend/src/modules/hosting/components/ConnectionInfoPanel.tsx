/**
 * Connection Info Panel Component
 *
 * Displays SSH connection details with copy functionality.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Clipboard, ChevronDown, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import type { ContainerInstance } from "../types";
import { useState, useEffect } from "react";
import { useToast } from "@/shared/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { vpsService } from "../services";

interface ConnectionInfoPanelProps {
  container: ContainerInstance;
  subscriptionId: string;
}

export function ConnectionInfoPanel({
  container,
  subscriptionId,
}: ConnectionInfoPanelProps) {
  const { toast } = useToast();
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch credentials including password
  const { data: credentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ["vps", "credentials", subscriptionId],
    queryFn: () => vpsService.getContainerCredentials(subscriptionId),
    enabled: !!subscriptionId && !!container,
  });

  const sshCommand = `ssh root@${container.ip_address} -p ${container.ssh_port}`;
  const sshLocalhostCommand = `ssh root@localhost -p ${container.ssh_port}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection Information</CardTitle>
        <CardDescription>SSH access details for your VPS</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* IP Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium">IP Address</label>
          <div className="flex gap-2">
            <Input
              value={container.ip_address}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(container.ip_address, "IP address")}
              aria-label="Copy IP address"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SSH Port */}
        <div className="space-y-2">
          <label className="text-sm font-medium">SSH Port</label>
          <div className="flex gap-2">
            <Input
              value={container.ssh_port.toString()}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                copyToClipboard(container.ssh_port.toString(), "SSH port")
              }
              aria-label="Copy SSH port"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SSH Command (IP) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">SSH Command (IP)</label>
          <div className="flex gap-2">
            <Input value={sshCommand} readOnly className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(sshCommand, "SSH command")}
              aria-label="Copy SSH command"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SSH Command (Localhost) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">SSH Command (Localhost)</label>
          <div className="flex gap-2">
            <Input value={sshLocalhostCommand} readOnly className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(sshLocalhostCommand, "SSH localhost command")}
              aria-label="Copy SSH localhost command"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Root Password */}
        {container.ssh_public_key ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">SSH Key Authentication</label>
            <p className="text-sm text-muted-foreground">
              This container uses SSH key authentication. Your public key has been configured.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Root Password</label>
            {credentialsLoading ? (
              <div className="flex items-center justify-center p-3 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading password...</span>
              </div>
            ) : credentials?.root_password ? (
              <div className="flex gap-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={credentials.root_password}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(credentials.root_password, "Root password")}
                  aria-label="Copy root password"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Unable to load password. Please check your email for the initial password.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Change this password after first login for security.
            </p>
          </div>
        )}

        {/* Security Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            Keep your SSH credentials secure. Never share your root password or
            private key. Change the default password after first login.
          </AlertDescription>
        </Alert>

        {/* SSH Instructions */}
        <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>SSH Connection Instructions</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isInstructionsOpen ? "transform rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="text-sm space-y-2 bg-muted p-4 rounded-md">
              <p className="font-medium">To connect via SSH:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open your terminal or SSH client</li>
                <li>
                  From the host machine (localhost): <code className="bg-background px-1 rounded">{sshLocalhostCommand}</code>
                </li>
                <li>
                  From external network (IP): <code className="bg-background px-1 rounded">{sshCommand}</code>
                </li>
                <li>Enter your root password when prompted</li>
                <li>
                  For key-based authentication, ensure your public key is added
                  to the container
                </li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}


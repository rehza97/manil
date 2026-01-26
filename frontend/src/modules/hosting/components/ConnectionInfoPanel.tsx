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
        title: "Copié",
        description: `${label} copié dans le presse-papiers`,
      });
    } catch (err) {
      toast({
        title: "Échec de la copie",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de connexion</CardTitle>
        <CardDescription>Accès SSH à votre VPS</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* IP Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Adresse IP</label>
          <div className="flex gap-2">
            <Input
              value={container.ip_address}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(container.ip_address, "Adresse IP")}
              aria-label="Copier l'adresse IP"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SSH Port */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Port SSH</label>
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
                copyToClipboard(container.ssh_port.toString(), "Port SSH")
              }
              aria-label="Copier le port SSH"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SSH Command (IP) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Commande SSH (IP)</label>
          <div className="flex gap-2">
            <Input value={sshCommand} readOnly className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(sshCommand, "Commande SSH")}
              aria-label="Copier la commande SSH"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SSH Command (Localhost) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Commande SSH (localhost)</label>
          <div className="flex gap-2">
            <Input value={sshLocalhostCommand} readOnly className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(sshLocalhostCommand, "Commande SSH localhost")}
              aria-label="Copier la commande SSH localhost"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Root Password */}
        {container.ssh_public_key ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Authentification par clé SSH</label>
            <p className="text-sm text-muted-foreground">
              Ce conteneur utilise l'authentification par clé SSH. Votre clé publique est configurée.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Mot de passe root</label>
            {credentialsLoading ? (
              <div className="flex items-center justify-center p-3 bg-muted rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Chargement du mot de passe…</span>
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
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
                  onClick={() => copyToClipboard(credentials.root_password, "Mot de passe root")}
                  aria-label="Copier le mot de passe root"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Impossible de charger le mot de passe. Consultez votre e-mail pour le mot de passe initial.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Changez ce mot de passe après la première connexion pour des raisons de sécurité.
            </p>
          </div>
        )}

        {/* Security Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Avis de sécurité</AlertTitle>
          <AlertDescription>
            Gardez vos identifiants SSH confidentiels. Ne partagez jamais votre mot de passe root ni votre clé privée. Changez le mot de passe par défaut après la première connexion.
          </AlertDescription>
        </Alert>

        {/* SSH Instructions */}
        <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Instructions de connexion SSH</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isInstructionsOpen ? "transform rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="text-sm space-y-2 bg-muted p-4 rounded-md">
              <p className="font-medium">Pour vous connecter en SSH :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ouvrez votre terminal ou client SSH</li>
                <li>
                  Depuis la machine hôte (localhost) : <code className="bg-background px-1 rounded">{sshLocalhostCommand}</code>
                </li>
                <li>
                  Depuis le réseau externe (IP) : <code className="bg-background px-1 rounded">{sshCommand}</code>
                </li>
                <li>Saisissez votre mot de passe root à l'invite</li>
                <li>
                  Pour l'authentification par clé, assurez-vous que votre clé publique est ajoutée au conteneur
                </li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}


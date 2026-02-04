/**
 * CoreDNS Status Indicator Component
 *
 * Displays CoreDNS server health status and version.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Server } from "lucide-react";
import type { CoreDNSStatus } from "../types";
import { formatDistanceToNow } from "date-fns";

interface CoreDNSStatusIndicatorProps {
  status?: CoreDNSStatus;
  isLoading?: boolean;
}

export function CoreDNSStatusIndicator({
  status,
  isLoading,
}: CoreDNSStatusIndicatorProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            État CoreDNS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Vérification du serveur…
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            CoreDNS Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <span className="font-medium text-destructive">
              Unable to connect to CoreDNS
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = status.is_running && status.is_healthy;

  return (
    <Card className={isHealthy ? "border-green-200" : "border-red-200"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            État CoreDNS
          </CardTitle>
          <Badge
            className={
              isHealthy
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Opérationnel
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" />
                Défaillant
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Version</p>
            <p className="font-mono font-medium">{status.version || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Disponibilité</p>
            <p className="font-medium">
              {status.uptime || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Zones chargées</p>
            <p className="font-medium">{status.zones_loaded}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Enregistrements totaux</p>
            <p className="font-medium">{status.records_total}</p>
          </div>
        </div>
        {status.last_reload && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">Dernier rechargement</p>
            <p className="font-medium">
              {(() => {
                try {
                  const date = new Date(status.last_reload);
                  if (isNaN(date.getTime())) {
                    return status.last_reload;
                  }
                  return formatDistanceToNow(date, {
                    addSuffix: true,
                  });
                } catch {
                  return status.last_reload;
                }
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

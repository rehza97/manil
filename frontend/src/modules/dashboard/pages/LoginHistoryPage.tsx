import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Monitor,
  Smartphone,
  Globe,
  Calendar,
  MapPin,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLoginHistory } from "@/modules/auth/hooks/useAuth";

interface LoginAttempt {
  id: string;
  timestamp: string;
  success: boolean;
  ip_address: string;
  user_agent: string;
  location?: string;
  device_type: "desktop" | "mobile" | "tablet";
}

const LoginHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useLoginHistory(page, pageSize);

  // Transform backend response to match LoginAttempt interface
  const loginHistory = useMemo<LoginAttempt[]>(() => {
    if (!data) return [];
    return data.map((item: any) => {
      // Determine device type from user agent
      let device_type: "desktop" | "mobile" | "tablet" = "desktop";
      const userAgent = item.user_agent || "";
      if (userAgent.includes("iPhone") || userAgent.includes("Android")) {
        device_type = "mobile";
      } else if (userAgent.includes("iPad")) {
        device_type = "tablet";
      }

      return {
        id: item.id || String(Math.random()),
        timestamp: item.created_at || item.timestamp,
        // AuditLogResponse has 'success' boolean field and 'action' field
        // success=true means login succeeded, success=false means login failed
        // action will be "login_success" or "login_failed"
        success: item.success === true || (item.action === "login_success"),
        ip_address: item.ip_address || "Unknown",
        user_agent: item.user_agent || "Unknown",
        location: item.location || "Inconnu",
        device_type,
      };
    });
  }, [data]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("fr-DZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getBrowserName = (userAgent: string): string => {
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  };

  const successfulLogins = loginHistory.filter((login) => login.success).length;
  const failedLogins = loginHistory.filter((login) => !login.success).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Impossible de charger l&apos;historique de connexion</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/security")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Security
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Login History</h1>
        <p className="text-muted-foreground mt-1">
          View your recent login attempts and active sessions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loginHistory.length}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Successful Logins
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {successfulLogins}
            </div>
            <p className="text-xs text-muted-foreground">Verified access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {failedLogins}
            </div>
            <p className="text-xs text-muted-foreground">
              {failedLogins > 0 ? "Needs attention" : "No issues"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Login History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Login Activity</CardTitle>
          <CardDescription>
            Your login attempts from the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No login history found
                  </TableCell>
                </TableRow>
              ) : (
                loginHistory.map((login) => (
                <TableRow key={login.id}>
                  <TableCell>
                    {login.success ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatTimestamp(login.timestamp)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(login.device_type)}
                      <div>
                        <p className="text-sm font-medium">
                          {getBrowserName(login.user_agent)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {login.device_type}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{login.location || "Inconnu"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{login.ip_address}</span>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conseils de sécurité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            • En cas de connexion suspecte, changez immédiatement votre mot de passe
          </p>
          <p className="text-sm">
            • Activez l&apos;authentification à deux facteurs pour plus de sécurité
          </p>
          <p className="text-sm">
            • Consultez régulièrement votre historique pour détecter les accès non autorisés
          </p>
          <p className="text-sm">
            • Utilisez des mots de passe forts et uniques, ne partagez jamais vos identifiants
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginHistoryPage;

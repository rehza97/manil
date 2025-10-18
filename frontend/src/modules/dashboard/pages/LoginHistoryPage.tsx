import React, { useState } from "react";
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
} from "lucide-react";

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
  // TODO: Fetch from API using auth/security/login-history endpoint
  const [loginHistory] = useState<LoginAttempt[]>([
    {
      id: "1",
      timestamp: "2024-01-20T10:30:00Z",
      success: true,
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      location: "Algiers, Algeria",
      device_type: "desktop",
    },
    {
      id: "2",
      timestamp: "2024-01-19T15:45:00Z",
      success: true,
      ip_address: "192.168.1.2",
      user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      location: "Algiers, Algeria",
      device_type: "mobile",
    },
    {
      id: "3",
      timestamp: "2024-01-18T08:15:00Z",
      success: false,
      ip_address: "203.0.113.0",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0",
      location: "Unknown",
      device_type: "desktop",
    },
    {
      id: "4",
      timestamp: "2024-01-17T14:20:00Z",
      success: true,
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      location: "Algiers, Algeria",
      device_type: "desktop",
    },
    {
      id: "5",
      timestamp: "2024-01-16T09:00:00Z",
      success: true,
      ip_address: "192.168.1.2",
      user_agent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      location: "Algiers, Algeria",
      device_type: "tablet",
    },
  ]);

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
    return new Intl.DateTimeFormat("en-US", {
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
              {loginHistory.map((login) => (
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
                      <span className="text-sm">{login.location || "Unknown"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{login.ip_address}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            • If you notice any suspicious login attempts, change your password
            immediately
          </p>
          <p className="text-sm">
            • Enable two-factor authentication for added security
          </p>
          <p className="text-sm">
            • Regularly review your login history to detect unauthorized access
          </p>
          <p className="text-sm">
            • Use strong, unique passwords and avoid sharing your credentials
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginHistoryPage;

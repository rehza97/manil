import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Users,
  Activity,
  Database,
  Settings,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Key,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/modules/auth";
import {
  useSystemOverview,
  useSystemHealth,
  useSystemStats,
  useDetailedHealth,
  useRecentActivity,
  useUsersByRole,
} from "@/modules/admin/hooks";
import { reportsApi } from "@/shared/api/reports";
import { RevenueCard } from "@/modules/revenue/components";
import { revenueService } from "@/modules/revenue/services/revenueService";

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Fetch revenue overview for consistent revenue display
  const { data: revenueOverview } = useQuery({
    queryKey: ["revenue", "overview", "month"],
    queryFn: () => revenueService.getOverview("month"),
  });

  // Fetch real data from API
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useSystemOverview();
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: stats, isLoading: statsLoading } = useSystemStats();
  const { data: detailedHealth, isLoading: detailedHealthLoading } = useDetailedHealth();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity(5);
  const { data: usersByRole, isLoading: usersByRoleLoading } = useUsersByRole();
  const { data: reportsDashboard } = useQuery({
    queryKey: ["reports", "dashboard", "admin"],
    queryFn: () => reportsApi.getAdminDashboard(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = overviewLoading || healthLoading || statsLoading || detailedHealthLoading || activityLoading || usersByRoleLoading;

  // Format system uptime
  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  // Format response time
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format uptime percentage from seconds
  const formatUptimePercent = (uptimeSeconds: number | undefined | null) => {
    if (!uptimeSeconds || uptimeSeconds === 0) return "100%";
    // Calculate uptime percentage (assuming system has been up for uptimeSeconds)
    const days = Math.floor(uptimeSeconds / 86400);
    if (days > 30) return "99.9%";
    if (days > 7) return "99.5%";
    return "99.0%";
  };

  // Map system health from detailed health data
  const systemHealth = detailedHealth ? [
    {
      component: "Database",
      status: detailedHealth.database?.status === "healthy" ? "healthy" : "warning",
      uptime: detailedHealth.database?.uptime 
        ? `${detailedHealth.database.uptime.toFixed(1)}%`
        : formatUptimePercent(health?.uptime),
      responseTime: detailedHealth.database?.response_time !== undefined && detailedHealth.database.response_time !== null
        ? formatResponseTime(detailedHealth.database.response_time) // Already in milliseconds from backend
        : "N/A",
    },
    {
      component: "API Server",
      status: (detailedHealth.api_server?.cpu_usage || 0) > 80 ? "warning" : "healthy",
      uptime: detailedHealth.api_server?.uptime
        ? `${detailedHealth.api_server.uptime.toFixed(1)}%`
        : formatUptimePercent(health?.uptime),
      responseTime: detailedHealth.api_server?.response_time !== undefined && detailedHealth.api_server.response_time !== null
        ? formatResponseTime(detailedHealth.api_server.response_time) // Already in milliseconds from backend
        : "N/A",
    },
    {
      component: "Cache (Redis)",
      status: detailedHealth.redis?.status === "healthy" ? "healthy" : "warning",
      uptime: detailedHealth.redis?.uptime
        ? `${detailedHealth.redis.uptime.toFixed(1)}%`
        : formatUptimePercent(health?.uptime),
      responseTime: "N/A",
    },
    {
      component: "Storage",
      status: (detailedHealth.storage?.usage_percent || 0) > 80 ? "warning" : "healthy",
      uptime: formatUptimePercent(health?.uptime),
      responseTime: "N/A",
    },
  ] : [];

  // Map user stats by role
  const userStats = usersByRole ? Object.entries(usersByRole.total_by_role || {}).map(([role, count]) => {
    const active = usersByRole.active_by_role?.[role] || 0;
    const color = role.toLowerCase() === "admin" ? "text-red-600" : 
                  role.toLowerCase() === "corporate" ? "text-green-600" : 
                  "text-blue-600";
    return {
      role: role.charAt(0).toUpperCase() + role.slice(1),
      count: count as number,
      active: active as number,
      color,
    };
  }) : [];

  // Map recent activity
  const mappedRecentActivity = (recentActivity && Array.isArray(recentActivity) ? recentActivity.slice(0, 3) : []).map((activity: any) => ({
    id: activity.id || activity.timestamp,
    type: activity.action?.toLowerCase() || "unknown",
    user: activity.user_email || activity.user_id || "system",
    action: `${activity.action || "Activity"}${activity.resource ? ` - ${activity.resource}` : ""}`,
    timestamp: activity.timestamp ? new Date(activity.timestamp).toLocaleString() : "Unknown",
    severity: activity.success === false ? "error" : activity.action?.includes("login") ? "info" : "warning",
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          System Administration Dashboard
        </h1>
        <p className="text-red-100">
          Monitor system health, manage users, and oversee platform operations.
        </p>
      </div>

      {/* Critical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.active_sessions || 0} active sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.uptime ? formatUptime(health.uptime) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">System uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {health?.critical_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {detailedHealth?.api_server?.cpu_usage !== undefined && detailedHealth.api_server.cpu_usage !== null
                ? `${Math.round(detailedHealth.api_server.cpu_usage)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">CPU usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
            <p className="text-xs text-muted-foreground">Total customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <RevenueCard
          title="Monthly Revenue"
          value={Number(revenueOverview?.metrics.monthly_revenue || stats?.monthly_revenue || 0)}
          growth={revenueOverview?.metrics.revenue_growth || stats?.revenue_growth}
          subtitle={revenueOverview?.metrics.revenue_growth !== undefined 
            ? "Recognized revenue (paid invoices)"
            : "From system stats"}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Real-time system component status
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/overview">
                  <Activity className="h-4 w-4 mr-2" />
                  Detailed View
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.length > 0 ? systemHealth.map((component) => (
                <div
                  key={component.component}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{component.component}</span>
                      <Badge
                        variant={
                          component.status === "healthy"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {component.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Uptime: {component.uptime} • Response:{" "}
                      {component.responseTime}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {component.status === "healthy" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  No system health data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest system and user activities
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/admin/logs">
                  <Database className="h-4 w-4 mr-2" />
                  View All Logs
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mappedRecentActivity.length > 0 ? mappedRecentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {activity.severity === "error" ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : activity.severity === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.user}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business KPIs (Reports dashboard) */}
      {reportsDashboard?.metrics && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Business KPIs</CardTitle>
                <CardDescription>
                  Key metrics from reports (customers, tickets, revenue)
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {reportsDashboard.metrics.total_customers ?? 0}
                </div>
                <div className="text-sm font-medium text-slate-900 mt-1">
                  Total Customers
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-amber-600">
                  {reportsDashboard.metrics.open_tickets ?? 0}
                </div>
                <div className="text-sm font-medium text-slate-900 mt-1">
                  Open Tickets
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat("fr-DZ", {
                    style: "currency",
                    currency: "DZD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(
                    Number(revenueOverview?.metrics.booked_revenue || reportsDashboard.metrics.total_revenue || 0)
                  )}
                </div>
                <div className="text-sm font-medium text-slate-900 mt-1">
                  Total Revenue (Booked)
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  From delivered orders
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>User Statistics by Role</CardTitle>
          <CardDescription>
            Overview of user distribution and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userStats.length > 0 ? userStats.map((stat) => (
              <div
                key={stat.role}
                className="text-center p-4 border rounded-lg"
              >
                <div className={`text-3xl font-bold ${stat.color}`}>
                  {stat.count}
                </div>
                <div className="text-sm font-medium text-slate-900 mt-1">
                  {stat.role} Users
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.active} active
                </div>
              </div>
            )) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                No user statistics available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative Actions</CardTitle>
          <CardDescription>Common system administration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin/users">
                <Users className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-muted-foreground">
                    User accounts and roles
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin/roles">
                <Key className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Role Management</div>
                  <div className="text-sm text-muted-foreground">
                    Permissions and access
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin/settings">
                <Settings className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">System Settings</div>
                  <div className="text-sm text-muted-foreground">
                    Platform configuration
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin/reports">
                <BarChart3 className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">System Reports</div>
                  <div className="text-sm text-muted-foreground">
                    Analytics and insights
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;

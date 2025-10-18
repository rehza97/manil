import React from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/modules/auth";

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Mock data - in real app, this would come from API
  const stats = {
    totalUsers: 156,
    activeSessions: 23,
    systemUptime: "99.9%",
    criticalAlerts: 0,
    totalCustomers: 89,
    totalOrders: 234,
    monthlyRevenue: 45230,
    systemLoad: "45%",
  };

  const recentActivity = [
    {
      id: "A-001",
      type: "user_login",
      user: "john.doe@corporate.com",
      action: "Logged in",
      timestamp: "2024-01-15 14:30:25",
      severity: "info",
    },
    {
      id: "A-002",
      type: "role_change",
      user: "admin@cloudmanager.com",
      action: "Updated user role for jane.smith@client.com",
      timestamp: "2024-01-15 14:25:10",
      severity: "warning",
    },
    {
      id: "A-003",
      type: "system_alert",
      user: "system",
      action: "High memory usage detected",
      timestamp: "2024-01-15 14:20:05",
      severity: "error",
    },
  ];

  const systemHealth = [
    {
      component: "Database",
      status: "healthy",
      uptime: "99.9%",
      responseTime: "12ms",
    },
    {
      component: "API Server",
      status: "healthy",
      uptime: "99.8%",
      responseTime: "45ms",
    },
    {
      component: "File Storage",
      status: "warning",
      uptime: "98.5%",
      responseTime: "120ms",
    },
    {
      component: "Email Service",
      status: "healthy",
      uptime: "99.7%",
      responseTime: "89ms",
    },
  ];

  const userStats = [
    {
      role: "Admin",
      count: 3,
      active: 2,
      color: "text-red-600",
    },
    {
      role: "Corporate",
      count: 12,
      active: 8,
      color: "text-green-600",
    },
    {
      role: "Client",
      count: 141,
      active: 89,
      color: "text-blue-600",
    },
  ];

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
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSessions} active sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.systemUptime}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
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
              {stats.criticalAlerts}
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
            <div className="text-2xl font-bold">{stats.systemLoad}</div>
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
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">+12 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">+34 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +18% from last month
            </p>
          </CardContent>
        </Card>
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
                <Link to="/dashboard/overview">
                  <Activity className="h-4 w-4 mr-2" />
                  Detailed View
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((component) => (
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
              ))}
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
                <Link to="/dashboard/logs">
                  <Database className="h-4 w-4 mr-2" />
                  View All Logs
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
            {userStats.map((stat) => (
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
            ))}
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
              <Link to="/dashboard/users">
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
              <Link to="/dashboard/roles">
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
              <Link to="/dashboard/settings">
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
              <Link to="/dashboard/reports">
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

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
  Ticket,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Building2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/modules/auth";
import { useCorporateDashboard } from "../hooks/useDashboard";
import { RevenueCard } from "@/modules/revenue/components";
import { useQuery } from "@tanstack/react-query";
import { revenueService } from "@/modules/revenue/services/revenueService";

const CorporateDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useCorporateDashboard("month");

  // Fetch revenue overview for consistent revenue display
  const { data: revenueOverview } = useQuery({
    queryKey: ["revenue", "overview", "month"],
    queryFn: () => revenueService.getOverview("month"),
  });

  const stats = data?.stats ?? {
    totalCustomers: 0,
    activeTickets: 0,
    pendingOrders: 0,
    monthlyRevenue: 0,
    kycPending: 0,
  };
  const recentCustomers = data?.recentCustomers ?? [];
  const recentTickets = data?.recentTickets ?? [];
  const recentOrders = data?.recentOrders ?? [];

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
          <p className="text-destructive">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Corporate Dashboard</h1>
        <p className="text-green-100">
          Manage your clients, track orders, and oversee business operations.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">+5 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTickets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTickets > 10 ? "High volume" : "Normal"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Processing...</p>
          </CardContent>
        </Card>

        <RevenueCard
          title="Monthly Revenue"
          value={Number(revenueOverview?.metrics.monthly_revenue || stats.monthlyRevenue || 0)}
          growth={revenueOverview?.metrics.revenue_growth}
          subtitle="Recognized revenue (paid invoices)"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.kycPending}</div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Customers</CardTitle>
                <CardDescription>
                  Latest customer registrations and status
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/dashboard/customers">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{customer.name}</span>
                      <Badge
                        variant={
                          customer.status === "active" ? "default" : "secondary"
                        }
                      >
                        {customer.status}
                      </Badge>
                      <Badge
                        variant={
                          customer.kycStatus === "verified"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {customer.kycStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {customer.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last activity: {customer.lastActivity}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/customers/${customer.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Support Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>
                  Latest customer support requests
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/tickets">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{ticket.id}</span>
                      <Badge
                        variant={
                          ticket.status === "resolved" ? "default" : "secondary"
                        }
                      >
                        {ticket.status}
                      </Badge>
                      <Badge
                        variant={
                          ticket.priority === "high" ? "destructive" : "outline"
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.subject}
                      {ticket.assignedTo ? ` • Assigned to ${ticket.assignedTo}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/tickets/${ticket.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Latest customer orders and their status
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/orders">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{order.id}</span>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.service} • ${order.amount}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/orders/${order.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common corporate management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/customers/new">
                <Users className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Add Customer</div>
                  <div className="text-sm text-muted-foreground">
                    Register new client
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/customers?kyc=pending">
                <Building2 className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Review KYC</div>
                  <div className="text-sm text-muted-foreground">
                    Validate customer documents
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/tickets">
                <Ticket className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Manage Tickets</div>
                  <div className="text-sm text-muted-foreground">
                    Handle support requests
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/reports">
                <TrendingUp className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">View Reports</div>
                  <div className="text-sm text-muted-foreground">
                    Business analytics
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

export default CorporateDashboardPage;

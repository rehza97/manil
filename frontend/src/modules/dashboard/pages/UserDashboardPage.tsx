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
  Package,
  Ticket,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/modules/auth";
import { useCustomerDashboard } from "../hooks/useDashboard";

const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useCustomerDashboard("month");

  // Use real data from API or defaults
  const stats = data?.stats || {
    activeServices: 0,
    openTickets: 0,
    pendingOrders: 0,
    totalSpent: 0,
  };

  const recentTickets = data?.recentTickets || [];
  const recentOrders = data?.recentOrders || [];

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
          <p className="text-destructive">Impossible de charger les données du tableau de bord</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Bon retour, {user?.full_name || user?.email} !</h1>
        <p className="text-blue-100">
          Vue d&apos;ensemble de vos services et activités CloudManager.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Services
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeServices}</div>
            <p className="text-xs text-muted-foreground">+1 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openTickets > 0 ? "Needs attention" : "All resolved"}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("fr-DZ", {
                style: "currency",
                currency: "DZD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(stats.totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Support Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tickets support récents</CardTitle>
                <CardDescription>
                  Vos dernières demandes et leur statut
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/dashboard/tickets">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau ticket
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun ticket récent
                </p>
              ) : (
                recentTickets.map((ticket) => (
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
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/dashboard/tickets/${ticket.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
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
                  Your latest service orders and their status
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/catalog">Browse Services</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent orders
                </p>
              ) : (
                recentOrders.map((order) => (
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
                      {order.service}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${order.amount} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/orders/${order.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Tâches courantes depuis votre tableau de bord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/tickets/new">
                <Ticket className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Créer un ticket support</div>
                  <div className="text-sm text-muted-foreground">
                    Obtenir de l&apos;aide pour vos services
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/catalog">
                <Package className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Parcourir les services</div>
                  <div className="text-sm text-muted-foreground">
                    Explorer notre catalogue produits
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/dashboard/profile">
                <CheckCircle className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Modifier le profil</div>
                  <div className="text-sm text-muted-foreground">
                    Gérer les paramètres de votre compte
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

export default UserDashboardPage;

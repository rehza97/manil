import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  User,
  Building2,
  Server,
  Clock,
  Activity,
  Image,
  Globe,
  TrendingUp,
} from "lucide-react";
import { useAuth, RoleGuard, useLogout } from "@/modules/auth";

const CorporateDashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const logoutMutation = useLogout();

  const navigation = [
    {
      name: "Dashboard",
      href: "/corporate",
      icon: LayoutDashboard,
      current: location.pathname === "/corporate",
    },
    {
      name: "Customers",
      href: "/corporate/customers",
      icon: Users,
      current: location.pathname.startsWith("/corporate/customers"),
      permission: "customer:read",
    },
    {
      name: "Support Tickets",
      href: "/corporate/tickets",
      icon: Ticket,
      current: location.pathname.startsWith("/corporate/tickets"),
      permission: "ticket:read",
    },
    {
      name: "Products",
      href: "/corporate/products",
      icon: Package,
      current: location.pathname.startsWith("/corporate/products"),
      permission: "product:read",
    },
    {
      name: "Orders",
      href: "/corporate/orders",
      icon: ShoppingCart,
      current: location.pathname.startsWith("/corporate/orders"),
      permission: "order:read",
    },
    {
      name: "Invoices",
      href: "/corporate/invoices",
      icon: FileText,
      current: location.pathname.startsWith("/corporate/invoices"),
      permission: "invoice:read",
    },
    {
      name: "Reports",
      href: "/corporate/reports",
      icon: BarChart3,
      current: location.pathname.startsWith("/corporate/reports"),
      permission: "report:read",
    },
    {
      name: "VPS Management",
      icon: Server,
      current: location.pathname.startsWith("/corporate/hosting"),
      permission: "hosting:admin",
      children: [
        {
          name: "Pending Requests",
          href: "/corporate/hosting/requests",
          icon: Clock,
          current: location.pathname === "/corporate/hosting/requests",
          permission: "hosting:approve",
        },
        {
          name: "All Subscriptions",
          href: "/corporate/hosting/subscriptions",
          icon: Server,
          current: location.pathname === "/corporate/hosting/subscriptions",
          permission: "hosting:admin",
        },
        {
          name: "Monitoring",
          href: "/corporate/hosting/monitoring",
          icon: Activity,
          current: location.pathname === "/corporate/hosting/monitoring",
          permission: "hosting:monitor",
        },
        {
          name: "Custom Images",
          href: "/corporate/hosting/custom-images",
          icon: Image,
          current: location.pathname === "/corporate/hosting/custom-images",
          permission: "hosting:admin",
        },
      ],
    },
    {
      name: "DNS Management",
      icon: Globe,
      current: location.pathname.startsWith("/corporate/dns"),
      permission: "dns:read",
      children: [
        {
          name: "Customer DNS Zones",
          href: "/corporate/dns/zones",
          icon: Globe,
          current: location.pathname === "/corporate/dns/zones",
          permission: "dns:read",
        },
        {
          name: "DNS Overview",
          href: "/corporate/dns/overview",
          icon: TrendingUp,
          current: location.pathname === "/corporate/dns/overview",
          permission: "dns:read",
        },
      ],
    },
  ];

  const filteredNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <RoleGuard allowedRole="corporate" layoutName="Corporate Portal">
      <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Building2 className="h-8 w-8 text-green-600" />
                <span className="ml-2 text-xl font-bold text-slate-900">
                  CloudManager
                </span>
                <Badge variant="secondary" className="ml-2">
                  Corporate Portal
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || "C"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <Badge variant="outline" className="w-fit">
                        Corporate
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/corporate/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/corporate/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-slate-200">
            <div className="flex flex-col flex-grow">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  // If item has children, render as a group
                  if (item.children && item.children.length > 0) {
                    const filteredChildren = item.children.filter(
                      (child) => !child.permission || hasPermission(child.permission)
                    );
                    if (filteredChildren.length === 0) return null;
                    
                    return (
                      <div key={item.name} className="space-y-1">
                        <div
                          className={`${
                            item.current
                              ? "bg-green-50 border-green-500 text-green-700"
                              : "border-transparent text-slate-600"
                          } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4`}
                        >
                          <Icon
                            className={`${
                              item.current ? "text-green-500" : "text-slate-400"
                            } mr-3 h-5 w-5`}
                          />
                          {item.name}
                        </div>
                        <div className="ml-4 space-y-1">
                          {filteredChildren.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.name}
                                to={child.href || "#"}
                                className={`${
                                  child.current
                                    ? "bg-green-50 border-green-500 text-green-700"
                                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
                              >
                                <ChildIcon
                                  className={`${
                                    child.current ? "text-green-500" : "text-slate-400"
                                  } mr-3 h-4 w-4`}
                                />
                                {child.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  // Regular item without children
                  if (!item.href) return null;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        item.current
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
                    >
                      <Icon
                        className={`${
                          item.current ? "text-green-500" : "text-slate-400"
                        } mr-3 h-5 w-5`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
};

export default CorporateDashboardLayout;

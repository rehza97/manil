import React, { useState } from "react";
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
  FilePen,
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
  UserPlus,
  Receipt,
  FolderTree,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth, RoleGuard, useLogout } from "@/modules/auth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { NotificationDropdown } from "@/shared/components/NotificationDropdown";

const CorporateDashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const logoutMutation = useLogout();
  
  // State for managing open/closed collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    customers: location.pathname.startsWith("/corporate/customers"),
    tickets: location.pathname.startsWith("/corporate/tickets"),
    orders: location.pathname.startsWith("/corporate/orders"),
    products: location.pathname.startsWith("/corporate/products"),
    quotes: location.pathname.startsWith("/corporate/quotes"),
    invoices: location.pathname.startsWith("/corporate/invoices"),
    reports: location.pathname.startsWith("/corporate/reports"),
    hosting: location.pathname.startsWith("/corporate/hosting"),
    dns: location.pathname.startsWith("/corporate/dns"),
    settings: location.pathname.startsWith("/corporate/settings"),
  });
  
  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
      sectionKey: "tickets",
      children: [
        {
          name: "All Tickets",
          href: "/corporate/tickets",
          icon: Ticket,
          current: location.pathname === "/corporate/tickets",
          permission: "ticket:read",
        },
        {
          name: "Categories",
          href: "/corporate/tickets/categories",
          icon: FolderTree,
          current: location.pathname === "/corporate/tickets/categories",
          permission: "ticket:read",
        },
        {
          name: "Templates",
          href: "/corporate/tickets/templates",
          icon: FileText,
          current: location.pathname.startsWith("/corporate/tickets/templates"),
          permission: "ticket:read",
        },
      ],
    },
    {
      name: "Orders",
      href: "/corporate/orders",
      icon: ShoppingCart,
      current: location.pathname.startsWith("/corporate/orders"),
      permission: "order:read",
      children: [
        {
          name: "All Orders",
          href: "/corporate/orders",
          icon: ShoppingCart,
          current: location.pathname === "/corporate/orders",
          permission: "order:read",
        },
        {
          name: "Create Order",
          href: "/corporate/orders/create",
          icon: UserPlus,
          current: location.pathname === "/corporate/orders/create",
          permission: "order:create",
        },
      ],
    },
    {
      name: "Products",
      href: "/corporate/products",
      icon: Package,
      current: location.pathname.startsWith("/corporate/products"),
      permission: "product:read",
      sectionKey: "products",
      children: [
        {
          name: "All Products",
          href: "/corporate/products",
          icon: Package,
          current: location.pathname === "/corporate/products",
          permission: "product:read",
        },
        {
          name: "Create Product",
          href: "/corporate/products/new",
          icon: UserPlus,
          current: location.pathname === "/corporate/products/new",
          permission: "product:create",
        },
        {
          name: "Categories",
          href: "/corporate/products/categories",
          icon: FolderTree,
          current: location.pathname === "/corporate/products/categories",
          permission: "product:read",
        },
      ],
    },
    {
      name: "Quotes",
      href: "/corporate/quotes",
      icon: FilePen,
      current: location.pathname.startsWith("/corporate/quotes"),
      permission: "quotes:read",
      children: [
        {
          name: "All Quotes",
          href: "/corporate/quotes",
          icon: FilePen,
          current: location.pathname === "/corporate/quotes",
          permission: "quotes:read",
        },
        {
          name: "Create Quote",
          href: "/corporate/quotes/new",
          icon: UserPlus,
          current: location.pathname === "/corporate/quotes/new",
          permission: "quotes:create",
        },
      ],
    },
    {
      name: "Invoices",
      href: "/corporate/invoices",
      icon: Receipt,
      current: location.pathname.startsWith("/corporate/invoices"),
      permission: "invoice:read",
      sectionKey: "invoices",
      children: [
        {
          name: "All Invoices",
          href: "/corporate/invoices",
          icon: Receipt,
          current: location.pathname === "/corporate/invoices",
          permission: "invoice:read",
        },
        {
          name: "Create Invoice",
          href: "/corporate/invoices/new",
          icon: UserPlus,
          current: location.pathname === "/corporate/invoices/new",
          permission: "invoice:create",
        },
      ],
    },
    {
      name: "Reports",
      href: "/corporate/reports",
      icon: BarChart3,
      current: location.pathname.startsWith("/corporate/reports"),
      permission: "report:read",
      children: [
        {
          name: "Reports Dashboard",
          href: "/corporate/reports",
          icon: BarChart3,
          current: location.pathname === "/corporate/reports",
          permission: "report:read",
        },
        {
          name: "Customer Reports",
          href: "/corporate/reports/customers",
          icon: Users,
          current: location.pathname === "/corporate/reports/customers",
          permission: "report:read",
        },
        {
          name: "Ticket Reports",
          href: "/corporate/reports/tickets",
          icon: Ticket,
          current: location.pathname === "/corporate/reports/tickets",
          permission: "report:read",
        },
        {
          name: "Order Reports",
          href: "/corporate/reports/orders",
          icon: ShoppingCart,
          current: location.pathname === "/corporate/reports/orders",
          permission: "report:read",
        },
        {
          name: "Revenue Reports",
          href: "/corporate/reports/revenue",
          icon: DollarSign,
          current: location.pathname === "/corporate/reports/revenue",
          permission: "report:read",
        },
      ],
    },
    {
      name: "VPS Management",
      icon: Server,
      current: location.pathname.startsWith("/corporate/hosting"),
      permission: "hosting:admin",
      sectionKey: "hosting",
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
    {
      name: "Settings",
      href: "/corporate/settings",
      icon: Settings,
      current: location.pathname.startsWith("/corporate/settings"),
      permission: "settings:read",
      sectionKey: "settings",
      children: [
        {
          name: "General Settings",
          href: "/corporate/settings/general",
          icon: Settings,
          current: location.pathname === "/corporate/settings/general",
          permission: "settings:read",
        },
        {
          name: "Notifications",
          href: "/corporate/settings/notifications",
          icon: Bell,
          current: location.pathname === "/corporate/settings/notifications",
          permission: "settings:read",
        },
        {
          name: "Email Templates",
          href: "/corporate/settings/templates",
          icon: FileText,
          current: location.pathname === "/corporate/settings/templates",
          permission: "settings:read",
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
              <NotificationDropdown />

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
                  const hasChildren = item.children && item.children.length > 0;
                  const sectionKey = item.sectionKey;
                  const isOpen = sectionKey ? (openSections[sectionKey] ?? false) : false;

                  if (hasChildren && sectionKey) {
                    const filteredChildren = item.children!.filter(
                      (child) => !child.permission || hasPermission(child.permission)
                    );
                    if (filteredChildren.length === 0) return null;
                    
                    return (
                      <Collapsible
                        key={item.name}
                        open={isOpen}
                        onOpenChange={() => toggleSection(sectionKey!)}
                      >
                        <CollapsibleTrigger
                          className={`${
                            item.current
                              ? "bg-green-50 border-green-500 text-green-700"
                              : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          } group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
                        >
                          <div className="flex items-center flex-1">
                            <Icon
                              className={`${
                                item.current ? "text-green-500" : "text-slate-400"
                              } mr-3 h-5 w-5`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-4 mt-1 space-y-1">
                          {filteredChildren.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.name}
                                to={child.href || "#"}
                                className={`${
                                  child.current
                                    ? "bg-green-50 text-green-700 font-medium"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                } group flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                              >
                                <ChildIcon
                                  className={`${
                                    child.current ? "text-green-500" : "text-slate-400"
                                  } mr-3 h-4 w-4`}
                                />
                                <span>{child.name}</span>
                              </Link>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
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

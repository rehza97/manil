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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { NotificationDropdown } from "@/shared/components/NotificationDropdown";
import { AlertCircle, CheckCircle, XCircle, Mail } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Bell,
  LogOut,
  User,
  Database,
  Activity,
  Key,
  Headphones,
  Wrench,
  ChevronDown,
  ChevronRight,
  Heart,
  Gauge,
  AlertTriangle,
  UserPlus,
  UserCog,
  UserCheck,
  Building2,
  FileCheck,
  Lock,
  MessageSquare,
  HardDrive,
  Archive,
  ClipboardList,
  FolderTree,
  Zap,
  Trash2,
  GitBranch,
  TrendingUp,
  ShieldCheck,
  Clock,
  Server,
  Image,
  Globe,
  BarChart2,
  FileEdit as FilePen,
  Receipt,
} from "lucide-react";
import { useAuth, RoleGuard, useLogout } from "@/modules/auth";

const AdminDashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const logoutMutation = useLogout();
  
  // State for managing open/closed collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: location.pathname.startsWith("/admin/overview"),
    users: location.pathname.startsWith("/admin/users"),
    customers: location.pathname.startsWith("/admin/customers"),
    roles: location.pathname.startsWith("/admin/roles"),
    products: location.pathname.startsWith("/admin/products"),
    settings: location.pathname.startsWith("/admin/settings"),
    logs: location.pathname.startsWith("/admin/logs"),
    reports: location.pathname.startsWith("/admin/reports"),
    support: location.pathname.startsWith("/admin/support"),
    tickets: location.pathname.startsWith("/admin/tickets"),
    orders: location.pathname.startsWith("/admin/orders"),
    invoices: location.pathname.startsWith("/admin/invoices"),
    quotes: location.pathname.startsWith("/admin/quotes"),
    hosting: location.pathname.startsWith("/admin/hosting"),
    dns: location.pathname.startsWith("/admin/dns"),
    maintenance: location.pathname.startsWith("/admin/maintenance"),
  });
  

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  type NavItem = {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    current?: boolean;
    permission?: string;
  };

  type NavSection = {
    name: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    current?: boolean;
    permission?: string;
    children?: NavItem[];
    sectionKey?: string;
  };

  const navigation: (NavItem | NavSection)[] = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      current: location.pathname === "/admin",
    },
    {
      name: "System Overview",
      href: "/admin/overview",
      icon: Activity,
      current: location.pathname.startsWith("/admin/overview"),
      sectionKey: "overview",
      children: [
        {
          name: "Overview",
          href: "/admin/overview",
          icon: Activity,
          current: location.pathname === "/admin/overview",
        },
        {
          name: "System Health",
          href: "/admin/overview/health",
          icon: Heart,
          current: location.pathname === "/admin/overview/health",
        },
        {
          name: "Performance Metrics",
          href: "/admin/overview/performance",
          icon: Gauge,
          current: location.pathname === "/admin/overview/performance",
        },
        {
          name: "System Alerts",
          href: "/admin/overview/alerts",
          icon: AlertTriangle,
          current: location.pathname === "/admin/overview/alerts",
        },
      ],
    },
    {
      name: "User Management",
      href: "/admin/users",
      icon: Users,
      current: location.pathname.startsWith("/admin/users"),
      sectionKey: "users",
      children: [
        {
          name: "All Users",
          href: "/admin/users",
          icon: Users,
          current: location.pathname === "/admin/users",
        },
        {
          name: "Create User",
          href: "/admin/users/new",
          icon: UserPlus,
          current: location.pathname === "/admin/users/new",
        },
      ],
    },
    {
      name: "Customer Management",
      href: "/admin/customers",
      icon: Package,
      current: location.pathname.startsWith("/admin/customers"),
      sectionKey: "customers",
      children: [
        {
          name: "All Customers",
          href: "/admin/customers",
          icon: Package,
          current: location.pathname === "/admin/customers",
        },
        {
          name: "Create Customer",
          href: "/admin/customers/create",
          icon: UserPlus,
          current: location.pathname === "/admin/customers/create",
        },
      ],
    },
    {
      name: "Role & Permissions",
      href: "/admin/roles",
      icon: Key,
      current: location.pathname.startsWith("/admin/roles"),
      sectionKey: "roles",
      children: [
        {
          name: "All Roles",
          href: "/admin/roles",
          icon: Key,
          current: location.pathname === "/admin/roles",
        },
        {
          name: "Create Role",
          href: "/admin/roles/new",
          icon: UserPlus,
          current: location.pathname === "/admin/roles/new",
        },
        {
          name: "All Permissions",
          href: "/admin/permissions",
          icon: Lock,
          current: location.pathname === "/admin/permissions",
        },
      ],
    },
    {
      name: "Product Management",
      href: "/admin/products",
      icon: Package,
      current: location.pathname.startsWith("/admin/products"),
      sectionKey: "products",
      children: [
        {
          name: "All Products",
          href: "/admin/products",
          icon: Package,
          current: location.pathname === "/admin/products",
        },
        {
          name: "Categories",
          href: "/admin/products/categories",
          icon: FolderTree,
          current: location.pathname === "/admin/products/categories",
        },
        {
          name: "Add Product",
          href: "/admin/products/new",
          icon: UserPlus,
          current: location.pathname === "/admin/products/new",
        },
      ],
    },
    {
      name: "Support Management",
      href: "/admin/support",
      icon: Headphones,
      current: location.pathname.startsWith("/admin/support"),
      sectionKey: "support",
      children: [
        {
          name: "Support Dashboard",
          href: "/admin/support",
          icon: Headphones,
          current: location.pathname === "/admin/support",
        },
        {
          name: "Support Groups",
          href: "/admin/support/groups",
          icon: Users,
          current: location.pathname === "/admin/support/groups",
        },
        {
          name: "Ticket Categories",
          href: "/admin/support/categories",
          icon: FolderTree,
          current: location.pathname === "/admin/support/categories",
        },
        {
          name: "Automation Rules",
          href: "/admin/support/automation",
          icon: Zap,
          current: location.pathname === "/admin/support/automation",
        },
      ],
    },
    {
      name: "Tickets",
      href: "/admin/tickets",
      icon: Ticket,
      current: location.pathname.startsWith("/admin/tickets"),
      sectionKey: "tickets",
      children: [
        {
          name: "All Tickets",
          href: "/admin/tickets",
          icon: Ticket,
          current: location.pathname === "/admin/tickets",
        },
        {
          name: "Templates",
          href: "/admin/tickets/templates",
          icon: FileText,
          current: location.pathname.startsWith("/admin/tickets/templates"),
        },
        {
          name: "Email accounts",
          href: "/admin/tickets/email-accounts",
          icon: Mail,
          current: location.pathname.startsWith("/admin/tickets/email-accounts"),
        },
      ],
    },
    {
      name: "Orders",
      href: "/admin/orders",
      icon: ShoppingCart,
      current: location.pathname.startsWith("/admin/orders"),
      sectionKey: "orders",
      children: [
        {
          name: "All Orders",
          href: "/admin/orders",
          icon: ShoppingCart,
          current: location.pathname === "/admin/orders",
        },
        {
          name: "Create Order",
          href: "/admin/orders/create",
          icon: UserPlus,
          current: location.pathname === "/admin/orders/create",
        },
      ],
    },
    {
      name: "Quotes",
      href: "/admin/quotes",
      icon: FilePen,
      current: location.pathname.startsWith("/admin/quotes"),
      sectionKey: "quotes",
      children: [
        {
          name: "All Quotes",
          href: "/admin/quotes",
          icon: FilePen,
          current: location.pathname === "/admin/quotes",
        },
        {
          name: "Create Quote",
          href: "/admin/quotes/new",
          icon: UserPlus,
          current: location.pathname === "/admin/quotes/new",
          permission: "quotes:create",
        },
      ],
    },
    {
      name: "Invoices",
      href: "/admin/invoices",
      icon: Receipt,
      current: location.pathname.startsWith("/admin/invoices"),
      sectionKey: "invoices",
      children: [
        {
          name: "All Invoices",
          href: "/admin/invoices",
          icon: Receipt,
          current: location.pathname === "/admin/invoices",
        },
        {
          name: "Create Invoice",
          href: "/admin/invoices/create",
          icon: UserPlus,
          current: location.pathname === "/admin/invoices/create",
        },
      ],
    },
    {
      name: "VPS Hosting",
      href: "/admin/hosting/subscriptions",
      icon: Server,
      current: location.pathname.startsWith("/admin/hosting"),
      sectionKey: "hosting",
      children: [
        {
          name: "VPS Plans",
          href: "/admin/hosting/plans",
          icon: Package,
          current: location.pathname === "/admin/hosting/plans",
        },
        {
          name: "Pending Requests",
          href: "/admin/hosting/requests",
          icon: ClipboardList,
          current: location.pathname === "/admin/hosting/requests",
        },
        {
          name: "All Subscriptions",
          href: "/admin/hosting/subscriptions",
          icon: Server,
          current: location.pathname === "/admin/hosting/subscriptions",
        },
        {
          name: "Monitoring",
          href: "/admin/hosting/monitoring",
          icon: Activity,
          current: location.pathname === "/admin/hosting/monitoring",
        },
        {
          name: "Custom Images",
          href: "/admin/hosting/custom-images",
          icon: Image,
          current: location.pathname === "/admin/hosting/custom-images",
        },
      ],
    },
    {
      name: "DNS Management",
      href: "/admin/dns/zones",
      icon: Globe,
      current: location.pathname.startsWith("/admin/dns"),
      sectionKey: "dns",
      children: [
        {
          name: "All DNS Zones",
          href: "/admin/dns/zones",
          icon: Globe,
          current: location.pathname === "/admin/dns/zones",
        },
        {
          name: "DNS Monitoring",
          href: "/admin/dns/monitoring",
          icon: BarChart2,
          current: location.pathname === "/admin/dns/monitoring",
        },
        {
          name: "DNS Templates",
          href: "/admin/dns/templates",
          icon: FileText,
          current: location.pathname === "/admin/dns/templates",
        },
      ],
    },
    {
      name: "System Settings",
      href: "/admin/settings",
      icon: Settings,
      current: location.pathname.startsWith("/admin/settings"),
      sectionKey: "settings",
      children: [
        {
          name: "Settings",
          href: "/admin/settings",
          icon: Settings,
          current: location.pathname === "/admin/settings",
        },
        {
          name: "General",
          href: "/admin/settings/general",
          icon: Settings,
          current: location.pathname === "/admin/settings/general",
        },
        {
          name: "Security",
          href: "/admin/settings/security",
          icon: ShieldCheck,
          current: location.pathname === "/admin/settings/security",
        },
        {
          name: "Email Config",
          href: "/admin/settings/email",
          icon: Mail,
          current: location.pathname === "/admin/settings/email",
        },
        {
          name: "SMS Config",
          href: "/admin/settings/sms",
          icon: MessageSquare,
          current: location.pathname === "/admin/settings/sms",
        },
        {
          name: "Storage Config",
          href: "/admin/settings/storage",
          icon: HardDrive,
          current: location.pathname === "/admin/settings/storage",
        },
        {
          name: "Backup Settings",
          href: "/admin/settings/backup",
          icon: Archive,
          current: location.pathname === "/admin/settings/backup",
        },
      ],
    },
    {
      name: "Activity & Logs",
      href: "/admin/logs",
      icon: Database,
      current: location.pathname.startsWith("/admin/logs"),
      sectionKey: "logs",
      children: [
        {
          name: "Activity Logs",
          href: "/admin/logs",
          icon: Activity,
          current: location.pathname === "/admin/logs",
        },
        {
          name: "Audit Logs",
          href: "/admin/logs/audit",
          icon: FileCheck,
          current: location.pathname === "/admin/logs/audit",
        },
        {
          name: "Security Logs",
          href: "/admin/logs/security",
          icon: ShieldCheck,
          current: location.pathname === "/admin/logs/security",
        },
        {
          name: "System Logs",
          href: "/admin/logs/system",
          icon: Database,
          current: location.pathname === "/admin/logs/system",
        },
      ],
    },
    {
      name: "Reports",
      href: "/admin/reports",
      icon: BarChart3,
      current: location.pathname.startsWith("/admin/reports"),
      sectionKey: "reports",
      children: [
        {
          name: "Reports Dashboard",
          href: "/admin/reports",
          icon: BarChart3,
          current: location.pathname === "/admin/reports",
        },
        {
          name: "User Reports",
          href: "/admin/reports/users",
          icon: User,
          current: location.pathname === "/admin/reports/users",
        },
        {
          name: "Activity Reports",
          href: "/admin/reports/activity",
          icon: Activity,
          current: location.pathname === "/admin/reports/activity",
        },
        {
          name: "Security Reports",
          href: "/admin/reports/security",
          icon: ShieldCheck,
          current: location.pathname === "/admin/reports/security",
        },
        {
          name: "Performance Reports",
          href: "/admin/reports/performance",
          icon: TrendingUp,
          current: location.pathname === "/admin/reports/performance",
        },
      ],
    },
    {
      name: "Maintenance",
      href: "/admin/maintenance",
      icon: Wrench,
      current: location.pathname.startsWith("/admin/maintenance"),
      sectionKey: "maintenance",
      children: [
        {
          name: "Maintenance Dashboard",
          href: "/admin/maintenance",
          icon: Wrench,
          current: location.pathname === "/admin/maintenance",
        },
        {
          name: "Backup Management",
          href: "/admin/maintenance/backup",
          icon: Archive,
          current: location.pathname === "/admin/maintenance/backup",
        },
        {
          name: "Cache Management",
          href: "/admin/maintenance/cache",
          icon: Database,
          current: location.pathname === "/admin/maintenance/cache",
        },
        {
          name: "Data Cleanup",
          href: "/admin/maintenance/cleanup",
          icon: Trash2,
          current: location.pathname === "/admin/maintenance/cleanup",
        },
        {
          name: "Migrations",
          href: "/admin/maintenance/migrations",
          icon: GitBranch,
          current: location.pathname === "/admin/maintenance/migrations",
        },
      ],
    },
    {
      name: "Profile & Security",
      href: "/admin/profile",
      icon: User,
      current: location.pathname.startsWith("/admin/profile") || location.pathname.startsWith("/admin/security"),
      sectionKey: "profile",
      children: [
        {
          name: "Profile",
          href: "/admin/profile",
          icon: User,
          current: location.pathname === "/admin/profile",
        },
        {
          name: "Edit Profile",
          href: "/admin/profile/edit",
          icon: UserCog,
          current: location.pathname === "/admin/profile/edit",
        },
        {
          name: "Security",
          href: "/admin/security",
          icon: Shield,
          current: location.pathname === "/admin/security",
        },
        {
          name: "Login History",
          href: "/admin/security/login-history",
          icon: Clock,
          current: location.pathname === "/admin/security/login-history",
        },
      ],
    },
  ];

  const filteredNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <RoleGuard allowedRole="admin" layoutName="Admin Portal">
      <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Shield className="h-8 w-8 text-red-600" />
                <span className="ml-2 text-xl font-bold text-slate-900">
                  CloudManager
                </span>
                <Badge variant="destructive" className="ml-2">
                  Admin Portal
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <NotificationDropdown />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border-gray-200 shadow-lg" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal bg-white">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-gray-500">
                        {user?.email}
                      </p>
                      <Badge variant="destructive" className="w-fit">
                        Administrator
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem asChild className="bg-white hover:bg-gray-50">
                    <Link to="/admin/profile" className="text-gray-900">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="bg-white hover:bg-gray-50">
                    <Link to="/admin/settings" className="text-gray-900">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem 
                    className="bg-white hover:bg-gray-50 text-gray-900"
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-72 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-slate-200">
            <div className="flex flex-col flex-grow">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = "children" in item && item.children && item.children.length > 0;
                  const sectionKey = "sectionKey" in item ? item.sectionKey : undefined;
                  const isOpen = sectionKey ? (openSections[sectionKey] ?? false) : false;

                  if (hasChildren && sectionKey) {
                    return (
                      <Collapsible
                        key={item.name}
                        open={isOpen}
                        onOpenChange={() => toggleSection(sectionKey)}
                      >
                        <CollapsibleTrigger
                          className={`${
                            item.current
                              ? "bg-red-50 border-red-500 text-red-700"
                              : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          } group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
                        >
                          <div className="flex items-center flex-1">
                            <Icon
                              className={`${
                                item.current ? "text-red-500" : "text-slate-400"
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
                          {item.children?.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.name}
                                to={child.href}
                                className={`${
                                  child.current
                                    ? "bg-red-50 text-red-700 font-medium"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                } group flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                              >
                                <ChildIcon
                                  className={`${
                                    child.current ? "text-red-500" : "text-slate-400"
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

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        item.current
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
                    >
                      <Icon
                        className={`${
                          item.current ? "text-red-500" : "text-slate-400"
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

export default AdminDashboardLayout;

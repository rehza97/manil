import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Ticket,
  Package,
  ShoppingCart,
  Bell,
  Settings,
  LogOut,
  User,
  Shield,
  FileText,
  ChevronDown,
  ChevronRight,
  Server,
  Image,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth, RoleGuard, useLogout } from "@/modules/auth";
import { customerService } from "@/modules/customers/services";
import { useCustomerKYCStatus } from "@/modules/customers/hooks";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
  children?: NavItem[];
}

const UserDashboardLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());

  // Fetch current user's customer profile
  const { data: customer } = useQuery({
    queryKey: ["customers", "me"],
    queryFn: () => customerService.getMyCustomer(),
    enabled: !!user,
  });

  const customerId = customer?.id;

  // Fetch KYC status
  const { data: kycStatus } = useCustomerKYCStatus(customerId || "");

  // Get account status badge
  const getAccountStatusBadge = () => {
    if (!customer) {
      return (
        <Badge variant="secondary" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          No Profile
        </Badge>
      );
    }

    const customerStatus = customer.status;
    const kycStatusValue = kycStatus?.kycStatus;

    // Priority: KYC status > Customer status
    if (kycStatusValue === "approved") {
      return (
        <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (kycStatusValue === "pending") {
      return (
        <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" />
          KYC Pending
        </Badge>
      );
    } else if (kycStatusValue === "rejected") {
      return (
        <Badge variant="destructive" className="ml-2">
          <XCircle className="h-3 w-3 mr-1" />
          KYC Rejected
        </Badge>
      );
    } else if (customerStatus === "active") {
      return (
        <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    } else if (customerStatus === "pending") {
      return (
        <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    } else if (customerStatus === "suspended") {
      return (
        <Badge variant="destructive" className="ml-2">
          <XCircle className="h-3 w-3 mr-1" />
          Suspended
        </Badge>
      );
    } else if (customerStatus === "inactive") {
      return (
        <Badge variant="secondary" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="ml-2">
        <AlertCircle className="h-3 w-3 mr-1" />
        {customerStatus || "Unknown"}
      </Badge>
    );
  };

  // Initialize open items based on current path
  React.useEffect(() => {
    const newOpenItems = new Set<string>();
    if (location.pathname.startsWith("/dashboard/profile") ||
        location.pathname.startsWith("/dashboard/security")) {
      newOpenItems.add("profile");
    }
    if (location.pathname.startsWith("/dashboard/tickets")) {
      newOpenItems.add("tickets");
    }
    if (location.pathname.startsWith("/dashboard/invoices")) {
      newOpenItems.add("invoices");
    }
    if (location.pathname.startsWith("/dashboard/vps")) {
      newOpenItems.add("vps hosting");
    }
    if (location.pathname.startsWith("/dashboard/dns")) {
      newOpenItems.add("dns management");
    }
    if (location.pathname.startsWith("/dashboard/services")) {
      newOpenItems.add("my services");
    }
    if (location.pathname.startsWith("/dashboard/settings")) {
      newOpenItems.add("settings");
    }
    setOpenItems(newOpenItems);
  }, [location.pathname]);

  const navigation: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: location.pathname === "/dashboard",
    },
    {
      name: "Profile",
      icon: User,
      current: location.pathname.startsWith("/dashboard/profile") || 
              location.pathname.startsWith("/dashboard/security"),
      children: [
        {
          name: "View Profile",
          href: "/dashboard/profile",
          icon: User,
          current: location.pathname === "/dashboard/profile",
        },
        {
          name: "Edit Profile",
          href: "/dashboard/profile/edit",
          icon: User,
          current: location.pathname === "/dashboard/profile/edit",
        },
        {
          name: "Security Settings",
          href: "/dashboard/security",
          icon: Shield,
          current: location.pathname === "/dashboard/security" &&
                  !location.pathname.includes("/login-history"),
        },
        {
          name: "Login History",
          href: "/dashboard/security/login-history",
          icon: Shield,
          current: location.pathname === "/dashboard/security/login-history",
        },
      ],
    },
    {
      name: "Support Tickets",
      icon: Ticket,
      current: location.pathname.startsWith("/dashboard/tickets"),
      children: [
        {
          name: "My Tickets",
          href: "/dashboard/tickets",
          icon: Ticket,
          current: location.pathname === "/dashboard/tickets" && 
                  !location.pathname.includes("/new") &&
                  !location.pathname.match(/\/\d+$/),
        },
        {
          name: "Create Ticket",
          href: "/dashboard/tickets/new",
          icon: Ticket,
          current: location.pathname === "/dashboard/tickets/new",
        },
      ],
    },
    {
      name: "My Orders",
      href: "/dashboard/orders",
      icon: ShoppingCart,
      current: location.pathname.startsWith("/dashboard/orders"),
    },
    {
      name: "Invoices",
      icon: FileText,
      current: location.pathname.startsWith("/dashboard/invoices"),
      children: [
        {
          name: "My Invoices",
          href: "/dashboard/invoices",
          icon: FileText,
          current: location.pathname === "/dashboard/invoices" && 
                  !location.pathname.match(/\/\d+$/),
        },
      ],
    },
    {
      name: "VPS Hosting",
      icon: Server,
      current: location.pathname.startsWith("/dashboard/vps"),
      children: [
        {
          name: "Plans",
          href: "/dashboard/vps/plans",
          icon: Package,
          current: location.pathname === "/dashboard/vps/plans",
        },
        {
          name: "My VPS",
          href: "/dashboard/vps/subscriptions",
          icon: Server,
          current: location.pathname.startsWith("/dashboard/vps/subscriptions") &&
                  !location.pathname.match(/\/plans$/) &&
                  !location.pathname.startsWith("/dashboard/vps/custom-images"),
        },
        {
          name: "Custom Images",
          href: "/dashboard/vps/custom-images",
          icon: Image,
          current: location.pathname.startsWith("/dashboard/vps/custom-images"),
        },
      ],
    },
    {
      name: "DNS Management",
      icon: Globe,
      current: location.pathname.startsWith("/dashboard/dns"),
      children: [
        {
          name: "My DNS Zones",
          href: "/dashboard/dns/zones",
          icon: Globe,
          current: location.pathname.startsWith("/dashboard/dns/zones"),
        },
      ],
    },
    {
      name: "Product Catalog",
      href: "/dashboard/catalog",
      icon: Package,
      current: location.pathname.startsWith("/dashboard/catalog"),
    },
    {
      name: "My Services",
      icon: Package,
      current: location.pathname.startsWith("/dashboard/services"),
      children: [
        {
          name: "My Services",
          href: "/dashboard/services",
          icon: Package,
          current: location.pathname === "/dashboard/services" && !location.pathname.match(/\/\d+$/),
        },
      ],
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      current: location.pathname.startsWith("/dashboard/settings"),
    },
  ];

  const toggleItem = (itemName: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const renderNavItem = (item: NavItem, index: number) => {
    const Icon = item.icon;
    const isOpen = openItems.has(item.name.toLowerCase().replace(/\s+/g, "-"));
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <Collapsible
          key={item.name}
          open={isOpen}
          onOpenChange={() => toggleItem(item.name.toLowerCase().replace(/\s+/g, "-"))}
        >
          <CollapsibleTrigger
            className={`${
              item.current
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            } group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
          >
            <div className="flex items-center">
              <Icon
                className={`${
                  item.current ? "text-blue-500" : "text-slate-400"
                } mr-3 h-5 w-5`}
              />
              {item.name}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1">
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              return (
                <Link
                  key={child.name}
                  to={child.href || "#"}
                  className={`${
                    child.current
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors ml-4`}
                >
                  <ChildIcon
                    className={`${
                      child.current ? "text-blue-500" : "text-slate-400"
                    } mr-3 h-4 w-4`}
                  />
                  {child.name}
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
        to={item.href || "#"}
        className={`${
          item.current
            ? "bg-blue-50 border-blue-500 text-blue-700"
            : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        } group flex items-center px-2 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
      >
        <Icon
          className={`${
            item.current ? "text-blue-500" : "text-slate-400"
          } mr-3 h-5 w-5`}
        />
        {item.name}
      </Link>
    );
  };

  return (
    <RoleGuard allowedRole="client" layoutName="Client Portal">
      <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-slate-900">
                  CloudManager
                </span>
                <Badge variant="secondary" className="ml-2">
                  Client Portal
                </Badge>
                {getAccountStatusBadge()}
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
                        {user?.name?.charAt(0) || "U"}
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
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">
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
                {navigation.map((item, index) => renderNavItem(item, index))}
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

export default UserDashboardLayout;

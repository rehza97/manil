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
import { AlertCircle, CheckCircle, XCircle, Mail, Inbox } from "lucide-react";
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
  HelpCircle,
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
      name: "Tableau de bord",
      href: "/admin",
      icon: LayoutDashboard,
      current: location.pathname === "/admin",
    },
    {
      name: "Aperçu système",
      href: "/admin/overview",
      icon: Activity,
      current: location.pathname.startsWith("/admin/overview"),
      sectionKey: "overview",
      children: [
        {
          name: "Aperçu",
          href: "/admin/overview",
          icon: Activity,
          current: location.pathname === "/admin/overview",
        },
        {
          name: "Santé du système",
          href: "/admin/overview/health",
          icon: Heart,
          current: location.pathname === "/admin/overview/health",
        },
        {
          name: "Métriques de performance",
          href: "/admin/overview/performance",
          icon: Gauge,
          current: location.pathname === "/admin/overview/performance",
        },
        {
          name: "Alertes système",
          href: "/admin/overview/alerts",
          icon: AlertTriangle,
          current: location.pathname === "/admin/overview/alerts",
        },
      ],
    },
    {
      name: "Gestion des utilisateurs",
      href: "/admin/users",
      icon: Users,
      current: location.pathname.startsWith("/admin/users"),
      sectionKey: "users",
      children: [
        {
          name: "Tous les utilisateurs",
          href: "/admin/users",
          icon: Users,
          current: location.pathname === "/admin/users",
        },
        {
          name: "Créer un utilisateur",
          href: "/admin/users/new",
          icon: UserPlus,
          current: location.pathname === "/admin/users/new",
        },
      ],
    },
    {
      name: "Gestion des clients",
      href: "/admin/customers",
      icon: Package,
      current: location.pathname.startsWith("/admin/customers"),
      sectionKey: "customers",
      children: [
        {
          name: "Tous les clients",
          href: "/admin/customers",
          icon: Package,
          current: location.pathname === "/admin/customers",
        },
        {
          name: "Créer un client",
          href: "/admin/customers/create",
          icon: UserPlus,
          current: location.pathname === "/admin/customers/create",
        },
      ],
    },
    {
      name: "Rôles et permissions",
      href: "/admin/roles",
      icon: Key,
      current: location.pathname.startsWith("/admin/roles"),
      sectionKey: "roles",
      children: [
        {
          name: "Tous les rôles",
          href: "/admin/roles",
          icon: Key,
          current: location.pathname === "/admin/roles",
        },
        {
          name: "Créer un rôle",
          href: "/admin/roles/new",
          icon: UserPlus,
          current: location.pathname === "/admin/roles/new",
        },
        {
          name: "Toutes les permissions",
          href: "/admin/permissions",
          icon: Lock,
          current: location.pathname === "/admin/permissions",
        },
      ],
    },
    {
      name: "Gestion des produits",
      href: "/admin/products",
      icon: Package,
      current: location.pathname.startsWith("/admin/products"),
      sectionKey: "products",
      children: [
        {
          name: "Tous les produits",
          href: "/admin/products",
          icon: Package,
          current: location.pathname === "/admin/products",
        },
        {
          name: "Catégories",
          href: "/admin/products/categories",
          icon: FolderTree,
          current: location.pathname === "/admin/products/categories",
        },
        {
          name: "Ajouter un produit",
          href: "/admin/products/new",
          icon: UserPlus,
          current: location.pathname === "/admin/products/new",
        },
      ],
    },
    {
      name: "Gestion du support",
      href: "/admin/support",
      icon: Headphones,
      current: location.pathname.startsWith("/admin/support"),
      sectionKey: "support",
      children: [
        {
          name: "Tableau de bord support",
          href: "/admin/support",
          icon: Headphones,
          current: location.pathname === "/admin/support",
        },
        {
          name: "Groupes de support",
          href: "/admin/support/groups",
          icon: Users,
          current: location.pathname === "/admin/support/groups",
        },
        {
          name: "Catégories de tickets",
          href: "/admin/support/categories",
          icon: FolderTree,
          current: location.pathname === "/admin/support/categories",
        },
        {
          name: "Règles d'automatisation",
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
          name: "Tous les tickets",
          href: "/admin/tickets",
          icon: Ticket,
          current: location.pathname === "/admin/tickets",
        },
        {
          name: "Modèles",
          href: "/admin/tickets/templates",
          icon: FileText,
          current: location.pathname.startsWith("/admin/tickets/templates"),
        },
        {
          name: "Comptes e-mail",
          href: "/admin/tickets/email-accounts",
          icon: Mail,
          current: location.pathname.startsWith("/admin/tickets/email-accounts"),
        },
      ],
    },
    {
      name: "Commandes",
      href: "/admin/orders",
      icon: ShoppingCart,
      current: location.pathname.startsWith("/admin/orders"),
      sectionKey: "orders",
      children: [
        {
          name: "Toutes les commandes",
          href: "/admin/orders",
          icon: ShoppingCart,
          current: location.pathname === "/admin/orders",
        },
        {
          name: "Créer une commande",
          href: "/admin/orders/create",
          icon: UserPlus,
          current: location.pathname === "/admin/orders/create",
        },
      ],
    },
    {
      name: "Devis",
      href: "/admin/quotes",
      icon: FilePen,
      current: location.pathname.startsWith("/admin/quotes"),
      sectionKey: "quotes",
      children: [
        {
          name: "Tous les devis",
          href: "/admin/quotes",
          icon: FilePen,
          current: location.pathname === "/admin/quotes",
        },
        {
          name: "Créer un devis",
          href: "/admin/quotes/new",
          icon: UserPlus,
          current: location.pathname === "/admin/quotes/new",
          permission: "quotes:create",
        },
      ],
    },
    {
      name: "Factures",
      href: "/admin/invoices",
      icon: Receipt,
      current: location.pathname.startsWith("/admin/invoices"),
      sectionKey: "invoices",
      children: [
        {
          name: "Toutes les factures",
          href: "/admin/invoices",
          icon: Receipt,
          current: location.pathname === "/admin/invoices",
        },
        {
          name: "Créer une facture",
          href: "/admin/invoices/create",
          icon: UserPlus,
          current: location.pathname === "/admin/invoices/create",
        },
      ],
    },
    {
      name: "Hébergement VPS",
      href: "/admin/hosting/subscriptions",
      icon: Server,
      current: location.pathname.startsWith("/admin/hosting"),
      sectionKey: "hosting",
      children: [
        {
          name: "Plans VPS",
          href: "/admin/hosting/plans",
          icon: Package,
          current: location.pathname === "/admin/hosting/plans",
        },
        {
          name: "Demandes en attente",
          href: "/admin/hosting/requests",
          icon: ClipboardList,
          current: location.pathname === "/admin/hosting/requests",
        },
        {
          name: "Tous les abonnements",
          href: "/admin/hosting/subscriptions",
          icon: Server,
          current: location.pathname === "/admin/hosting/subscriptions",
        },
        {
          name: "Surveillance",
          href: "/admin/hosting/monitoring",
          icon: Activity,
          current: location.pathname === "/admin/hosting/monitoring",
        },
        {
          name: "Images personnalisées",
          href: "/admin/hosting/custom-images",
          icon: Image,
          current: location.pathname === "/admin/hosting/custom-images",
        },
      ],
    },
    {
      name: "Gestion DNS",
      href: "/admin/dns/zones",
      icon: Globe,
      current: location.pathname.startsWith("/admin/dns"),
      sectionKey: "dns",
      children: [
        {
          name: "Toutes les zones DNS",
          href: "/admin/dns/zones",
          icon: Globe,
          current: location.pathname === "/admin/dns/zones",
        },
        {
          name: "Surveillance DNS",
          href: "/admin/dns/monitoring",
          icon: BarChart2,
          current: location.pathname === "/admin/dns/monitoring",
        },
      ],
    },
    {
      name: "Paramètres système",
      href: "/admin/settings",
      icon: Settings,
      current: location.pathname.startsWith("/admin/settings"),
      sectionKey: "settings",
      children: [
        {
          name: "Paramètres",
          href: "/admin/settings",
          icon: Settings,
          current: location.pathname === "/admin/settings",
        },
        {
          name: "Général",
          href: "/admin/settings/general",
          icon: Settings,
          current: location.pathname === "/admin/settings/general",
        },
        {
          name: "Sécurité",
          href: "/admin/settings/security",
          icon: ShieldCheck,
          current: location.pathname === "/admin/settings/security",
        },
        {
          name: "Config. e-mail",
          href: "/admin/settings/email",
          icon: Mail,
          current: location.pathname === "/admin/settings/email",
        },
        {
          name: "Config. SMS",
          href: "/admin/settings/sms",
          icon: MessageSquare,
          current: location.pathname === "/admin/settings/sms",
        },
        {
          name: "File SMS",
          href: "/admin/settings/sms-queue",
          icon: Inbox,
          current: location.pathname === "/admin/settings/sms-queue",
        },
        {
          name: "Notifications",
          href: "/admin/settings/notifications",
          icon: Bell,
          current: location.pathname === "/admin/settings/notifications",
        },
        {
          name: "Config. stockage",
          href: "/admin/settings/storage",
          icon: HardDrive,
          current: location.pathname === "/admin/settings/storage",
        },
        {
          name: "Paramètres de sauvegarde",
          href: "/admin/settings/backup",
          icon: Archive,
          current: location.pathname === "/admin/settings/backup",
        },
      ],
    },
    {
      name: "Activité et journaux",
      href: "/admin/logs",
      icon: Database,
      current: location.pathname.startsWith("/admin/logs"),
      sectionKey: "logs",
      children: [
        {
          name: "Journaux d'activité",
          href: "/admin/logs",
          icon: Activity,
          current: location.pathname === "/admin/logs",
        },
        {
          name: "Journaux d'audit",
          href: "/admin/logs/audit",
          icon: FileCheck,
          current: location.pathname === "/admin/logs/audit",
        },
        {
          name: "Journaux de sécurité",
          href: "/admin/logs/security",
          icon: ShieldCheck,
          current: location.pathname === "/admin/logs/security",
        },
        {
          name: "Journaux système",
          href: "/admin/logs/system",
          icon: Database,
          current: location.pathname === "/admin/logs/system",
        },
      ],
    },
    {
      name: "Rapports",
      href: "/admin/reports",
      icon: BarChart3,
      current: location.pathname.startsWith("/admin/reports"),
      sectionKey: "reports",
      children: [
        {
          name: "Tableau de bord rapports",
          href: "/admin/reports",
          icon: BarChart3,
          current: location.pathname === "/admin/reports",
        },
        {
          name: "Rapports utilisateurs",
          href: "/admin/reports/users",
          icon: User,
          current: location.pathname === "/admin/reports/users",
        },
        {
          name: "Rapports d'activité",
          href: "/admin/reports/activity",
          icon: Activity,
          current: location.pathname === "/admin/reports/activity",
        },
        {
          name: "Rapports de sécurité",
          href: "/admin/reports/security",
          icon: ShieldCheck,
          current: location.pathname === "/admin/reports/security",
        },
        {
          name: "Rapports de performance",
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
          name: "Tableau de bord maintenance",
          href: "/admin/maintenance",
          icon: Wrench,
          current: location.pathname === "/admin/maintenance",
        },
        {
          name: "Gestion des sauvegardes",
          href: "/admin/maintenance/backup",
          icon: Archive,
          current: location.pathname === "/admin/maintenance/backup",
        },
        {
          name: "Gestion du cache",
          href: "/admin/maintenance/cache",
          icon: Database,
          current: location.pathname === "/admin/maintenance/cache",
        },
        {
          name: "Nettoyage des données",
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
      name: "Profil et sécurité",
      href: "/admin/profile",
      icon: User,
      current: location.pathname.startsWith("/admin/profile") || location.pathname.startsWith("/admin/security"),
      sectionKey: "profile",
      children: [
        {
          name: "Profil",
          href: "/admin/profile",
          icon: User,
          current: location.pathname === "/admin/profile",
        },
        {
          name: "Modifier le profil",
          href: "/admin/profile/edit",
          icon: UserCog,
          current: location.pathname === "/admin/profile/edit",
        },
        {
          name: "Sécurité",
          href: "/admin/security",
          icon: Shield,
          current: location.pathname === "/admin/security",
        },
        {
          name: "Historique de connexion",
          href: "/admin/security/login-history",
          icon: Clock,
          current: location.pathname === "/admin/security/login-history",
        },
      ],
    },
    {
      name: "Centre d'aide",
      href: "/faq",
      icon: HelpCircle,
      current: location.pathname === "/faq",
    },
  ];

  const filteredNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <RoleGuard allowedRole="admin" layoutName="Portail admin">
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
                  Portail admin
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
                        Administrateur
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem asChild className="bg-white hover:bg-gray-50">
                    <Link to="/admin/profile" className="text-gray-900">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="bg-white hover:bg-gray-50">
                    <Link to="/admin/settings" className="text-gray-900">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Paramètres</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem 
                    className="bg-white hover:bg-gray-50 text-gray-900"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Déconnexion…" : "Déconnexion"}</span>
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

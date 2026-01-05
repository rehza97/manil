/**
 * Comprehensive Route Configuration
 *
 * Defines all routes for the CloudManager application based on:
 * - DEVELOPMENT_PROGRESS.md modules
 * - cloudmanager_pricing.html features
 * - Role-based access control (RBAC)
 *
 * @module app/routes
 */

import {
  LandingPage,
  PricingPage,
  FeaturesPage,
  AboutPage,
  ContactPage,
  HostingPage,
  VPSPage
} from "@/modules/landing";
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  TwoFactorSetupPage,
  ProtectedRoute,
  RoleBasedRedirect,
} from "@/modules/auth";
import {
  UserDashboardLayout,
  CorporateDashboardLayout,
  AdminDashboardLayout,
} from "@/layouts";
import {
  UserDashboardPage,
  CorporateDashboardPage,
  AdminDashboardPage,
  ProfilePage,
  ProfileEditPage,
  SecurityPage,
  LoginHistoryPage,
  ServicesListPage,
  ServiceDetailPage,
  SettingsPage,
  NotificationSettingsPage,
} from "@/modules/dashboard";
import {
  UserManagementPage,
  CustomerManagementPage,
  AuditLogsPage,
  ActivityLogsPage,
  SystemOverviewPage,
  SystemSettingsPage,
  RoleManagementPage,
  ReportsPage,
  SecurityLogsPage,
  TicketsPage,
  GeneralSettingsPage,
  SecuritySettingsPage,
  EmailConfigPage,
  SMSConfigPage,
  StorageConfigPage,
  BackupSettingsPage,
} from "@/modules/admin";
import {
  SystemHealthPage,
  PerformanceMetricsPage,
  SystemAlertsPage,
} from "@/modules/admin/pages/overview";
import {
  UserReportsPage,
  ActivityReportsPage,
  SecurityReportsPage,
  PerformanceReportsPage,
} from "@/modules/admin/pages/reports";
import {
  SystemLogsPage,
  UserActivityLogsPage,
} from "@/modules/admin/pages/logs";
import {
  CustomerDetailsPage,
  CustomerKYCPage,
  CustomerCreatePage,
  CustomerEditPage,
} from "@/modules/admin/pages/customers";
import {
  SupportDashboardPage,
  SupportGroupsPage,
  TicketCategoriesPage,
  AutomationRulesPage,
} from "@/modules/admin/pages/support";
import {
  MaintenanceDashboardPage,
  BackupManagementPage,
  CacheManagementPage,
  DataCleanupPage,
  MigrationsPage,
} from "@/modules/admin/pages/maintenance";
import {
  ProductListPage,
  ProductFormPage,
  CategoryManagementPage,
} from "@/modules/admin/pages/products";
import {
  UserCreatePage,
  UserDetailsPage,
  UserEditPage,
  UserRolesPage,
  UserSessionsPage,
  UserActivityPage,
} from "@/modules/admin/pages/users";
import {
  RoleCreatePage,
  RoleDetailsPage,
  RoleEditPage,
  RolePermissionsPage,
  PermissionListPage,
} from "@/modules/admin/pages/roles";
import {
  TicketListPage,
  TicketDetailPage,
  TicketCreatePage,
  TemplateListPage,
  TemplateCreatePage,
  TemplateEditPage,
  TemplateDetailPage,
} from "@/modules/tickets/pages";
import {
  OrdersListPage,
  OrderDetailPage,
  OrderCreatePage,
  OrderEditPage,
  OrderStatusPage,
} from "@/modules/orders/pages";
import {
  InvoiceListPage,
  InvoiceCreatePage,
  InvoiceDetailPage,
  InvoiceEditPage,
} from "@/modules/invoices/pages";
import {
  CataloguePage,
  ProductPage,
  QuoteRequestPage,
} from "@/modules/products/pages";
import {
  VPSPlansPage,
  MyVPSPage,
  VPSInstancePage,
  CustomImagesPage,
  CustomImageDetailPage,
  ImageUploadPage,
} from "@/modules/hosting/pages";
import {
  PendingVPSRequestsPage,
  AllVPSSubscriptionsPage,
  AdminVPSSubscriptionDetailPage,
  VPSMonitoringPage,
  AdminCustomImagesPage,
  VPSPlansAdminPage,
} from "@/modules/admin/pages/hosting";
import {
  MyDNSZonesPage,
  DNSZoneDetailPage,
} from "@/modules/dns/pages/client";
import {
  AllDNSZonesPage,
  DNSMonitoringPage,
  DNSTemplatesPage,
} from "@/modules/dns/pages/admin";
import {
  CustomerDNSZonesPage,
  DNSOverviewPage,
} from "@/modules/dns/pages/corporate";

// Placeholder components for modules not yet implemented
const ModulePlaceholder = ({ module }: { module: string }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {module} Module
        </h2>
        <p className="text-slate-600">This module is under development</p>
      </div>
    </div>
  );
};

/**
 * Route configuration for the entire application
 * Organized by dashboard type and module access
 */
export const routes = [
  // Public Routes
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/pricing",
    element: <PricingPage />,
  },
  {
    path: "/features",
    element: <FeaturesPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
  {
    path: "/contact",
    element: <ContactPage />,
  },
  {
    path: "/hosting",
    element: <HostingPage />,
  },
  {
    path: "/vps",
    element: <VPSPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/setup-2fa",
    element: <TwoFactorSetupPage />,
  },
  {
    path: "/redirect",
    element: <RoleBasedRedirect />,
  },

  // Client Dashboard Routes (/dashboard)
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requiredRole="client">
        <UserDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <UserDashboardPage />,
      },
      // Profile & Security
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "profile/edit",
        element: <ProfileEditPage />,
      },
      {
        path: "security",
        element: <SecurityPage />,
      },
      {
        path: "security/login-history",
        element: <LoginHistoryPage />,
      },
      // Services
      {
        path: "services",
        element: <ServicesListPage />,
      },
      {
        path: "services/:id",
        element: <ServiceDetailPage />,
      },
      // Support Tickets
      {
        path: "tickets",
        element: <TicketListPage />,
      },
      {
        path: "tickets/new",
        element: <TicketCreatePage />,
      },
      {
        path: "tickets/:id",
        element: <TicketDetailPage />,
      },
      // Product Catalog
      {
        path: "catalog",
        element: <CataloguePage />,
      },
      {
        path: "catalog/:id",
        element: <ProductPage />,
      },
      {
        path: "catalog/quote-request",
        element: <QuoteRequestPage />,
      },
      // Orders
      {
        path: "orders",
        element: <OrdersListPage />,
      },
      {
        path: "orders/:orderId",
        element: <OrderDetailPage />,
      },
      {
        path: "orders/create",
        element: <OrderCreatePage />,
      },
      {
        path: "orders/:orderId/edit",
        element: <OrderEditPage />,
      },
      {
        path: "orders/:orderId/status",
        element: <OrderStatusPage />,
      },
      // Invoices
      {
        path: "invoices",
        element: <InvoiceListPage />,
      },
      {
        path: "invoices/create",
        element: <InvoiceCreatePage />,
      },
      {
        path: "invoices/:id",
        element: <InvoiceDetailPage />,
      },
      {
        path: "invoices/:id/edit",
        element: <InvoiceEditPage />,
      },
      // VPS Hosting
      {
        path: "vps/plans",
        element: <VPSPlansPage />,
      },
      {
        path: "vps/subscriptions",
        element: <MyVPSPage />,
      },
      {
        path: "vps/subscriptions/:id",
        element: <VPSInstancePage />,
      },
      {
        path: "vps/custom-images",
        element: <CustomImagesPage />,
      },
      {
        path: "vps/custom-images/upload",
        element: <ImageUploadPage />,
      },
      {
        path: "vps/custom-images/:imageId",
        element: <CustomImageDetailPage />,
      },
      // DNS Management
      {
        path: "dns/zones",
        element: <MyDNSZonesPage />,
      },
      {
        path: "dns/zones/:zoneId",
        element: <DNSZoneDetailPage />,
      },
      // Settings
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "settings/notifications",
        element: <NotificationSettingsPage />,
      },
    ],
  },

  // Corporate Dashboard Routes (/corporate)
  {
    path: "/corporate",
    element: (
      <ProtectedRoute requiredRole="corporate">
        <CorporateDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CorporateDashboardPage />,
      },
      // Profile & Security
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "profile/edit",
        element: <ProfileEditPage />,
      },
      {
        path: "security",
        element: <SecurityPage />,
      },
      {
        path: "security/login-history",
        element: <LoginHistoryPage />,
      },
      // Customer Management
      {
        path: "customers",
        element: <ModulePlaceholder module="Customer Management" />,
      },
      {
        path: "customers/new",
        element: <ModulePlaceholder module="Add Customer" />,
      },
      {
        path: "customers/:id",
        element: <ModulePlaceholder module="Customer Details" />,
      },
      {
        path: "customers/:id/edit",
        element: <ModulePlaceholder module="Edit Customer" />,
      },
      {
        path: "customers/:id/kyc",
        element: <ModulePlaceholder module="KYC Validation" />,
      },
      {
        path: "customers/:id/notes",
        element: <ModulePlaceholder module="Customer Notes" />,
      },
      {
        path: "customers/:id/documents",
        element: <ModulePlaceholder module="Customer Documents" />,
      },
      // Support Tickets Management
      {
        path: "tickets",
        element: <ModulePlaceholder module="Support Tickets" />,
      },
      {
        path: "tickets/:id",
        element: <ModulePlaceholder module="Ticket Management" />,
      },
      {
        path: "tickets/:id/assign",
        element: <ModulePlaceholder module="Assign Ticket" />,
      },
      {
        path: "tickets/:id/transfer",
        element: <ModulePlaceholder module="Transfer Ticket" />,
      },
      {
        path: "tickets/categories",
        element: <ModulePlaceholder module="Ticket Categories" />,
      },
      {
        path: "tickets/templates",
        element: <ModulePlaceholder module="Response Templates" />,
      },
      // Product & Service Management
      {
        path: "products",
        element: <ModulePlaceholder module="Product Management" />,
      },
      {
        path: "products/new",
        element: <ModulePlaceholder module="Add Product" />,
      },
      {
        path: "products/:id",
        element: <ModulePlaceholder module="Product Details" />,
      },
      {
        path: "products/:id/edit",
        element: <ModulePlaceholder module="Edit Product" />,
      },
      {
        path: "products/categories",
        element: <ModulePlaceholder module="Product Categories" />,
      },
      // Order Management
      {
        path: "orders",
        element: <OrdersListPage />,
      },
      {
        path: "orders/create",
        element: <OrderCreatePage />,
      },
      {
        path: "orders/:orderId",
        element: <OrderDetailPage />,
      },
      {
        path: "orders/:orderId/edit",
        element: <OrderEditPage />,
      },
      {
        path: "orders/:orderId/status",
        element: <OrderStatusPage />,
      },
      // Quote Management
      {
        path: "quotes",
        element: <ModulePlaceholder module="Quote Management" />,
      },
      {
        path: "quotes/new",
        element: <ModulePlaceholder module="Create Quote" />,
      },
      {
        path: "quotes/:id",
        element: <ModulePlaceholder module="Quote Details" />,
      },
      {
        path: "quotes/:id/approve",
        element: <ModulePlaceholder module="Approve Quote" />,
      },
      {
        path: "quotes/:id/convert",
        element: <ModulePlaceholder module="Convert to Order" />,
      },
      // Invoice Management
      {
        path: "invoices",
        element: <ModulePlaceholder module="Invoice Management" />,
      },
      {
        path: "invoices/new",
        element: <ModulePlaceholder module="Create Invoice" />,
      },
      {
        path: "invoices/:id",
        element: <ModulePlaceholder module="Invoice Details" />,
      },
      {
        path: "invoices/:id/send",
        element: <ModulePlaceholder module="Send Invoice" />,
      },
      {
        path: "invoices/:id/payment",
        element: <ModulePlaceholder module="Record Payment" />,
      },
      // Business Reports
      {
        path: "reports",
        element: <ModulePlaceholder module="Business Reports" />,
      },
      {
        path: "reports/customers",
        element: <ModulePlaceholder module="Customer Reports" />,
      },
      {
        path: "reports/tickets",
        element: <ModulePlaceholder module="Ticket Reports" />,
      },
      {
        path: "reports/orders",
        element: <ModulePlaceholder module="Order Reports" />,
      },
      {
        path: "reports/revenue",
        element: <ModulePlaceholder module="Revenue Reports" />,
      },
      // VPS Management
      {
        path: "hosting/requests",
        element: <PendingVPSRequestsPage />,
      },
      {
        path: "hosting/subscriptions",
        element: <AllVPSSubscriptionsPage />,
      },
      {
        path: "hosting/subscriptions/:id",
        element: <AdminVPSSubscriptionDetailPage />,
      },
      {
        path: "hosting/monitoring",
        element: <VPSMonitoringPage />,
      },
      {
        path: "hosting/custom-images",
        element: <AdminCustomImagesPage />,
      },
      {
        path: "hosting/plans",
        element: <VPSPlansAdminPage />,
      },
      // DNS Management
      {
        path: "dns/zones",
        element: <CustomerDNSZonesPage />,
      },
      {
        path: "dns/overview",
        element: <DNSOverviewPage />,
      },
      // Corporate Settings
      {
        path: "settings",
        element: <GeneralSettingsPage />,
      },
      {
        path: "settings/general",
        element: <GeneralSettingsPage />,
      },
      {
        path: "settings/roles",
        element: <RoleManagementPage />,
      },
      {
        path: "settings/users",
        element: <UserManagementPage />,
      },
      {
        path: "settings/system",
        element: <SystemSettingsPage />,
      },
      {
        path: "settings/permissions",
        element: <PermissionListPage />,
      },
      {
        path: "settings/notifications",
        element: <ModulePlaceholder module="Notification Settings" />,
      },
      {
        path: "settings/automation",
        element: <ModulePlaceholder module="Automation Rules" />,
      },
      {
        path: "settings/templates",
        element: <ModulePlaceholder module="Email Templates" />,
      },
    ],
  },

  // Admin Dashboard Routes (/admin)
  {
    path: "/admin",
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      // Profile & Security
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "profile/edit",
        element: <ProfileEditPage />,
      },
      {
        path: "security",
        element: <SecurityPage />,
      },
      {
        path: "security/login-history",
        element: <LoginHistoryPage />,
      },
      // System Overview
      {
        path: "overview",
        element: <SystemOverviewPage />,
      },
      {
        path: "overview/health",
        element: <SystemHealthPage />,
      },
      {
        path: "overview/performance",
        element: <PerformanceMetricsPage />,
      },
      {
        path: "overview/alerts",
        element: <SystemAlertsPage />,
      },
      // User Management
      {
        path: "users",
        element: <UserManagementPage />,
      },
      {
        path: "users/new",
        element: <UserCreatePage />,
      },
      {
        path: "users/:id",
        element: <UserDetailsPage />,
      },
      {
        path: "users/:id/edit",
        element: <UserEditPage />,
      },
      {
        path: "users/:id/roles",
        element: <UserRolesPage />,
      },
      {
        path: "users/:id/sessions",
        element: <UserSessionsPage />,
      },
      {
        path: "users/:id/activity",
        element: <UserActivityPage />,
      },
      // Role & Permission Management
      {
        path: "roles",
        element: <RoleManagementPage />,
      },
      {
        path: "roles/new",
        element: <RoleCreatePage />,
      },
      {
        path: "roles/:id",
        element: <RoleDetailsPage />,
      },
      {
        path: "roles/:id/edit",
        element: <RoleEditPage />,
      },
      {
        path: "roles/:id/permissions",
        element: <RolePermissionsPage />,
      },
      {
        path: "permissions",
        element: <PermissionListPage />,
      },
      // Product Management
      {
        path: "products",
        element: <ProductListPage />,
      },
      {
        path: "products/new",
        element: <ProductFormPage />,
      },
      {
        path: "products/:productId/edit",
        element: <ProductFormPage />,
      },
      {
        path: "products/categories",
        element: <CategoryManagementPage />,
      },
      // System Settings
      {
        path: "settings",
        element: <SystemSettingsPage />,
      },
      {
        path: "settings/general",
        element: <GeneralSettingsPage />,
      },
      {
        path: "settings/security",
        element: <SecuritySettingsPage />,
      },
      {
        path: "settings/email",
        element: <EmailConfigPage />,
      },
      {
        path: "settings/sms",
        element: <SMSConfigPage />,
      },
      {
        path: "settings/storage",
        element: <StorageConfigPage />,
      },
      {
        path: "settings/backup",
        element: <BackupSettingsPage />,
      },
      // Activity & Audit Logs
      {
        path: "logs",
        element: <ActivityLogsPage />,
      },
      {
        path: "logs/audit",
        element: <AuditLogsPage />,
      },
      {
        path: "logs/security",
        element: <SecurityLogsPage />,
      },
      {
        path: "logs/system",
        element: <SystemLogsPage />,
      },
      {
        path: "logs/users/:id",
        element: <UserActivityLogsPage />,
      },
      // Customer Management (Admin)
      {
        path: "customers",
        element: <CustomerManagementPage />,
      },
      {
        path: "customers/create",
        element: <CustomerCreatePage />,
      },
      {
        path: "customers/:id",
        element: <CustomerDetailsPage />,
      },
      {
        path: "customers/:id/edit",
        element: <CustomerEditPage />,
      },
      {
        path: "customers/:id/kyc",
        element: <CustomerKYCPage />,
      },
      // System Reports
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "reports/users",
        element: <UserReportsPage />,
      },
      {
        path: "reports/activity",
        element: <ActivityReportsPage />,
      },
      {
        path: "reports/security",
        element: <SecurityReportsPage />,
      },
      {
        path: "reports/performance",
        element: <PerformanceReportsPage />,
      },
      // Support Groups & Categories
      // Support Management
      {
        path: "support",
        element: <SupportDashboardPage />,
      },
      {
        path: "support/groups",
        element: <SupportGroupsPage />,
      },
      {
        path: "support/categories",
        element: <TicketCategoriesPage />,
      },
      {
        path: "support/automation",
        element: <AutomationRulesPage />,
      },
      // Tickets Management
      {
        path: "tickets",
        element: <TicketsPage />,
      },
      {
        path: "tickets/:id",
        element: <TicketDetailPage backPath="/admin/tickets" />,
      },
      // Ticket Templates
      {
        path: "tickets/templates",
        element: <TemplateListPage />,
      },
      {
        path: "tickets/templates/create",
        element: <TemplateCreatePage />,
      },
      {
        path: "tickets/templates/:id",
        element: <TemplateDetailPage />,
      },
      {
        path: "tickets/templates/:id/edit",
        element: <TemplateEditPage />,
      },
      // System Maintenance
      {
        path: "maintenance",
        element: <MaintenanceDashboardPage />,
      },
      {
        path: "maintenance/backup",
        element: <BackupManagementPage />,
      },
      {
        path: "maintenance/cache",
        element: <CacheManagementPage />,
      },
      {
        path: "maintenance/cleanup",
        element: <DataCleanupPage />,
      },
      {
        path: "maintenance/migrations",
        element: <MigrationsPage />,
      },
      // VPS Hosting Management
      {
        path: "hosting/requests",
        element: <PendingVPSRequestsPage />,
      },
      {
        path: "hosting/subscriptions",
        element: <AllVPSSubscriptionsPage />,
      },
      {
        path: "hosting/subscriptions/:id",
        element: <AdminVPSSubscriptionDetailPage />,
      },
      {
        path: "hosting/monitoring",
        element: <VPSMonitoringPage />,
      },
      {
        path: "hosting/custom-images",
        element: <AdminCustomImagesPage />,
      },
      {
        path: "hosting/plans",
        element: <VPSPlansAdminPage />,
      },
      // DNS Management
      {
        path: "dns/zones",
        element: <AllDNSZonesPage />,
      },
      {
        path: "dns/monitoring",
        element: <DNSMonitoringPage />,
      },
      {
        path: "dns/templates",
        element: <DNSTemplatesPage />,
      },
    ],
  },

  // Error Routes
  {
    path: "/unauthorized",
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600">
            You don't have permission to access this resource.
          </p>
        </div>
      </div>
    ),
  },
  {
    path: "/account-disabled",
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-600 mb-2">
            Account Disabled
          </h1>
          <p className="text-slate-600">
            Your account has been disabled. Please contact support.
          </p>
        </div>
      </div>
    ),
  },
  {
    path: "*",
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-slate-600">
            The page you're looking for doesn't exist.
          </p>
        </div>
      </div>
    ),
  },
];

/**
 * Route permissions mapping
 * Defines which roles can access which routes
 */
export const routePermissions = {
  // Client routes
  "/dashboard": ["client"],
  "/dashboard/profile": ["client"],
  "/dashboard/services": ["client"],
  "/dashboard/tickets": ["client"],
  "/dashboard/catalog": ["client"],
  "/dashboard/orders": ["client"],
  "/dashboard/orders/create": ["client"],
  "/dashboard/orders/:orderId": ["client"],
  "/dashboard/orders/:orderId/edit": ["client"],
  "/dashboard/orders/:orderId/status": ["client"],
  "/dashboard/invoices": ["client"],
  "/dashboard/vps/plans": ["client"],
  "/dashboard/vps/subscriptions": ["client"],
  "/dashboard/vps/subscriptions/:id": ["client"],
  "/dashboard/vps/custom-images": ["client"],
  "/dashboard/vps/custom-images/upload": ["client"],
  "/dashboard/vps/custom-images/:imageId": ["client"],
  "/dashboard/settings": ["client"],

  // Corporate routes
  "/corporate": ["corporate", "admin"],
  "/corporate/customers": ["corporate", "admin"],
  "/corporate/tickets": ["corporate", "admin"],
  "/corporate/products": ["corporate", "admin"],
  "/corporate/orders": ["corporate", "admin"],
  "/corporate/orders/create": ["corporate", "admin"],
  "/corporate/orders/:orderId": ["corporate", "admin"],
  "/corporate/orders/:orderId/edit": ["corporate", "admin"],
  "/corporate/orders/:orderId/status": ["corporate", "admin"],
  "/corporate/quotes": ["corporate", "admin"],
  "/corporate/invoices": ["corporate", "admin"],
  "/corporate/reports": ["corporate", "admin"],
  "/corporate/hosting/requests": ["corporate", "admin"],
  "/corporate/hosting/subscriptions": ["corporate", "admin"],
  "/corporate/hosting/monitoring": ["corporate", "admin"],
  "/corporate/settings": ["corporate", "admin"],
  "/corporate/settings/general": ["corporate", "admin"],
  "/corporate/settings/roles": ["corporate", "admin"],
  "/corporate/settings/users": ["corporate", "admin"],
  "/corporate/settings/system": ["corporate", "admin"],
  "/corporate/settings/permissions": ["corporate", "admin"],

  // Admin routes
  "/admin": ["admin"],
  "/admin/overview": ["admin"],
  "/admin/users": ["admin"],
  "/admin/roles": ["admin"],
  "/admin/settings": ["admin"],
  "/admin/logs": ["admin"],
  "/admin/reports": ["admin"],
  "/admin/support": ["admin"],
  "/admin/tickets": ["admin"],
  "/admin/tickets/:id": ["admin"],
  "/admin/tickets/templates": ["admin"],
  "/admin/tickets/templates/create": ["admin"],
  "/admin/tickets/templates/:id": ["admin"],
  "/admin/tickets/templates/:id/edit": ["admin"],
  "/admin/maintenance": ["admin"],
} as const;

/**
 * Module-based route groups
 * Organized by the modules defined in DEVELOPMENT_PROGRESS.md
 */
export const moduleRoutes = {
  // Module 0: Infrastructure & Foundation
  auth: [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/setup-2fa",
    "/redirect",
  ],

  // Module 1: Customer Manager
  customers: [
    "/corporate/customers",
    "/corporate/customers/new",
    "/corporate/customers/:id",
    "/corporate/customers/:id/edit",
    "/corporate/customers/:id/kyc",
    "/corporate/customers/:id/notes",
    "/corporate/customers/:id/documents",
  ],

  // Module 2: Ticket Manager
  tickets: [
    "/dashboard/tickets",
    "/dashboard/tickets/new",
    "/dashboard/tickets/:id",
    "/dashboard/tickets/:id/reply",
    "/corporate/tickets",
    "/corporate/tickets/:id",
    "/corporate/tickets/:id/assign",
    "/corporate/tickets/:id/transfer",
    "/corporate/tickets/categories",
    "/corporate/tickets/templates",
    "/admin/support",
    "/admin/support/groups",
    "/admin/support/categories",
    "/admin/support/automation",
    "/admin/tickets/templates",
    "/admin/tickets/templates/create",
    "/admin/tickets/templates/:id",
    "/admin/tickets/templates/:id/edit",
  ],

  // Module 3: Product Catalogue
  products: [
    "/dashboard/catalog",
    "/dashboard/catalog/:id",
    "/dashboard/catalog/quote-request",
    "/corporate/products",
    "/corporate/products/new",
    "/corporate/products/:id",
    "/corporate/products/:id/edit",
    "/corporate/products/categories",
  ],

  // Module 4: Order Manager
  orders: [
    "/dashboard/orders",
    "/dashboard/orders/:orderId",
    "/dashboard/orders/create",
    "/dashboard/orders/:orderId/edit",
    "/dashboard/orders/:orderId/status",
    "/corporate/orders",
    "/corporate/orders/create",
    "/corporate/orders/:orderId",
    "/corporate/orders/:orderId/edit",
    "/corporate/orders/:orderId/status",
  ],

  // Module 5: Reporting
  reporting: [
    "/corporate/reports",
    "/corporate/reports/customers",
    "/corporate/reports/tickets",
    "/corporate/reports/orders",
    "/corporate/reports/revenue",
    "/admin/reports",
    "/admin/reports/users",
    "/admin/reports/activity",
    "/admin/reports/security",
    "/admin/reports/performance",
  ],

  // Module 6: Invoice Manager
  invoices: [
    "/dashboard/invoices",
    "/dashboard/invoices/:id",
    "/corporate/quotes",
    "/corporate/quotes/new",
    "/corporate/quotes/:id",
    "/corporate/quotes/:id/approve",
    "/corporate/quotes/:id/convert",
    "/corporate/invoices",
    "/corporate/invoices/new",
    "/corporate/invoices/:id",
    "/corporate/invoices/:id/send",
    "/corporate/invoices/:id/payment",
  ],

  // Module 7: Settings & Configuration
  settings: [
    "/dashboard/settings",
    "/dashboard/settings/notifications",
    "/corporate/settings",
    "/corporate/settings/notifications",
    "/corporate/settings/automation",
    "/corporate/settings/templates",
    "/admin/settings",
    "/admin/settings/general",
    "/admin/settings/security",
    "/admin/settings/email",
    "/admin/settings/sms",
    "/admin/settings/storage",
    "/admin/settings/backup",
  ],

  // Module 8: VPS Hosting
  hosting: [
    "/dashboard/vps/plans",
    "/dashboard/vps/subscriptions",
    "/dashboard/vps/subscriptions/:id",
    "/dashboard/vps/custom-images",
    "/dashboard/vps/custom-images/upload",
    "/dashboard/vps/custom-images/:imageId",
    "/corporate/hosting/requests",
    "/corporate/hosting/subscriptions",
    "/corporate/hosting/monitoring",
    "/corporate/hosting/custom-images",
  ],
} as const;

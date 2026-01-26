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
  NotificationsPage,
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
import { RevenueDashboardPage as AdminRevenueDashboardPage } from "@/modules/revenue/pages/RevenueDashboardPage";
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
  EmailTemplatesPage,
  EmailSendHistoryPage,
  EmailBouncesPage,
  TicketSettingsPage,
  NotificationGroupsPage,
} from "@/modules/admin/pages/settings";
import {
  ProductListPage as AdminProductListPage,
  ProductFormPage as AdminProductFormPage,
  CategoryManagementPage as AdminCategoryManagementPage,
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
  TicketListPage as AdminTicketListPage,
  TicketDetailPage as AdminTicketDetailPage,
  TicketCreatePage,
  TemplateListPage as AdminTemplateListPage,
  TemplateCreatePage,
  TemplateEditPage,
  TemplateDetailPage,
  EmailAccountsPage,
} from "@/modules/tickets/pages";
import {
  OrdersListPage,
  OrderDetailPage,
  OrderCreatePage,
  OrderEditPage,
  OrderStatusPage,
} from "@/modules/orders/pages";
import { OrderCreateRedirect } from "@/modules/orders/components/OrderCreateRedirect";
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
  DNSZoneDetailPage as AdminDNSZoneDetailPage,
} from "@/modules/dns/pages/admin";
import {
  CustomerDNSZonesPage,
  DNSOverviewPage,
} from "@/modules/dns/pages/corporate";
import {
  CorporateReportsLandingPage,
  CustomerReportsPage,
  TicketReportsPage,
  OrderReportsPage,
} from "@/modules/reports/pages";
import { RevenueDashboardPage } from "@/modules/revenue/pages/RevenueDashboardPage";
import {
  CustomerListPage as CorporateCustomerListPage,
  CustomerCreatePage as CorporateCustomerCreatePage,
  CustomerDetailsPage as CorporateCustomerDetailsPage,
  CustomerEditPage as CorporateCustomerEditPage,
  CustomerKYCPage as CorporateCustomerKYCPage,
  CustomerNotesPage as CorporateCustomerNotesPage,
  CustomerDocumentsPage as CorporateCustomerDocumentsPage,
  TicketListPage as CorporateTicketListPage,
  TicketDetailPage as CorporateTicketDetailPage,
  TicketAssignPage as CorporateTicketAssignPage,
  TicketTransferPage as CorporateTicketTransferPage,
  TicketCategoriesPage as CorporateTicketCategoriesPage,
  TemplateListPage as CorporateTemplateListPage,
  ProductListPage as CorporateProductListPage,
  ProductFormPage as CorporateProductFormPage,
  CategoryManagementPage as CorporateCategoryManagementPage,
  QuoteListPage as CorporateQuoteListPage,
  QuoteCreatePage as CorporateQuoteCreatePage,
  QuoteDetailPage as CorporateQuoteDetailPage,
  QuoteApprovePage as CorporateQuoteApprovePage,
  QuoteConvertPage as CorporateQuoteConvertPage,
  InvoiceListPage as CorporateInvoiceListPage,
  InvoiceCreatePage as CorporateInvoiceCreatePage,
  InvoiceDetailPage as CorporateInvoiceDetailPage,
  InvoiceEditPage as CorporateInvoiceEditPage,
  InvoiceSendPage as CorporateInvoiceSendPage,
  InvoicePaymentPage as CorporateInvoicePaymentPage,
  CorporateAutomationRestrictedPage,
} from "@/modules/corporate/pages";
import {
  UnauthorizedPage,
  AccountDisabledPage,
  NotFoundPage,
} from "@/modules/error/pages";

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
  // Order create redirect (handles /orders/create)
  {
    path: "/orders/create",
    element: <OrderCreateRedirect />,
  },
  // Public Product Detail Route
  {
    path: "/products/:id",
    element: <ProductPage />,
  },
  // Public Catalog Routes (unauthenticated browsing)
  {
    path: "/catalog",
    element: <CataloguePage />,
  },
  {
    path: "/catalog/quote-request",
    element: <QuoteRequestPage />,
  },
  {
    path: "/catalog/:id",
    element: <ProductPage />,
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
        element: <AdminTicketListPage />,
      },
      {
        path: "tickets/new",
        element: <TicketCreatePage />,
      },
      {
        path: "tickets/:id",
        element: <AdminTicketDetailPage />,
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
      {
        path: "orders/:orderId",
        element: <OrderDetailPage />,
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
      {
        path: "notifications",
        element: <NotificationsPage />,
      },
    ],
  },

  // Corporate Dashboard Routes (/corporate)
  {
    path: "/corporate",
    element: (
      <ProtectedRoute requiredRole={["corporate", "admin"]}>
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
        element: <CorporateCustomerListPage />,
      },
      {
        path: "customers/new",
        element: <CorporateCustomerCreatePage />,
      },
      {
        path: "customers/:id",
        element: <CorporateCustomerDetailsPage />,
      },
      {
        path: "customers/:id/edit",
        element: <CorporateCustomerEditPage />,
      },
      {
        path: "customers/:id/kyc",
        element: <CorporateCustomerKYCPage />,
      },
      {
        path: "customers/:id/notes",
        element: <CorporateCustomerNotesPage />,
      },
      {
        path: "customers/:id/documents",
        element: <CorporateCustomerDocumentsPage />,
      },
      // Support Tickets Management
      {
        path: "tickets",
        element: <CorporateTicketListPage />,
      },
      {
        path: "tickets/:id",
        element: <CorporateTicketDetailPage backPath="/corporate/tickets" />,
      },
      {
        path: "tickets/:id/assign",
        element: <CorporateTicketAssignPage />,
      },
      {
        path: "tickets/:id/transfer",
        element: <CorporateTicketTransferPage />,
      },
      {
        path: "tickets/categories",
        element: <CorporateTicketCategoriesPage />,
      },
      {
        path: "tickets/templates",
        element: <CorporateTemplateListPage />,
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
      // Product & Service Management
      {
        path: "products",
        element: <CorporateProductListPage />,
      },
      {
        path: "products/new",
        element: <CorporateProductFormPage />,
      },
      {
        path: "products/:productId/edit",
        element: <CorporateProductFormPage />,
      },
      {
        path: "products/categories",
        element: <CorporateCategoryManagementPage />,
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
        path: "orders/:orderId/edit",
        element: <OrderEditPage />,
      },
      {
        path: "orders/:orderId/status",
        element: <OrderStatusPage />,
      },
      {
        path: "orders/:orderId",
        element: <OrderDetailPage />,
      },
      // Quote Management
      {
        path: "quotes",
        element: <CorporateQuoteListPage />,
      },
      {
        path: "quotes/new",
        element: <CorporateQuoteCreatePage />,
      },
      {
        path: "quotes/:id",
        element: <CorporateQuoteDetailPage />,
      },
      {
        path: "quotes/:id/approve",
        element: <CorporateQuoteApprovePage />,
      },
      {
        path: "quotes/:id/convert",
        element: <CorporateQuoteConvertPage />,
      },
      // Invoice Management
      {
        path: "invoices",
        element: <CorporateInvoiceListPage />,
      },
      {
        path: "invoices/new",
        element: <CorporateInvoiceCreatePage />,
      },
      {
        path: "invoices/:id",
        element: <CorporateInvoiceDetailPage />,
      },
      {
        path: "invoices/:id/edit",
        element: <CorporateInvoiceEditPage />,
      },
      {
        path: "invoices/:id/send",
        element: <CorporateInvoiceSendPage />,
      },
      {
        path: "invoices/:id/payment",
        element: <CorporateInvoicePaymentPage />,
      },
      // Business Reports
      {
        path: "reports",
        element: <CorporateReportsLandingPage />,
      },
      {
        path: "reports/customers",
        element: <CustomerReportsPage />,
      },
      {
        path: "reports/tickets",
        element: <TicketReportsPage />,
      },
      {
        path: "reports/orders",
        element: <OrderReportsPage />,
      },
      {
        path: "reports/revenue",
        element: <RevenueDashboardPage />,
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
        element: <NotificationSettingsPage />,
      },
      {
        path: "notifications",
        element: <NotificationsPage />,
      },
      {
        path: "settings/automation",
        element: <CorporateAutomationRestrictedPage />,
      },
      {
        path: "settings/templates",
        element: <EmailTemplatesPage />,
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
        element: <AdminProductListPage />,
      },
      {
        path: "products/new",
        element: <AdminProductFormPage />,
      },
      {
        path: "products/:productId/edit",
        element: <AdminProductFormPage />,
      },
      {
        path: "products/categories",
        element: <AdminCategoryManagementPage />,
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
        path: "settings/email/templates",
        element: <EmailTemplatesPage />,
      },
      {
        path: "settings/email/history",
        element: <EmailSendHistoryPage />,
      },
      {
        path: "settings/email/bounces",
        element: <EmailBouncesPage />,
      },
      {
        path: "settings/tickets",
        element: <TicketSettingsPage />,
      },
      {
        path: "settings/notifications/groups",
        element: <NotificationGroupsPage />,
      },
      {
        path: "notifications",
        element: <NotificationsPage />,
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
      {
        path: "reports/revenue",
        element: <AdminRevenueDashboardPage />,
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
        element: <AdminTicketDetailPage backPath="/admin/tickets" />,
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
        path: "orders/:orderId/edit",
        element: <OrderEditPage />,
      },
      {
        path: "orders/:orderId/status",
        element: <OrderStatusPage />,
      },
      {
        path: "orders/:orderId",
        element: <OrderDetailPage />,
      },
      // Ticket Templates
      {
        path: "tickets/templates",
        element: <AdminTemplateListPage />,
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
      {
        path: "tickets/email-accounts",
        element: <EmailAccountsPage />,
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
        path: "dns/zones/:zoneId",
        element: <AdminDNSZoneDetailPage />,
      },
      {
        path: "dns/monitoring",
        element: <DNSMonitoringPage />,
      },
      {
        path: "dns/templates",
        element: <DNSTemplatesPage />,
      },
      // Invoice Management (Admin)
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
      // Quote Management (Admin)
      {
        path: "quotes",
        element: <CorporateQuoteListPage />,
      },
      {
        path: "quotes/new",
        element: <CorporateQuoteCreatePage />,
      },
      {
        path: "quotes/:id",
        element: <CorporateQuoteDetailPage />,
      },
    ],
  },

  // Error Routes
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },
  {
    path: "/account-disabled",
    element: <AccountDisabledPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
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
  "/admin/tickets/email-accounts": ["admin"],
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
    "/admin/tickets/email-accounts",
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

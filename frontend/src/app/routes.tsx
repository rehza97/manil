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

import { LandingPage } from "@/modules/landing";
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
} from "@/modules/admin";
import {
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
        element: <ModulePlaceholder module="My Services" />,
      },
      {
        path: "services/:id",
        element: <ModulePlaceholder module="Service Details" />,
      },
      // Support Tickets
      {
        path: "tickets",
        element: <ModulePlaceholder module="My Tickets" />,
      },
      {
        path: "tickets/new",
        element: <ModulePlaceholder module="Create Ticket" />,
      },
      {
        path: "tickets/:id",
        element: <ModulePlaceholder module="Ticket Details" />,
      },
      {
        path: "tickets/:id/reply",
        element: <ModulePlaceholder module="Reply to Ticket" />,
      },
      // Product Catalog
      {
        path: "catalog",
        element: <ModulePlaceholder module="Product Catalog" />,
      },
      {
        path: "catalog/:id",
        element: <ModulePlaceholder module="Product Details" />,
      },
      {
        path: "catalog/quote-request",
        element: <ModulePlaceholder module="Quote Request" />,
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
        element: <ModulePlaceholder module="My Invoices" />,
      },
      {
        path: "invoices/:id",
        element: <ModulePlaceholder module="Invoice Details" />,
      },
      // Settings
      {
        path: "settings",
        element: <ModulePlaceholder module="Account Settings" />,
      },
      {
        path: "settings/notifications",
        element: <ModulePlaceholder module="Notification Preferences" />,
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
      // Corporate Settings
      {
        path: "settings",
        element: <ModulePlaceholder module="Corporate Settings" />,
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
      // System Overview
      {
        path: "overview",
        element: <SystemOverviewPage />,
      },
      {
        path: "overview/health",
        element: <ModulePlaceholder module="System Health" />,
      },
      {
        path: "overview/performance",
        element: <ModulePlaceholder module="Performance Metrics" />,
      },
      {
        path: "overview/alerts",
        element: <ModulePlaceholder module="System Alerts" />,
      },
      // User Management
      {
        path: "users",
        element: <UserManagementPage />,
      },
      {
        path: "users/new",
        element: <ModulePlaceholder module="Create User" />,
      },
      {
        path: "users/:id",
        element: <ModulePlaceholder module="User Details" />,
      },
      {
        path: "users/:id/edit",
        element: <ModulePlaceholder module="Edit User" />,
      },
      {
        path: "users/:id/roles",
        element: <ModulePlaceholder module="Manage User Roles" />,
      },
      {
        path: "users/:id/sessions",
        element: <ModulePlaceholder module="User Sessions" />,
      },
      // Role & Permission Management
      {
        path: "roles",
        element: <RoleManagementPage />,
      },
      {
        path: "roles/new",
        element: <ModulePlaceholder module="Create Role" />,
      },
      {
        path: "roles/:id",
        element: <ModulePlaceholder module="Role Details" />,
      },
      {
        path: "roles/:id/permissions",
        element: <ModulePlaceholder module="Role Permissions" />,
      },
      {
        path: "permissions",
        element: <ModulePlaceholder module="Permission Management" />,
      },
      // System Settings
      {
        path: "settings",
        element: <SystemSettingsPage />,
      },
      {
        path: "settings/general",
        element: <ModulePlaceholder module="General Settings" />,
      },
      {
        path: "settings/security",
        element: <ModulePlaceholder module="Security Settings" />,
      },
      {
        path: "settings/email",
        element: <ModulePlaceholder module="Email Configuration" />,
      },
      {
        path: "settings/sms",
        element: <ModulePlaceholder module="SMS Configuration" />,
      },
      {
        path: "settings/storage",
        element: <ModulePlaceholder module="Storage Configuration" />,
      },
      {
        path: "settings/backup",
        element: <ModulePlaceholder module="Backup Settings" />,
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
        element: <ModulePlaceholder module="Security Logs" />,
      },
      {
        path: "logs/system",
        element: <ModulePlaceholder module="System Logs" />,
      },
      {
        path: "logs/users/:id",
        element: <ModulePlaceholder module="User Activity Logs" />,
      },
      // Customer Management (Admin)
      {
        path: "customers",
        element: <CustomerManagementPage />,
      },
      {
        path: "customers/:id",
        element: <ModulePlaceholder module="Customer Details (Admin)" />,
      },
      {
        path: "customers/:id/kyc",
        element: <ModulePlaceholder module="Customer KYC Management" />,
      },
      // System Reports
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "reports/users",
        element: <ModulePlaceholder module="User Reports" />,
      },
      {
        path: "reports/activity",
        element: <ModulePlaceholder module="Activity Reports" />,
      },
      {
        path: "reports/security",
        element: <ModulePlaceholder module="Security Reports" />,
      },
      {
        path: "reports/performance",
        element: <ModulePlaceholder module="Performance Reports" />,
      },
      // Support Groups & Categories
      {
        path: "support",
        element: <ModulePlaceholder module="Support Management" />,
      },
      {
        path: "support/groups",
        element: <ModulePlaceholder module="Support Groups" />,
      },
      {
        path: "support/categories",
        element: <ModulePlaceholder module="Ticket Categories" />,
      },
      {
        path: "support/automation",
        element: <ModulePlaceholder module="Automation Rules" />,
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
        element: <ModulePlaceholder module="System Maintenance" />,
      },
      {
        path: "maintenance/backup",
        element: <ModulePlaceholder module="Backup Management" />,
      },
      {
        path: "maintenance/cache",
        element: <ModulePlaceholder module="Cache Management" />,
      },
      {
        path: "maintenance/cleanup",
        element: <ModulePlaceholder module="Data Cleanup" />,
      },
      {
        path: "maintenance/migrations",
        element: <ModulePlaceholder module="Database Migrations" />,
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
  "/corporate/settings": ["corporate", "admin"],

  // Admin routes
  "/admin": ["admin"],
  "/admin/overview": ["admin"],
  "/admin/users": ["admin"],
  "/admin/roles": ["admin"],
  "/admin/settings": ["admin"],
  "/admin/logs": ["admin"],
  "/admin/reports": ["admin"],
  "/admin/support": ["admin"],
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
} as const;

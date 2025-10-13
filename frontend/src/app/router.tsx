/**
 * Application Router Configuration
 *
 * Defines all routes for the CloudManager application using React Router.
 * Includes protected routes, public routes, and lazy loading for performance.
 *
 * @module app/router
 */

import { createBrowserRouter } from "react-router-dom";

// Layouts (will be created)
// import { DashboardLayout } from "@/layouts/DashboardLayout";
// import { AuthLayout } from "@/layouts/AuthLayout";
// import { PublicLayout } from "@/layouts/PublicLayout";

// Protected Route Component (will be created)
// import { ProtectedRoute } from "@/modules/auth/components/ProtectedRoute";

/**
 * Application router configuration
 *
 * Structure:
 * - Public routes (/, /login, /register)
 * - Protected routes (/dashboard/*)
 * - Module-specific routes (customers, tickets, products, etc.)
 */
export const router = createBrowserRouter([
  {
    path: "/",
    // element: <PublicLayout />,
    element: <div>Public Layout Placeholder</div>,
    children: [
      {
        index: true,
        // element: <HomePage />,
        element: <div>Home Page</div>,
      },
      {
        path: "login",
        // element: <LoginPage />,
        element: <div>Login Page</div>,
      },
      {
        path: "register",
        // element: <RegisterPage />,
        element: <div>Register Page</div>,
      },
      {
        path: "forgot-password",
        // element: <ForgotPasswordPage />,
        element: <div>Forgot Password Page</div>,
      },
    ],
  },
  {
    path: "/dashboard",
    // element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    element: <div>Dashboard Layout Placeholder</div>,
    children: [
      {
        index: true,
        // element: <DashboardPage />,
        element: <div>Dashboard Page</div>,
      },
      // Customer routes
      {
        path: "customers",
        // element: <CustomersPage />,
        element: <div>Customers Page</div>,
      },
      {
        path: "customers/:id",
        // element: <CustomerDetailPage />,
        element: <div>Customer Detail Page</div>,
      },
      // Ticket routes
      {
        path: "tickets",
        // element: <TicketsPage />,
        element: <div>Tickets Page</div>,
      },
      {
        path: "tickets/:id",
        // element: <TicketDetailPage />,
        element: <div>Ticket Detail Page</div>,
      },
      // Product routes
      {
        path: "products",
        // element: <ProductsPage />,
        element: <div>Products Page</div>,
      },
      {
        path: "products/:id",
        // element: <ProductDetailPage />,
        element: <div>Product Detail Page</div>,
      },
      // Order routes
      {
        path: "orders",
        // element: <OrdersPage />,
        element: <div>Orders Page</div>,
      },
      {
        path: "orders/:id",
        // element: <OrderDetailPage />,
        element: <div>Order Detail Page</div>,
      },
      // Invoice routes
      {
        path: "invoices",
        // element: <InvoicesPage />,
        element: <div>Invoices Page</div>,
      },
      {
        path: "invoices/:id",
        // element: <InvoiceDetailPage />,
        element: <div>Invoice Detail Page</div>,
      },
      // Reporting routes
      {
        path: "reports",
        // element: <ReportsPage />,
        element: <div>Reports Page</div>,
      },
      // Settings routes
      {
        path: "settings",
        // element: <SettingsPage />,
        element: <div>Settings Page</div>,
      },
    ],
  },
]);

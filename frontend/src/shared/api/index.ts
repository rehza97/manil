/**
 * API Module Exports
 *
 * Centralized export of all API clients for the CloudManager platform.
 * All backend endpoints are connected and ready to use.
 *
 * @module shared/api
 */

// Core client and utilities
export { apiClient, baseClient, handleApiError } from "./client";

// Dashboard APIs (existing)
// Note: dashboard/ is a directory, dashboard.ts is a file
// Export dashboard.ts contents explicitly
export { dashboardApi, default as dashboardApiDefault } from "./dashboard";
export type * from "./dashboard";
// Also export dashboard directory contents
export * from "./dashboard/index";

// Authentication & Authorization
import { authApi } from "./auth";
export { authApi };
export type * from "./auth";

// Audit & Activity Tracking
import { auditApi } from "./audit";
export { auditApi };
export type * from "./audit";

// System Management
import { systemApi } from "./system";
export { systemApi };
export type * from "./system";

// Customer Management (including KYC, Notes, Documents)
import { customersApi } from "./customers";
export { customersApi };
export type * from "./customers";

// Ticket Management (complete with tags, watchers, SLA, email)
import { ticketsApi } from "./tickets";
export { ticketsApi };
export type * from "./tickets";

// Product Catalog (products, categories, images, variants)
import { productsApi } from "./products";
export { productsApi };

// Order Management
import { ordersApi } from "./orders";
export { ordersApi };

// Quote Management
import { quotesApi } from "./quotes";
export { quotesApi };

// Invoice Management
import { invoicesApi } from "./invoices";
export { invoicesApi };

// Reports & Analytics
import { reportsApi } from "./reports";
export { reportsApi };

// Settings (roles, permissions, system settings)
import { settingsApi } from "./settings";
export { settingsApi };

/**
 * Unified API object with all clients
 *
 * Usage:
 * ```typescript
 * import { api } from '@/shared/api';
 *
 * const customers = await api.customers.getCustomers();
 * const tickets = await api.tickets.getTickets();
 * ```
 */
export const api = {
  auth: authApi,
  audit: auditApi,
  system: systemApi,
  customers: customersApi,
  tickets: ticketsApi,
  products: productsApi,
  orders: ordersApi,
  quotes: quotesApi,
  invoices: invoicesApi,
  reports: reportsApi,
  settings: settingsApi,
};

export default api;

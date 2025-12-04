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
export * from "./dashboard";

// Authentication & Authorization
export { authApi } from "./auth";
export type * from "./auth";

// Audit & Activity Tracking
export { auditApi } from "./audit";
export type * from "./audit";

// System Management
export { systemApi } from "./system";
export type * from "./system";

// Customer Management (including KYC, Notes, Documents)
export { customersApi } from "./customers";
export type * from "./customers";

// Ticket Management (complete with tags, watchers, SLA, email)
export { ticketsApi } from "./tickets";
export type * from "./tickets";

// Product Catalog (products, categories, images, variants)
export { productsApi } from "./products";

// Order Management
export { ordersApi } from "./orders";

// Quote Management
export { quotesApi } from "./quotes";

// Invoice Management
export { invoicesApi } from "./invoices";

// Reports & Analytics
export { reportsApi } from "./reports";

// Settings (roles, permissions, system settings)
export { settingsApi } from "./settings";

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

/**
 * Reports API Client
 *
 * @module shared/api/reports
 */

import { apiClient } from "./client";

export const reportsApi = {
  // Dashboards
  getAdminDashboard: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/dashboard/admin", {
      params,
    });
    return response.data;
  },

  getCorporateDashboard: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/dashboard/corporate", {
      params,
    });
    return response.data;
  },

  getCustomerDashboard: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/dashboard/customer", {
      params,
    });
    return response.data;
  },

  // Ticket Reports
  getTicketsByStatus: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/by-status", {
      params,
    });
    return response.data;
  },

  getTicketsByPriority: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/by-priority", {
      params,
    });
    return response.data;
  },

  getTicketsByCategory: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/by-category", {
      params,
    });
    return response.data;
  },

  getTicketsByAgent: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/by-agent", {
      params,
    });
    return response.data;
  },

  getTicketsByTeam: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/by-team", {
      params,
    });
    return response.data;
  },

  getOpenVsClosedTickets: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/open-vs-closed", {
      params,
    });
    return response.data;
  },

  getResponseTimeMetrics: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/response-time", {
      params,
    });
    return response.data;
  },

  getResolutionTimeMetrics: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/tickets/resolution-time", {
      params,
    });
    return response.data;
  },

  // Customer Reports
  getCustomersByStatus: async () => {
    const response = await apiClient.get("/reports/customers/by-status");
    return response.data;
  },

  getCustomersByType: async () => {
    const response = await apiClient.get("/reports/customers/by-type");
    return response.data;
  },

  getCustomerGrowth: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/customers/growth", {
      params,
    });
    return response.data;
  },

  getKYCStatusReport: async () => {
    const response = await apiClient.get("/reports/customers/kyc-status");
    return response.data;
  },

  // Order Reports
  getOrdersByStatus: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/orders/by-status", {
      params,
    });
    return response.data;
  },

  getOrderValueMetrics: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/orders/value-metrics", {
      params,
    });
    return response.data;
  },

  getMonthlyOrderReport: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/orders/monthly", {
      params,
    });
    return response.data;
  },

  getProductPerformance: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/orders/product-performance", {
      params,
    });
    return response.data;
  },

  getOrdersByCustomer: async (params?: {
    customer_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/reports/orders/by-customer", {
      params,
    });
    return response.data;
  },

  // Export
  exportReport: async (data: {
    report_type: string;
    format: "csv" | "pdf" | "excel";
    filters?: Record<string, any>;
  }) => {
    const response = await apiClient.post("/reports/export", data, {
      responseType: "blob",
    });
    return response.data;
  },

  downloadExport: async (fileName: string) => {
    const response = await apiClient.get(`/reports/export/download/${fileName}`, {
      responseType: "blob",
    });
    return response.data;
  },
};

export default reportsApi;

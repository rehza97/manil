/**
 * Advanced Reports API Client
 *
 * API client for the comprehensive advanced reporting system (28 reports across 7 categories)
 */

import { apiClient } from "./client";

export interface AdvancedReportParams {
  start_date?: string;
  end_date?: string;
  period?: "today" | "week" | "month" | "quarter" | "year";
  format?: "pdf" | "excel" | "csv";
  include_charts?: boolean;
  customer_id?: string;
  agent_id?: string;
  category_id?: string;
  status?: string;
}

export const advancedReportsApi = {
  // ============================================================================
  // Financial Reports (5 reports)
  // ============================================================================

  getInvoiceAging: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/financial/invoice-aging", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getPaymentStatus: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/financial/payment-status", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getRevenueRecognition: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/financial/revenue-recognition", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getTaxSummary: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/financial/tax-summary", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getProfitMargin: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/financial/profit-margin", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Sales Reports (4 reports)
  // ============================================================================

  getQuoteConversion: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/sales/quote-conversion", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getOrderPipeline: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/sales/order-pipeline", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getProductPerformance: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/sales/product-performance", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getCustomerPatterns: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/sales/customer-patterns", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Customer Intelligence Reports (4 reports)
  // ============================================================================

  getCustomerLifetimeValue: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/customers/lifetime-value", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getCustomerSegmentation: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/customers/segmentation", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getKYCCompliance: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/customers/kyc-compliance", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getChurnAnalysis: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/customers/churn-analysis", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Operations Reports (4 reports)
  // ============================================================================

  getSLACompliance: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/operations/sla-compliance", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getAgentPerformance: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/operations/agent-performance", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getCategoryAnalysis: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/operations/category-analysis", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getQualityMetrics: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/operations/quality-metrics", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Hosting Reports (4 reports)
  // ============================================================================

  getVPSUtilization: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/hosting/vps-utilization", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getVPSLifecycle: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/hosting/vps-lifecycle", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getVPSUptime: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/hosting/vps-uptime", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getVPSBilling: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/hosting/vps-billing", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Audit & Compliance Reports (4 reports)
  // ============================================================================

  getUserActivity: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/audit/user-activity", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getSecurityEvents: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/audit/security-events", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getDataChanges: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/audit/data-changes", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getCompliance: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/audit/compliance", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Executive Reports (3 reports)
  // ============================================================================

  getKPIDashboard: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/executive/kpi-dashboard", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getBusinessHealth: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/executive/business-health", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  getForecast: async (params: AdvancedReportParams = {}) => {
    const response = await apiClient.get("/reports/advanced/executive/forecast", {
      params,
      responseType: params.format ? "blob" : "json",
    });
    return response.data;
  },

  // ============================================================================
  // Generic Report Generator (for any report type)
  // ============================================================================

  generateReport: async (
    category: string,
    reportType: string,
    params: AdvancedReportParams = {}
  ) => {
    const response = await apiClient.get(
      `/reports/advanced/${category}/${reportType}`,
      {
        params,
        responseType: params.format ? "blob" : "json",
      }
    );

    // If it's a blob (file download), trigger download
    if (params.format && response.data instanceof Blob) {
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const extension = params.format === "excel" ? "xlsx" : params.format;
      link.download = `${category}_${reportType}_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    return response.data;
  },
};

export default advancedReportsApi;

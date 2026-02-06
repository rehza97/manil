/**
 * Report Service
 *
 * API service for all reporting and analytics endpoints.
 * Uses apiClient for consistent auth and token refresh.
 */

import { apiClient } from '@/shared/api/client';
import type {
  DashboardResponse,
  TicketStatusReport,
  TicketPriorityReport,
  TicketCategoryReport,
  AgentPerformance,
  TeamPerformance,
  ResponseTimeMetrics,
  ResolutionTimeMetrics,
  OpenVsClosedReport,
  CustomerStatusReport,
  CustomerTypeReport,
  CustomerGrowthReport,
  KYCStatusReport,
  OrderStatusReport,
  OrderValueMetrics,
  MonthlyOrderReport,
  ProductPerformance,
  CustomerOrderReport,
  ExportRequest,
  ExportResponse,
} from '../types/report.types';

// ============================================================================
// Dashboard API
// ============================================================================

export const reportService = {
  // Dashboard endpoints
  async getAdminDashboard(period: string = 'month'): Promise<DashboardResponse> {
    const response = await apiClient.get('/reports/dashboard/admin', {
      params: { period },
    });
    return response.data;
  },

  async getCorporateDashboard(period: string = 'month'): Promise<DashboardResponse> {
    const response = await apiClient.get('/reports/dashboard/corporate', {
      params: { period },
    });
    return response.data;
  },

  async getCustomerDashboard(period: string = 'month'): Promise<DashboardResponse> {
    const response = await apiClient.get('/reports/dashboard/customer', {
      params: { period },
    });
    return response.data;
  },

  // ============================================================================
  // Ticket Reports API
  // ============================================================================

  async getTicketsByStatus(
    startDate?: string,
    endDate?: string
  ): Promise<TicketStatusReport[]> {
    const response = await apiClient.get('/reports/tickets/by-status', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getTicketsByPriority(
    startDate?: string,
    endDate?: string
  ): Promise<TicketPriorityReport[]> {
    const response = await apiClient.get('/reports/tickets/by-priority', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getTicketsByCategory(
    startDate?: string,
    endDate?: string
  ): Promise<TicketCategoryReport[]> {
    const response = await apiClient.get('/reports/tickets/by-category', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getTicketsByAgent(
    startDate?: string,
    endDate?: string
  ): Promise<AgentPerformance[]> {
    const response = await apiClient.get('/reports/tickets/by-agent', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getTicketsByTeam(
    startDate?: string,
    endDate?: string
  ): Promise<TeamPerformance[]> {
    const response = await apiClient.get('/reports/tickets/by-team', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getResponseTimeMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<ResponseTimeMetrics> {
    const response = await apiClient.get('/reports/tickets/response-time', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getResolutionTimeMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<ResolutionTimeMetrics> {
    const response = await apiClient.get('/reports/tickets/resolution-time', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getOpenVsClosedReport(period: string = 'month'): Promise<OpenVsClosedReport[]> {
    const response = await apiClient.get('/reports/tickets/open-vs-closed', {
      params: { period },
    });
    return response.data;
  },

  // ============================================================================
  // Customer Reports API
  // ============================================================================

  async getCustomersByStatus(
    startDate?: string,
    endDate?: string
  ): Promise<CustomerStatusReport[]> {
    const response = await apiClient.get('/reports/customers/by-status', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getCustomersByType(
    startDate?: string,
    endDate?: string
  ): Promise<CustomerTypeReport[]> {
    const response = await apiClient.get('/reports/customers/by-type', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getCustomerGrowth(period: string = 'month'): Promise<CustomerGrowthReport[]> {
    const response = await apiClient.get('/reports/customers/growth', {
      params: { period },
    });
    return response.data;
  },

  async getKYCStatusReport(
    startDate?: string,
    endDate?: string
  ): Promise<KYCStatusReport[]> {
    const response = await apiClient.get('/reports/customers/kyc-status', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // ============================================================================
  // Order Reports API
  // ============================================================================

  async getOrdersByStatus(
    startDate?: string,
    endDate?: string
  ): Promise<OrderStatusReport[]> {
    const response = await apiClient.get('/reports/orders/by-status', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getOrderValueMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<OrderValueMetrics> {
    const response = await apiClient.get('/reports/orders/value-metrics', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  async getMonthlyOrders(months: number = 12): Promise<MonthlyOrderReport[]> {
    const response = await apiClient.get('/reports/orders/monthly', {
      params: { months },
    });
    return response.data;
  },

  async getProductPerformance(
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<ProductPerformance[]> {
    const response = await apiClient.get('/reports/orders/product-performance', {
      params: { start_date: startDate, end_date: endDate, limit },
    });
    return response.data;
  },

  async getOrdersByCustomer(
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<CustomerOrderReport[]> {
    const response = await apiClient.get('/reports/orders/by-customer', {
      params: { start_date: startDate, end_date: endDate, limit },
    });
    return response.data;
  },

  // ============================================================================
  // Export API
  // ============================================================================

  async exportReport(exportRequest: ExportRequest): Promise<ExportResponse> {
    const response = await apiClient.post('/reports/export', exportRequest);
    return response.data;
  },

  async downloadExport(fileName: string): Promise<Blob> {
    const response = await apiClient.get(`/reports/export/download/${fileName}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // ============================================================================
  // Advanced Reports API
  // ============================================================================

  /**
   * Get advanced report preview data (JSON format with charts and tables)
   */
  async getAdvancedReport(
    category: string,
    reportId: string,
    params: {
      start_date?: string;
      end_date?: string;
      format?: 'json';
      [key: string]: any;
    }
  ): Promise<any> {
    const response = await apiClient.get(
      `/reports/advanced/${category}/${reportId}`,
      { params: { ...params, format: 'json' } }
    );
    return response.data;
  },

  /**
   * Download advanced report in PDF, Excel, or CSV format
   */
  async downloadAdvancedReport(
    category: string,
    reportId: string,
    params: {
      start_date?: string;
      end_date?: string;
      format: 'pdf' | 'excel' | 'csv';
      include_charts?: boolean;
      [key: string]: any;
    }
  ): Promise<void> {
    const response = await apiClient.get(
      `/reports/advanced/${category}/${reportId}`,
      { params, responseType: 'blob' }
    );

    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Determine file extension
    const extension = params.format === 'excel' ? 'xlsx' : params.format;
    link.setAttribute('download', `${category}-${reportId}.${extension}`);

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default reportService;

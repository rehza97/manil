/**
 * Report Service
 *
 * API service for all reporting and analytics endpoints.
 */

import axios from 'axios';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ============================================================================
// Dashboard API
// ============================================================================

export const reportService = {
  // Dashboard endpoints
  async getAdminDashboard(period: string = 'month'): Promise<DashboardResponse> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/dashboard/admin`, {
      params: { period },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getCorporateDashboard(period: string = 'month'): Promise<DashboardResponse> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/dashboard/corporate`, {
      params: { period },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getCustomerDashboard(period: string = 'month'): Promise<DashboardResponse> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/dashboard/customer`, {
      params: { period },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
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
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/by-status`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTicketsByPriority(
    startDate?: string,
    endDate?: string
  ): Promise<TicketPriorityReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/by-priority`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTicketsByCategory(
    startDate?: string,
    endDate?: string
  ): Promise<TicketCategoryReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/by-category`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTicketsByAgent(
    startDate?: string,
    endDate?: string
  ): Promise<AgentPerformance[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/by-agent`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getTicketsByTeam(
    startDate?: string,
    endDate?: string
  ): Promise<TeamPerformance[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/by-team`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getResponseTimeMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<ResponseTimeMetrics> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/response-time`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getResolutionTimeMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<ResolutionTimeMetrics> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/resolution-time`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getOpenVsClosedReport(period: string = 'month'): Promise<OpenVsClosedReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/tickets/open-vs-closed`, {
      params: { period },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
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
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/customers/by-status`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getCustomersByType(
    startDate?: string,
    endDate?: string
  ): Promise<CustomerTypeReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/customers/by-type`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getCustomerGrowth(period: string = 'month'): Promise<CustomerGrowthReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/customers/growth`, {
      params: { period },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getKYCStatusReport(
    startDate?: string,
    endDate?: string
  ): Promise<KYCStatusReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/customers/kyc-status`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
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
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/orders/by-status`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getOrderValueMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<OrderValueMetrics> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/orders/value-metrics`, {
      params: { start_date: startDate, end_date: endDate },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getMonthlyOrders(months: number = 12): Promise<MonthlyOrderReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/orders/monthly`, {
      params: { months },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getProductPerformance(
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<ProductPerformance[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/orders/product-performance`, {
      params: { start_date: startDate, end_date: endDate, limit },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  async getOrdersByCustomer(
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<CustomerOrderReport[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/reports/orders/by-customer`, {
      params: { start_date: startDate, end_date: endDate, limit },
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    });
    return response.data;
  },

  // ============================================================================
  // Export API
  // ============================================================================

  async exportReport(exportRequest: ExportRequest): Promise<ExportResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/reports/export`,
      exportRequest,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      }
    );
    return response.data;
  },

  async downloadExport(fileName: string): Promise<Blob> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/reports/export/download/${fileName}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

export default reportService;

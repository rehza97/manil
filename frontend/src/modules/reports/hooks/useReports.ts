/**
 * Report Hooks
 *
 * React Query hooks for all reporting and analytics endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import type { ExportRequest } from '../types/report.types';

// ============================================================================
// Dashboard Hooks
// ============================================================================

export const useAdminDashboard = (period: string = 'month') => {
  return useQuery({
    queryKey: ['dashboard', 'admin', period],
    queryFn: () => reportService.getAdminDashboard(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCorporateDashboard = (period: string = 'month') => {
  return useQuery({
    queryKey: ['dashboard', 'corporate', period],
    queryFn: () => reportService.getCorporateDashboard(period),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCustomerDashboard = (period: string = 'month') => {
  return useQuery({
    queryKey: ['dashboard', 'customer', period],
    queryFn: () => reportService.getCustomerDashboard(period),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Ticket Report Hooks
// ============================================================================

export const useTicketsByStatus = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'by-status', startDate, endDate],
    queryFn: () => reportService.getTicketsByStatus(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTicketsByPriority = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'by-priority', startDate, endDate],
    queryFn: () => reportService.getTicketsByPriority(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTicketsByCategory = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'by-category', startDate, endDate],
    queryFn: () => reportService.getTicketsByCategory(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTicketsByAgent = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'by-agent', startDate, endDate],
    queryFn: () => reportService.getTicketsByAgent(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTicketsByTeam = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'by-team', startDate, endDate],
    queryFn: () => reportService.getTicketsByTeam(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useResponseTimeMetrics = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'response-time', startDate, endDate],
    queryFn: () => reportService.getResponseTimeMetrics(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useResolutionTimeMetrics = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'resolution-time', startDate, endDate],
    queryFn: () => reportService.getResolutionTimeMetrics(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOpenVsClosedReport = (period: string = 'month') => {
  return useQuery({
    queryKey: ['reports', 'tickets', 'open-vs-closed', period],
    queryFn: () => reportService.getOpenVsClosedReport(period),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Customer Report Hooks
// ============================================================================

export const useCustomersByStatus = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'customers', 'by-status', startDate, endDate],
    queryFn: () => reportService.getCustomersByStatus(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCustomersByType = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'customers', 'by-type', startDate, endDate],
    queryFn: () => reportService.getCustomersByType(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCustomerGrowth = (period: string = 'month') => {
  return useQuery({
    queryKey: ['reports', 'customers', 'growth', period],
    queryFn: () => reportService.getCustomerGrowth(period),
    staleTime: 5 * 60 * 1000,
  });
};

export const useKYCStatusReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'customers', 'kyc-status', startDate, endDate],
    queryFn: () => reportService.getKYCStatusReport(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Order Report Hooks
// ============================================================================

export const useOrdersByStatus = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'orders', 'by-status', startDate, endDate],
    queryFn: () => reportService.getOrdersByStatus(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrderValueMetrics = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'orders', 'value-metrics', startDate, endDate],
    queryFn: () => reportService.getOrderValueMetrics(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useMonthlyOrders = (months: number = 12) => {
  return useQuery({
    queryKey: ['reports', 'orders', 'monthly', months],
    queryFn: () => reportService.getMonthlyOrders(months),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProductPerformance = (
  startDate?: string,
  endDate?: string,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ['reports', 'orders', 'product-performance', startDate, endDate, limit],
    queryFn: () => reportService.getProductPerformance(startDate, endDate, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrdersByCustomer = (
  startDate?: string,
  endDate?: string,
  limit: number = 10
) => {
  return useQuery({
    queryKey: ['reports', 'orders', 'by-customer', startDate, endDate, limit],
    queryFn: () => reportService.getOrdersByCustomer(startDate, endDate, limit),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Export Hooks
// ============================================================================

export const useExportReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exportRequest: ExportRequest) =>
      reportService.exportReport(exportRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
  });
};

export const useDownloadExport = () => {
  return useMutation({
    mutationFn: (fileName: string) => reportService.downloadExport(fileName),
    onSuccess: (blob, fileName) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};

// ============================================================================
// Utility Hook for Refreshing All Reports
// ============================================================================

export const useRefreshReports = () => {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const refreshDashboards = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const refreshTicketReports = () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'tickets'] });
  };

  const refreshCustomerReports = () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'customers'] });
  };

  const refreshOrderReports = () => {
    queryClient.invalidateQueries({ queryKey: ['reports', 'orders'] });
  };

  return {
    refreshAll,
    refreshDashboards,
    refreshTicketReports,
    refreshCustomerReports,
    refreshOrderReports,
  };
};

/**
 * Report Hooks
 *
 * React Query hooks for system reports and analytics
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  reportService,
  type SystemReport,
  type UserReport,
  type ActivityReport,
  type SecurityReport,
  type PerformanceReport,
  type ReportFilters,
} from "../services/reportService";

export const useSystemReport = (filters: ReportFilters = {}) => {
  return useQuery<SystemReport>({
    queryKey: ["admin", "reports", "system", filters],
    queryFn: () => reportService.getSystemReport(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserReport = (filters: ReportFilters = {}) => {
  return useQuery<UserReport>({
    queryKey: ["admin", "reports", "users", filters],
    queryFn: () => reportService.getUserReport(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useActivityReport = (filters: ReportFilters = {}) => {
  return useQuery<ActivityReport>({
    queryKey: ["admin", "reports", "activity", filters],
    queryFn: () => reportService.getActivityReport(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSecurityReport = (filters: ReportFilters = {}) => {
  return useQuery<SecurityReport>({
    queryKey: ["admin", "reports", "security", filters],
    queryFn: () => reportService.getSecurityReport(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for security)
  });
};

export const usePerformanceReport = (filters: ReportFilters = {}) => {
  return useQuery<PerformanceReport>({
    queryKey: ["admin", "reports", "performance", filters],
    queryFn: () => reportService.getPerformanceReport(filters),
    staleTime: 1 * 60 * 1000, // 1 minute (most frequent for performance)
  });
};

export const useExportReport = () => {
  return useMutation({
    mutationFn: ({
      reportType,
      filters,
    }: {
      reportType: string;
      filters: ReportFilters;
    }) => reportService.exportReport(reportType, filters),
    onSuccess: (blob, { reportType }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}_report_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to export report");
    },
  });
};

export const useExportReportPDF = () => {
  return useMutation({
    mutationFn: ({
      reportType,
      filters,
    }: {
      reportType: string;
      filters: ReportFilters;
    }) => reportService.exportReportPDF(reportType, filters),
    onSuccess: (blob, { reportType }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF report exported successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to export PDF report"
      );
    },
  });
};

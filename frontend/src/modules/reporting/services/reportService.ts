import { apiClient } from "@/shared/api";
import type {
  DashboardMetrics,
  ReportFilter,
  ChartData,
  ReportType,
} from "../types";

export const reportService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiClient.get<DashboardMetrics>(
      "/reports/dashboard"
    );
    return response.data;
  },

  async getReport(
    type: ReportType,
    filters?: ReportFilter
  ): Promise<ChartData> {
    const response = await apiClient.get<ChartData>(`/reports/${type}`, {
      params: filters,
    });
    return response.data;
  },

  async exportReport(type: ReportType, filters?: ReportFilter): Promise<Blob> {
    const response = await apiClient.get(`/reports/${type}/export`, {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};

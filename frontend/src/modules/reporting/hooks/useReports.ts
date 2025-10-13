import { useQuery } from "@tanstack/react-query";
import { reportService } from "../services";
import type { ReportType, ReportFilter } from "../types";

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: reportService.getDashboardMetrics,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useReport = (type: ReportType, filters?: ReportFilter) => {
  return useQuery({
    queryKey: ["reports", type, filters],
    queryFn: () => reportService.getReport(type, filters),
  });
};

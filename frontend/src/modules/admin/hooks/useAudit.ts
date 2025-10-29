/**
 * useAudit Hook
 *
 * React Query hooks for audit logs
 */

import { useQuery } from "@tanstack/react-query";
import { auditService } from "../services";
import type { AuditLogFilters } from "../types";

/**
 * Get all audit logs hook
 */
export const useAuditLogs = (
  page: number = 1,
  pageSize: number = 20,
  filters?: AuditLogFilters
) => {
  return useQuery({
    queryKey: ["audit-logs", page, pageSize, filters],
    queryFn: () => auditService.getAuditLogs(page, pageSize, filters),
  });
};

/**
 * Get user audit logs hook
 */
export const useUserAuditLogs = (
  userId: string,
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: ["audit-logs", "user", userId, page, pageSize],
    queryFn: () => auditService.getUserAuditLogs(userId, page, pageSize),
    enabled: !!userId,
  });
};

/**
 * Get my audit logs hook
 */
export const useMyAuditLogs = (page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ["audit-logs", "me", page, pageSize],
    queryFn: () => auditService.getMyAuditLogs(page, pageSize),
  });
};

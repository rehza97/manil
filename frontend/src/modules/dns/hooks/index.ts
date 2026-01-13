/**
 * DNS Hooks Export
 *
 * Centralized export for all DNS React Query hooks.
 */

// Zone Hooks
export {
  useDNSZones,
  useDNSZone,
  useCreateDNSZone,
  useUpdateDNSZone,
  useDeleteDNSZone,
  useAllDNSZones,
  useAdminDNSZone,
  useActivateDNSZone,
  useSuspendDNSZone,
} from "./useDNSZones";

// Record Hooks
export {
  useDNSRecords,
  useDNSRecord,
  useCreateDNSRecord,
  useBulkCreateDNSRecords,
  useUpdateDNSRecord,
  useDeleteDNSRecord,
} from "./useDNSRecords";

// Template Hooks
export {
  useDNSTemplates,
  useAdminDNSTemplates,
  useApplyDNSTemplate,
  useCreateDNSTemplate,
  useUpdateDNSTemplate,
  useDeleteDNSTemplate,
} from "./useDNSTemplates";

// Admin Hooks
export {
  useCoreDNSStatus,
  useDNSSyncLogs,
  useReloadCoreDNS,
  useRegenerateCoreDNSConfig,
  useCreateSystemZone,
} from "./useDNSAdmin";

// Statistics Hooks
export { useDNSStatistics, useDNSMetrics } from "./useDNSStatistics";

// Container Hooks
export { useSubscriptionContainers } from "./useContainers";
export type { ContainerInfo } from "./useContainers";

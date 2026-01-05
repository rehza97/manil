/**
 * DNS Record Hooks
 * 
 * React Query hooks for DNS record operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/components/ui/use-toast";
import { dnsService } from "../services";
import type {
  DNSRecord,
  DNSRecordListResponse,
  CreateDNSRecordRequest,
  UpdateDNSRecordRequest,
  BulkRecordCreateRequest,
  BulkRecordResponse,
  DNSRecordType,
} from "../types";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get DNS records for a zone
 */
export const useDNSRecords = (
  zoneId: string | undefined,
  params?: {
    record_type?: DNSRecordType;
    include_system?: boolean;
  }
) => {
  return useQuery({
    queryKey: ["dns", "records", zoneId, params],
    queryFn: () => dnsService.getRecords(zoneId!, params),
    enabled: !!zoneId,
  });
};

/**
 * Get single DNS record
 */
export const useDNSRecord = (recordId: string | undefined) => {
  return useQuery({
    queryKey: ["dns", "records", "detail", recordId],
    queryFn: () => dnsService.getRecord(recordId!),
    enabled: !!recordId,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create DNS record
 */
export const useCreateDNSRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      zoneId,
      data,
    }: {
      zoneId: string;
      data: CreateDNSRecordRequest;
    }) => dnsService.createRecord(zoneId, data),
    onSuccess: (_, { zoneId }) => {
      // Invalidate zone detail and records list
      queryClient.invalidateQueries({ queryKey: ["dns", "zones", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "records", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "statistics"] });
      
      toast({
        title: "Record Created",
        description: "DNS record has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Record",
        description:
          error.response?.data?.detail ||
          "An error occurred while creating the DNS record",
        variant: "destructive",
      });
    },
  });
};

/**
 * Bulk create DNS records
 */
export const useBulkCreateDNSRecords = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      zoneId,
      data,
    }: {
      zoneId: string;
      data: BulkRecordCreateRequest;
    }) => dnsService.bulkCreateRecords(zoneId, data),
    onSuccess: (result, { zoneId }) => {
      // Invalidate zone and records
      queryClient.invalidateQueries({ queryKey: ["dns", "zones", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "records", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "statistics"] });
      
      // Show detailed toast
      const successCount = result.success_count || 0;
      const failureCount = result.failure_count || 0;
      
      if (failureCount === 0) {
        toast({
          title: "Records Created",
          description: `Successfully created ${successCount} DNS records.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Created ${successCount} records, ${failureCount} failed.`,
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Creation Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while creating records",
        variant: "destructive",
      });
    },
  });
};

/**
 * Update DNS record
 */
export const useUpdateDNSRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      recordId,
      data,
    }: {
      recordId: string;
      data: UpdateDNSRecordRequest;
    }) => dnsService.updateRecord(recordId, data),
    onSuccess: (record) => {
      // Invalidate zone and records
      queryClient.invalidateQueries({ queryKey: ["dns", "zones", record.zone_id] });
      queryClient.invalidateQueries({ queryKey: ["dns", "records", record.zone_id] });
      queryClient.invalidateQueries({ queryKey: ["dns", "records", "detail", record.id] });
      
      toast({
        title: "Record Updated",
        description: "DNS record has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while updating the record",
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete DNS record
 */
export const useDeleteDNSRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ recordId, zoneId }: { recordId: string; zoneId: string }) =>
      dnsService.deleteRecord(recordId),
    onSuccess: (_, { zoneId }) => {
      // Invalidate zone and records
      queryClient.invalidateQueries({ queryKey: ["dns", "zones", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "records", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "statistics"] });
      
      toast({
        title: "Record Deleted",
        description: "DNS record has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while deleting the record",
        variant: "destructive",
      });
    },
  });
};

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
        title: "Enregistrement créé",
        description: "L'enregistrement DNS a été créé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la création de l'enregistrement",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la création de l'enregistrement DNS",
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
          title: "Enregistrements créés",
          description: `${successCount} enregistrement(s) DNS créé(s) avec succès.`,
        });
      } else {
        toast({
          title: "Succès partiel",
          description: `${successCount} enregistrement(s) créé(s), ${failureCount} en échec.`,
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la création en masse",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la création des enregistrements",
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
        title: "Enregistrement mis à jour",
        description: "L'enregistrement DNS a été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la mise à jour",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la mise à jour de l'enregistrement",
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
        title: "Enregistrement supprimé",
        description: "L'enregistrement DNS a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la suppression",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la suppression de l'enregistrement",
        variant: "destructive",
      });
    },
  });
};

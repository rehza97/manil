/**
 * DNS Template Hooks
 * 
 * React Query hooks for DNS template operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/components/ui/use-toast";
import { dnsService } from "../services";
import type {
  DNSTemplate,
  ApplyTemplateRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from "../types";

// ============================================================================
// Query Hooks (Client & Admin)
// ============================================================================

/**
 * Get available DNS templates (client view)
 */
export const useDNSTemplates = () => {
  return useQuery({
    queryKey: ["dns", "templates"],
    queryFn: () => dnsService.getTemplates(),
  });
};

/**
 * Get all DNS templates (admin view)
 */
export const useAdminDNSTemplates = () => {
  return useQuery({
    queryKey: ["dns", "admin", "templates"],
    queryFn: () => dnsService.getAdminTemplates(),
  });
};

// ============================================================================
// Mutation Hooks (Client)
// ============================================================================

/**
 * Apply template to DNS zone
 */
export const useApplyDNSTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      zoneId,
      data,
    }: {
      zoneId: string;
      data: ApplyTemplateRequest;
    }) => dnsService.applyTemplate(zoneId, data),
    onSuccess: (result, { zoneId }) => {
      // Invalidate zone and records
      queryClient.invalidateQueries({ queryKey: ["dns", "zones", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["dns", "records", zoneId] });
      
      const successCount = result.success_count || 0;
      const failureCount = result.failure_count || 0;
      
      if (failureCount === 0) {
        toast({
          title: "Template Applied",
          description: `Successfully created ${successCount} DNS records from template.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Created ${successCount} records, ${failureCount} failed.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Template Application Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while applying the template",
        variant: "destructive",
      });
    },
  });
};

// ============================================================================
// Mutation Hooks (Admin)
// ============================================================================

/**
 * Create new DNS template (admin)
 */
export const useCreateDNSTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => dnsService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns", "admin", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["dns", "templates"] });
      
      toast({
        title: "Template Created",
        description: "DNS template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while creating the template",
        variant: "destructive",
      });
    },
  });
};

/**
 * Update DNS template (admin)
 */
export const useUpdateDNSTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTemplateRequest;
    }) => dnsService.updateTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns", "admin", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["dns", "templates"] });
      
      toast({
        title: "Template Updated",
        description: "DNS template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while updating the template",
        variant: "destructive",
      });
    },
  });
};

/**
 * Delete DNS template (admin)
 */
export const useDeleteDNSTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (templateId: string) => dnsService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns", "admin", "templates"] });
      queryClient.invalidateQueries({ queryKey: ["dns", "templates"] });
      
      toast({
        title: "Template Deleted",
        description: "DNS template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description:
          error.response?.data?.detail ||
          "An error occurred while deleting the template",
        variant: "destructive",
      });
    },
  });
};

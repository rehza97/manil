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
          title: "Modèle appliqué",
          description: `${successCount} enregistrement(s) DNS créé(s) à partir du modèle.`,
        });
      } else {
        toast({
          title: "Succès partiel",
          description: `${successCount} enregistrement(s) créé(s), ${failureCount} en échec.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Échec de l'application du modèle",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de l'application du modèle",
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
        title: "Modèle créé",
        description: "Le modèle DNS a été créé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la création",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la création du modèle",
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
        title: "Modèle mis à jour",
        description: "Le modèle DNS a été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la mise à jour",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la mise à jour du modèle",
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
        title: "Modèle supprimé",
        description: "Le modèle DNS a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la suppression",
        description:
          error.response?.data?.detail ||
          "Une erreur s'est produite lors de la suppression du modèle",
        variant: "destructive",
      });
    },
  });
};

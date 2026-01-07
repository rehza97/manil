/**
 * Support Hooks
 *
 * React Query hooks for support management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  supportService,
  type SupportGroup,
  type SupportGroupDetail,
  type SupportGroupCreate,
  type SupportGroupUpdate,
  type AutomationRule,
  type AutomationRuleCreate,
  type AutomationRuleUpdate,
  type TicketCategory,
  type TicketCategoryCreate,
  type TicketCategoryUpdate,
  type SupportStats,
} from "../services/supportService";

/**
 * Get support statistics
 */
export const useSupportStats = () => {
  return useQuery<SupportStats>({
    queryKey: ["admin", "support", "stats"],
    queryFn: supportService.getSupportStats,
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Support Groups
 */
export const useSupportGroups = (isActive?: boolean) => {
  return useQuery<SupportGroup[]>({
    queryKey: ["admin", "support", "groups", isActive],
    queryFn: () => supportService.getSupportGroups(isActive),
  });
};

export const useSupportGroup = (groupId: string) => {
  return useQuery<SupportGroupDetail>({
    queryKey: ["admin", "support", "groups", groupId],
    queryFn: () => supportService.getSupportGroup(groupId),
    enabled: !!groupId,
  });
};

export const useCreateSupportGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupportGroupCreate) =>
      supportService.createSupportGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "groups"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Support group created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to create support group"
      );
    },
  });
};

export const useUpdateSupportGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: SupportGroupUpdate;
    }) => supportService.updateSupportGroup(groupId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "groups"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "groups", variables.groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Support group updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to update support group"
      );
    },
  });
};

export const useDeleteSupportGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => supportService.deleteSupportGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "groups"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Support group deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to delete support group"
      );
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      supportService.addGroupMember(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "groups", variables.groupId],
      });
      toast.success("Member added to group successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to add member to group"
      );
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      supportService.removeGroupMember(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "groups", variables.groupId],
      });
      toast.success("Member removed from group successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to remove member from group"
      );
    },
  });
};

/**
 * Ticket Categories
 */
export const useTicketCategories = (isActive?: boolean) => {
  return useQuery<TicketCategory[]>({
    queryKey: ["admin", "support", "categories", isActive],
    queryFn: () => supportService.getTicketCategories(isActive),
  });
};

export const useTicketCategory = (categoryId: string) => {
  return useQuery<TicketCategory>({
    queryKey: ["admin", "support", "categories", categoryId],
    queryFn: () => supportService.getTicketCategory(categoryId),
    enabled: !!categoryId,
  });
};

export const useCreateTicketCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TicketCategoryCreate) =>
      supportService.createTicketCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "categories"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Ticket category created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to create ticket category"
      );
    },
  });
};

export const useUpdateTicketCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: TicketCategoryUpdate;
    }) => supportService.updateTicketCategory(categoryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "categories"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "categories", variables.categoryId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Ticket category updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to update ticket category"
      );
    },
  });
};

export const useDeleteTicketCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) =>
      supportService.deleteTicketCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "categories"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Ticket category deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to delete ticket category"
      );
    },
  });
};

/**
 * Automation Rules
 */
export const useAutomationRules = (
  isActive?: boolean,
  triggerType?: string
) => {
  return useQuery<AutomationRule[]>({
    queryKey: ["admin", "support", "automation", isActive, triggerType],
    queryFn: () => supportService.getAutomationRules(isActive, triggerType),
  });
};

export const useAutomationRule = (ruleId: string) => {
  return useQuery<AutomationRule>({
    queryKey: ["admin", "support", "automation", ruleId],
    queryFn: () => supportService.getAutomationRule(ruleId),
    enabled: !!ruleId,
  });
};

export const useCreateAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutomationRuleCreate) =>
      supportService.createAutomationRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "automation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Automation rule created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to create automation rule"
      );
    },
  });
};

export const useUpdateAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: AutomationRuleUpdate;
    }) => supportService.updateAutomationRule(ruleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "automation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "automation", variables.ruleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Automation rule updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to update automation rule"
      );
    },
  });
};

export const useDeleteAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => supportService.deleteAutomationRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "automation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Automation rule deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to delete automation rule"
      );
    },
  });
};

export const useToggleAutomationRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => supportService.toggleAutomationRule(ruleId),
    onSuccess: (_, ruleId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "automation"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "automation", ruleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "support", "stats"],
      });
      toast.success("Automation rule toggled successfully");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.detail || "Failed to toggle automation rule"
      );
    },
  });
};












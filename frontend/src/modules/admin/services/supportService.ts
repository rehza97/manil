/**
 * Support Service
 *
 * API service for support management (groups, categories, automation rules)
 */

import { apiClient } from "@/shared/api/client";

export interface SupportGroup {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportGroupDetail extends SupportGroup {
  members: Array<{
    user_id: string;
    user_email: string;
    user_name: string;
    created_at: string;
  }>;
}

export interface SupportGroupCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface SupportGroupUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface SupportGroupMemberAdd {
  user_id: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger_type: "ticket_created" | "ticket_updated" | "ticket_replied";
  conditions: Record<string, any>;
  actions: Record<string, any>;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleCreate {
  name: string;
  description?: string;
  trigger_type: "ticket_created" | "ticket_updated" | "ticket_replied";
  conditions: Record<string, any>;
  actions: Record<string, any>;
  is_active?: boolean;
  priority?: number;
}

export interface AutomationRuleUpdate {
  name?: string;
  description?: string;
  trigger_type?: "ticket_created" | "ticket_updated" | "ticket_replied";
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  is_active?: boolean;
  priority?: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketCategoryCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface TicketCategoryUpdate {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface SupportStats {
  total_tickets: number;
  open_tickets: number;
  assigned_tickets: number;
  unassigned_tickets: number;
  total_categories: number;
  total_groups: number;
  total_automation_rules: number;
  active_automation_rules: number;
}

export const supportService = {
  /**
   * Get support statistics
   */
  async getSupportStats(): Promise<SupportStats> {
    const response = await apiClient.get("/admin/support/stats");
    return response.data;
  },

  /**
   * Support Groups
   */
  async getSupportGroups(isActive?: boolean): Promise<SupportGroup[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append("is_active", String(isActive));
    }
    const response = await apiClient.get(`/admin/support/groups?${params}`);
    return response.data;
  },

  async getSupportGroup(groupId: string): Promise<SupportGroupDetail> {
    const response = await apiClient.get(`/admin/support/groups/${groupId}`);
    return response.data;
  },

  async createSupportGroup(data: SupportGroupCreate): Promise<SupportGroup> {
    const response = await apiClient.post("/admin/support/groups", data);
    return response.data;
  },

  async updateSupportGroup(
    groupId: string,
    data: SupportGroupUpdate
  ): Promise<SupportGroup> {
    const response = await apiClient.put(
      `/admin/support/groups/${groupId}`,
      data
    );
    return response.data;
  },

  async deleteSupportGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/admin/support/groups/${groupId}`);
  },

  async addGroupMember(groupId: string, userId: string): Promise<void> {
    await apiClient.post(`/admin/support/groups/${groupId}/members`, {
      user_id: userId,
    });
  },

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await apiClient.delete(
      `/admin/support/groups/${groupId}/members/${userId}`
    );
  },

  /**
   * Ticket Categories
   */
  async getTicketCategories(isActive?: boolean): Promise<TicketCategory[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append("is_active", String(isActive));
    }
    const response = await apiClient.get(`/admin/support/categories?${params}`);
    return response.data;
  },

  async getTicketCategory(categoryId: string): Promise<TicketCategory> {
    const response = await apiClient.get(`/tickets/categories/${categoryId}`);
    return response.data;
  },

  async createTicketCategory(
    data: TicketCategoryCreate
  ): Promise<TicketCategory> {
    const response = await apiClient.post("/tickets/categories", data);
    return response.data;
  },

  async updateTicketCategory(
    categoryId: string,
    data: TicketCategoryUpdate
  ): Promise<TicketCategory> {
    const response = await apiClient.put(
      `/tickets/categories/${categoryId}`,
      data
    );
    return response.data;
  },

  async deleteTicketCategory(categoryId: string): Promise<void> {
    await apiClient.delete(`/tickets/categories/${categoryId}`);
  },

  /**
   * Automation Rules
   */
  async getAutomationRules(
    isActive?: boolean,
    triggerType?: string
  ): Promise<AutomationRule[]> {
    const params = new URLSearchParams();
    if (isActive !== undefined) {
      params.append("is_active", String(isActive));
    }
    if (triggerType) {
      params.append("trigger_type", triggerType);
    }
    const response = await apiClient.get(`/admin/support/automation?${params}`);
    return response.data;
  },

  async getAutomationRule(ruleId: string): Promise<AutomationRule> {
    const response = await apiClient.get(`/admin/support/automation/${ruleId}`);
    return response.data;
  },

  async createAutomationRule(
    data: AutomationRuleCreate
  ): Promise<AutomationRule> {
    const response = await apiClient.post("/admin/support/automation", data);
    return response.data;
  },

  async updateAutomationRule(
    ruleId: string,
    data: AutomationRuleUpdate
  ): Promise<AutomationRule> {
    const response = await apiClient.put(
      `/admin/support/automation/${ruleId}`,
      data
    );
    return response.data;
  },

  async deleteAutomationRule(ruleId: string): Promise<void> {
    await apiClient.delete(`/admin/support/automation/${ruleId}`);
  },

  async toggleAutomationRule(ruleId: string): Promise<AutomationRule> {
    const response = await apiClient.patch(
      `/admin/support/automation/${ruleId}/toggle`
    );
    return response.data;
  },
};











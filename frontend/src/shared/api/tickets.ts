/**
 * Tickets API Client
 *
 * Comprehensive ticket management API including:
 * - Ticket CRUD operations
 * - Replies management
 * - Tags and watchers
 * - SLA metrics
 * - Email integration
 *
 * @module shared/api/tickets
 */

import { apiClient } from "./client";
import type { AxiosResponse } from "axios";

// Types
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category_id?: string;
  customer_id?: string;
  assigned_to_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  content: string;
  is_internal: boolean;
  created_by_id: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Watcher {
  id: string;
  user_id: string;
  ticket_id: string;
  preferences?: Record<string, any>;
}

/**
 * Tickets API Client
 */
export const ticketsApi = {
  // Ticket CRUD
  getTickets: async (params?: any) => {
    const response = await apiClient.get("/tickets", { params });
    return response.data;
  },

  /**
   * Get current user's tickets (for clients)
   * GET /api/v1/tickets/my-tickets
   */
  getMyTickets: async (params?: { page?: number; page_size?: number }) => {
    const response = await apiClient.get("/tickets/my-tickets", { params });
    return response.data;
  },

  getTicket: async (ticketId: string) => {
    const response = await apiClient.get(`/tickets/${ticketId}`);
    return response.data;
  },

  createTicket: async (data: any) => {
    const response = await apiClient.post("/tickets", data);
    return response.data;
  },

  updateTicket: async (ticketId: string, data: any) => {
    const response = await apiClient.put(`/tickets/${ticketId}`, data);
    return response.data;
  },

  deleteTicket: async (ticketId: string) => {
    const response = await apiClient.delete(`/tickets/${ticketId}`);
    return response.data;
  },

  // Ticket Actions
  assignTicket: async (ticketId: string, userId: string) => {
    const response = await apiClient.post(`/tickets/${ticketId}/assign`, {
      assigned_to: userId,
    });
    return response.data;
  },

  updateStatus: async (ticketId: string, status: string) => {
    const response = await apiClient.put(`/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },

  closeTicket: async (ticketId: string, resolution?: string) => {
    const response = await apiClient.post(`/tickets/${ticketId}/close`, {
      resolution,
    });
    return response.data;
  },

  transferTicket: async (ticketId: string, userId: string) => {
    const response = await apiClient.post(`/tickets/${ticketId}/transfer`, {
      user_id: userId,
    });
    return response.data;
  },

  // Replies
  getReplies: async (ticketId: string) => {
    const response = await apiClient.get(`/tickets/${ticketId}/replies`);
    return response.data;
  },

  createReply: async (ticketId: string, data: any) => {
    const response = await apiClient.post(`/tickets/${ticketId}/replies`, data);
    return response.data;
  },

  updateReply: async (replyId: string, data: any) => {
    const response = await apiClient.put(`/tickets/replies/${replyId}`, data);
    return response.data;
  },

  deleteReply: async (replyId: string) => {
    const response = await apiClient.delete(`/tickets/replies/${replyId}`);
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await apiClient.get("/tickets/categories");
    return response.data;
  },

  // Tags
  getTags: async () => {
    const response = await apiClient.get("/tickets/tags");
    return response.data;
  },

  createTag: async (data: { name: string; color: string }) => {
    const response = await apiClient.post("/tickets/tags", data);
    return response.data;
  },

  updateTag: async (tagId: string, data: any) => {
    const response = await apiClient.put(`/tickets/tags/${tagId}`, data);
    return response.data;
  },

  deleteTag: async (tagId: string) => {
    const response = await apiClient.delete(`/tickets/tags/${tagId}`);
    return response.data;
  },

  getTagStatistics: async (tagId: string) => {
    const response = await apiClient.get(`/tickets/tags/${tagId}/statistics`);
    return response.data;
  },

  // Ticket Tags
  getTicketTags: async (ticketId: string) => {
    const response = await apiClient.get(`/tickets/tickets/${ticketId}/tags`);
    return response.data;
  },

  addTicketTag: async (ticketId: string, tagId: string) => {
    const response = await apiClient.post(
      `/tickets/tickets/${ticketId}/tags/${tagId}`
    );
    return response.data;
  },

  removeTicketTag: async (ticketId: string, tagId: string) => {
    const response = await apiClient.delete(
      `/tickets/tickets/${ticketId}/tags/${tagId}`
    );
    return response.data;
  },

  // Watchers
  getWatchers: async (ticketId: string) => {
    const response = await apiClient.get(
      `/tickets/tickets/${ticketId}/watchers`
    );
    return response.data;
  },

  addWatcher: async (ticketId: string, userId: string) => {
    const response = await apiClient.post(
      `/tickets/tickets/${ticketId}/watchers/${userId}`
    );
    return response.data;
  },

  removeWatcher: async (ticketId: string, userId: string) => {
    const response = await apiClient.delete(
      `/tickets/tickets/${ticketId}/watchers/${userId}`
    );
    return response.data;
  },

  isWatching: async (ticketId: string, userId: string) => {
    const response = await apiClient.get(
      `/tickets/tickets/${ticketId}/watchers/${userId}/is-watching`
    );
    return response.data;
  },

  updateWatcherPreferences: async (
    ticketId: string,
    userId: string,
    preferences: any
  ) => {
    const response = await apiClient.put(
      `/tickets/tickets/${ticketId}/watchers/${userId}/preferences`,
      preferences
    );
    return response.data;
  },

  getWatcherStatistics: async (ticketId: string) => {
    const response = await apiClient.get(
      `/tickets/tickets/${ticketId}/watchers/statistics`
    );
    return response.data;
  },

  // SLA Metrics
  getSLAMetrics: async () => {
    const response = await apiClient.get("/tickets/sla/metrics");
    return response.data;
  },

  getOverallSLAMetrics: async () => {
    const response = await apiClient.get("/tickets/sla/metrics/overall");
    return response.data;
  },

  getDailySLAMetrics: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get("/tickets/sla/metrics/daily", {
      params,
    });
    return response.data;
  },

  getAgentSLAMetrics: async (agentId: string) => {
    const response = await apiClient.get(
      `/tickets/sla/metrics/agent/${agentId}`
    );
    return response.data;
  },

  getActiveSLABreaches: async () => {
    const response = await apiClient.get("/tickets/sla/breaches/active");
    return response.data;
  },

  // Attachments
  getAttachments: async (ticketId: string) => {
    const response = await apiClient.get(`/tickets/${ticketId}/attachments`);
    return response.data;
  },

  downloadAttachment: async (ticketId: string, attachmentId: string) => {
    const response = await apiClient.get(
      `/tickets/${ticketId}/attachments/${attachmentId}/download`,
      { responseType: "blob" }
    );
    return response.data;
  },

  // Email Integration
  getEmailAccounts: async () => {
    const response = await apiClient.get(
      "/tickets/email/api/v1/email-accounts"
    );
    return response.data;
  },

  createEmailAccount: async (data: any) => {
    const response = await apiClient.post(
      "/tickets/email/api/v1/email-accounts",
      data
    );
    return response.data;
  },

  updateEmailAccount: async (accountId: string, data: any) => {
    const response = await apiClient.put(
      `/tickets/email/api/v1/email-accounts/${accountId}`,
      data
    );
    return response.data;
  },

  deleteEmailAccount: async (accountId: string) => {
    const response = await apiClient.delete(
      `/tickets/email/api/v1/email-accounts/${accountId}`
    );
    return response.data;
  },

  testEmailConnection: async (accountId: string) => {
    const response = await apiClient.post(
      `/tickets/email/api/v1/email-accounts/${accountId}/test-connection`
    );
    return response.data;
  },

  syncEmailAccount: async (accountId: string) => {
    const response = await apiClient.post(
      `/tickets/email/api/v1/email-accounts/${accountId}/sync-now`
    );
    return response.data;
  },

  getEmailMessages: async (params?: any) => {
    const response = await apiClient.get(
      "/tickets/email/api/v1/email-accounts/messages",
      { params }
    );
    return response.data;
  },

  getEmailMessage: async (messageId: string) => {
    const response = await apiClient.get(
      `/tickets/email/api/v1/email-accounts/messages/${messageId}`
    );
    return response.data;
  },

  markEmailAsSpam: async (messageId: string) => {
    const response = await apiClient.post(
      `/tickets/email/api/v1/email-accounts/messages/${messageId}/mark-spam`
    );
    return response.data;
  },
};

export default ticketsApi;

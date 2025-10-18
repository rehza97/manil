/**
 * Corporate Ticket Management API
 *
 * Handles corporate support ticket management operations
 *
 * @module shared/api/dashboard/corporate/tickets
 */

import { apiClient } from "../../client";

export interface CorporateTicket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
  replies?: TicketReply[];
  tags?: string[];
}

export interface TicketReply {
  id: string;
  message: string;
  author: {
    id: string;
    name: string;
    type: "customer" | "support";
  };
  createdAt: string;
  attachments?: Attachment[];
  isInternal: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
}

export interface ResponseTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  isActive: boolean;
}

export interface AssignTicketData {
  assignedTo: string;
  priority?: "low" | "medium" | "high" | "urgent";
  notes?: string;
}

export interface TransferTicketData {
  transferTo: string;
  reason: string;
  notes?: string;
}

/**
 * Corporate ticket management API
 */
export const corporateTicketsApi = {
  /**
   * Get all tickets
   */
  getTickets: async (params?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    customer?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    tickets: CorporateTicket[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await apiClient.get("/corporate/tickets", { params });
    return response.data;
  },

  /**
   * Get ticket by ID
   */
  getTicket: async (ticketId: string): Promise<CorporateTicket> => {
    const response = await apiClient.get(`/corporate/tickets/${ticketId}`);
    return response.data;
  },

  /**
   * Assign ticket
   */
  assignTicket: async (
    ticketId: string,
    data: AssignTicketData
  ): Promise<void> => {
    await apiClient.post(`/corporate/tickets/${ticketId}/assign`, data);
  },

  /**
   * Transfer ticket
   */
  transferTicket: async (
    ticketId: string,
    data: TransferTicketData
  ): Promise<void> => {
    await apiClient.post(`/corporate/tickets/${ticketId}/transfer`, data);
  },

  /**
   * Update ticket status
   */
  updateTicketStatus: async (
    ticketId: string,
    status: string,
    notes?: string
  ): Promise<void> => {
    await apiClient.put(`/corporate/tickets/${ticketId}/status`, {
      status,
      notes,
    });
  },

  /**
   * Add internal note
   */
  addInternalNote: async (ticketId: string, note: string): Promise<void> => {
    await apiClient.post(`/corporate/tickets/${ticketId}/internal-note`, {
      note,
    });
  },

  /**
   * Get ticket categories
   */
  getTicketCategories: async (): Promise<TicketCategory[]> => {
    const response = await apiClient.get("/corporate/tickets/categories");
    return response.data;
  },

  /**
   * Create ticket category
   */
  createTicketCategory: async (data: {
    name: string;
    description: string;
    color: string;
  }): Promise<TicketCategory> => {
    const response = await apiClient.post(
      "/corporate/tickets/categories",
      data
    );
    return response.data;
  },

  /**
   * Get response templates
   */
  getResponseTemplates: async (): Promise<ResponseTemplate[]> => {
    const response = await apiClient.get("/corporate/tickets/templates");
    return response.data;
  },

  /**
   * Create response template
   */
  createResponseTemplate: async (data: {
    name: string;
    subject: string;
    content: string;
    category: string;
  }): Promise<ResponseTemplate> => {
    const response = await apiClient.post("/corporate/tickets/templates", data);
    return response.data;
  },

  /**
   * Get ticket statistics
   */
  getTicketStats: async (): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
  }> => {
    const response = await apiClient.get("/corporate/tickets/stats");
    return response.data;
  },
};

/**
 * Ticket Service
 *
 * Wrapper around centralized ticketsApi for comprehensive ticket management
 * Uses centralized API client from @/shared/api
 *
 * @module modules/tickets/services/ticketService
 */

import { ticketsApi } from "@/shared/api";
import type {
  Ticket,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketListResponse,
  TicketStatus,
  TicketPriority,
} from "../types";

/**
 * Transform snake_case API response to camelCase Ticket
 */
function transformTicket(apiTicket: any): Ticket {
  return {
    id: apiTicket.id,
    title: apiTicket.title,
    description: apiTicket.description || "",
    status: (apiTicket.status || "open") as TicketStatus,
    priority: (apiTicket.priority || "medium") as TicketPriority,
    customerId: apiTicket.customer_id || apiTicket.customerId || "",
    assignedTo: apiTicket.assigned_to || apiTicket.assignedTo,
    createdAt: apiTicket.created_at || apiTicket.createdAt,
    updatedAt: apiTicket.updated_at || apiTicket.updatedAt,
    createdBy: apiTicket.created_by || apiTicket.createdBy,
    updatedBy: apiTicket.updated_by || apiTicket.updatedBy,
  };
}

/**
 * Ticket service - uses centralized ticketsApi
 * Provides complete ticket management with tags, watchers, SLA, and email
 */
export const ticketService = {
  // ========== Basic CRUD ==========

  async getAll(
    page = 1,
    pageSize = 20,
    filters?: any,
    isClient: boolean = false
  ): Promise<TicketListResponse> {
    // Ensure page is always >= 1
    const validPage = Math.max(1, page || 1);
    const validPageSize = Math.max(1, pageSize || 20);

    console.log("[ticketService.getAll] Starting request:", {
      page: validPage,
      pageSize: validPageSize,
      isClient,
      filters,
    });

    let response;
    try {
      if (isClient) {
        // Clients use /my-tickets endpoint
        console.log("[ticketService.getAll] Calling getMyTickets API");
        response = await ticketsApi.getMyTickets({
          page: validPage,
          page_size: validPageSize,
        });
      } else {
        // Admins/corporate use /tickets endpoint
        console.log("[ticketService.getAll] Calling getTickets API");
        response = await ticketsApi.getTickets({
          page: validPage,
          page_size: validPageSize,
          ...filters,
        });
      }

      console.log("[ticketService.getAll] Raw API response:", response);
      console.log("[ticketService.getAll] Response type:", typeof response);
      console.log("[ticketService.getAll] Is array?", Array.isArray(response));
      console.log(
        "[ticketService.getAll] Has 'data'?",
        "data" in (response || {})
      );
      console.log(
        "[ticketService.getAll] Has 'pagination'?",
        "pagination" in (response || {})
      );

      // Transform backend response format to match frontend types
      if (response && "data" in response && "pagination" in response) {
        console.log(
          "[ticketService.getAll] Transforming response with data + pagination"
        );
        const transformed = {
          data: (response.data || []).map(transformTicket),
          total: response.pagination?.total || response.data.length,
          page: response.pagination?.page || validPage,
          pageSize: response.pagination?.page_size || validPageSize,
          totalPages: response.pagination?.total_pages || 1,
          pagination: response.pagination,
        } as TicketListResponse;
        console.log(
          "[ticketService.getAll] Transformed response:",
          transformed
        );
        return transformed;
      }
      // If response is just an array, transform it
      if (Array.isArray(response)) {
        console.log("[ticketService.getAll] Transforming array response");
        const transformed = {
          data: response.map(transformTicket),
          total: response.length,
          page: validPage,
          pageSize: validPageSize,
          totalPages: 1,
        } as TicketListResponse;
        console.log(
          "[ticketService.getAll] Transformed array response:",
          transformed
        );
        return transformed;
      }
      console.log("[ticketService.getAll] Returning response as-is:", response);
      return response as TicketListResponse;
    } catch (error) {
      console.error("[ticketService.getAll] Error:", error);
      throw error;
    }
  },

  async getById(id: string): Promise<Ticket> {
    const ticket = await ticketsApi.getTicket(id);
    return transformTicket(ticket);
  },

  async create(data: CreateTicketDTO): Promise<Ticket> {
    const ticket = await ticketsApi.createTicket(data);
    return transformTicket(ticket);
  },

  async update(id: string, data: UpdateTicketDTO): Promise<Ticket> {
    return await ticketsApi.updateTicket(id, data);
  },

  async delete(id: string): Promise<void> {
    await ticketsApi.deleteTicket(id);
  },

  // ========== Ticket Actions ==========

  async assign(id: string, userId: string): Promise<Ticket> {
    await ticketsApi.assignTicket(id, userId);
    return await ticketsApi.getTicket(id);
  },

  async updateStatus(id: string, status: string): Promise<Ticket> {
    await ticketsApi.updateStatus(id, status);
    return await ticketsApi.getTicket(id);
  },

  async close(id: string, resolution?: string): Promise<Ticket> {
    await ticketsApi.closeTicket(id, resolution);
    return await ticketsApi.getTicket(id);
  },

  async transfer(id: string, userId: string): Promise<Ticket> {
    await ticketsApi.transferTicket(id, userId);
    return await ticketsApi.getTicket(id);
  },

  // ========== Replies ==========

  async getReplies(ticketId: string): Promise<any[]> {
    return await ticketsApi.getReplies(ticketId);
  },

  async createReply(
    ticketId: string,
    data: { message: string; is_internal?: boolean }
  ): Promise<any> {
    return await ticketsApi.createReply(ticketId, {
      message: data.message,
      is_internal: data.is_internal || false,
    });
  },

  async updateReply(replyId: string, data: any): Promise<any> {
    return await ticketsApi.updateReply(replyId, data);
  },

  async deleteReply(replyId: string): Promise<void> {
    await ticketsApi.deleteReply(replyId);
  },

  // ========== Tags ==========

  async getTags(): Promise<any[]> {
    return await ticketsApi.getTags();
  },

  async addTag(ticketId: string, tagId: string): Promise<any> {
    return await ticketsApi.addTicketTag(ticketId, tagId);
  },

  async removeTag(ticketId: string, tagId: string): Promise<void> {
    await ticketsApi.removeTicketTag(ticketId, tagId);
  },

  // ========== Watchers ==========

  async getWatchers(ticketId: string): Promise<any[]> {
    return await ticketsApi.getWatchers(ticketId);
  },

  async addWatcher(ticketId: string, userId: string): Promise<any> {
    return await ticketsApi.addWatcher(ticketId, userId);
  },

  async removeWatcher(ticketId: string, userId: string): Promise<void> {
    await ticketsApi.removeWatcher(ticketId, userId);
  },

  // ========== SLA Metrics ==========

  async getSLAMetrics(): Promise<any> {
    return await ticketsApi.getSLAMetrics();
  },

  async getActiveSLABreaches(): Promise<any[]> {
    return await ticketsApi.getActiveSLABreaches();
  },

  // ========== Attachments ==========

  async getAttachments(ticketId: string): Promise<any[]> {
    return await ticketsApi.getAttachments(ticketId);
  },

  async downloadAttachment(
    ticketId: string,
    attachmentId: string,
    filename: string
  ): Promise<void> {
    const blob = await ticketsApi.downloadAttachment(ticketId, attachmentId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // ========== Categories ==========

  async getCategories(): Promise<any[]> {
    return await ticketsApi.getCategories();
  },

  // ========== Bulk Actions ==========

  async bulkUpdateStatus(ticketIds: string[], status: string): Promise<void> {
    // Update status for multiple tickets
    await Promise.all(ticketIds.map((id) => this.updateStatus(id, status)));
  },
};

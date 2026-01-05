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
} from "../types";

/**
 * Ticket service - uses centralized ticketsApi
 * Provides complete ticket management with tags, watchers, SLA, and email
 */
export const ticketService = {
  // ========== Basic CRUD ==========

  async getAll(page = 1, pageSize = 20, filters?: any): Promise<TicketListResponse> {
    const response = await ticketsApi.getTickets({
      page,
      page_size: pageSize,
      ...filters,
    });
    // Transform backend response format to match frontend types
    if (response && 'data' in response && 'pagination' in response) {
      return {
        data: response.data,
        total: response.pagination?.total || response.data.length,
        page: response.pagination?.page || page,
        pageSize: response.pagination?.page_size || pageSize,
        totalPages: response.pagination?.total_pages || 1,
        pagination: response.pagination,
      } as TicketListResponse;
    }
    return response as TicketListResponse;
  },

  async getById(id: string): Promise<Ticket> {
    return await ticketsApi.getTicket(id);
  },

  async create(data: CreateTicketDTO): Promise<Ticket> {
    return await ticketsApi.createTicket(data);
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

  async createReply(ticketId: string, data: { message: string; is_internal?: boolean }): Promise<any> {
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

  async downloadAttachment(ticketId: string, attachmentId: string, filename: string): Promise<void> {
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
    await Promise.all(
      ticketIds.map((id) => this.updateStatus(id, status))
    );
  },
};

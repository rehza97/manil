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
      skip: (page - 1) * pageSize,
      limit: pageSize,
      ...filters,
    });
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

  async createReply(ticketId: string, data: any): Promise<any> {
    return await ticketsApi.createReply(ticketId, data);
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
};

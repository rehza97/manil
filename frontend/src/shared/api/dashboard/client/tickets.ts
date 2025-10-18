/**
 * Client Tickets API
 *
 * @module shared/api/dashboard/client/tickets
 */

import { apiClient } from "../../client";

export const clientTicketsApi = {
  getTickets: async (): Promise<any> => {
    const response = await apiClient.get("/client/tickets");
    return response.data;
  },

  getTicket: async (ticketId: string): Promise<any> => {
    const response = await apiClient.get(`/client/tickets/${ticketId}`);
    return response.data;
  },

  createTicket: async (data: any): Promise<any> => {
    const response = await apiClient.post("/client/tickets", data);
    return response.data;
  },

  replyToTicket: async (ticketId: string, data: any): Promise<any> => {
    const response = await apiClient.post(
      `/client/tickets/${ticketId}/reply`,
      data
    );
    return response.data;
  },

  closeTicket: async (ticketId: string, reason?: string): Promise<void> => {
    await apiClient.post(`/client/tickets/${ticketId}/close`, { reason });
  },
};

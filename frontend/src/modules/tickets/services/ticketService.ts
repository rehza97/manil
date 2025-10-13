import { apiClient } from "@/shared/api";
import type {
  Ticket,
  CreateTicketDTO,
  UpdateTicketDTO,
  TicketListResponse,
} from "../types";

export const ticketService = {
  async getAll(page = 1, pageSize = 20): Promise<TicketListResponse> {
    const response = await apiClient.get<TicketListResponse>("/tickets", {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getById(id: string): Promise<Ticket> {
    const response = await apiClient.get<Ticket>(`/tickets/${id}`);
    return response.data;
  },

  async create(data: CreateTicketDTO): Promise<Ticket> {
    const response = await apiClient.post<Ticket>("/tickets", data);
    return response.data;
  },

  async update(id: string, data: UpdateTicketDTO): Promise<Ticket> {
    const response = await apiClient.put<Ticket>(`/tickets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/tickets/${id}`);
  },

  async assign(id: string, userId: string): Promise<Ticket> {
    const response = await apiClient.post<Ticket>(`/tickets/${id}/assign`, {
      userId,
    });
    return response.data;
  },
};

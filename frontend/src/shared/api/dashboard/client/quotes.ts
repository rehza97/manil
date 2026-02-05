/**
 * Client Dashboard Quotes API
 * List, view, accept and decline quotes (devis). Uses shared /quotes API;
 * backend filters by customer for client role.
 *
 * @module shared/api/dashboard/client/quotes
 */

import { apiClient } from "../../client";

export interface ClientQuotesListParams {
  skip?: number;
  limit?: number;
  status?: string;
}

export const clientQuotesApi = {
  getQuotes: async (params?: ClientQuotesListParams): Promise<any> => {
    const response = await apiClient.get("/quotes", { params });
    return response.data;
  },

  getQuote: async (quoteId: string): Promise<any> => {
    const response = await apiClient.get(`/quotes/${quoteId}`);
    return response.data;
  },

  createQuote: async (data: Record<string, unknown>): Promise<any> => {
    const response = await apiClient.post("/quotes", data);
    return response.data;
  },

  updateQuote: async (
    quoteId: string,
    data: Record<string, unknown>
  ): Promise<any> => {
    const response = await apiClient.put(`/quotes/${quoteId}`, data);
    return response.data;
  },

  acceptQuote: async (quoteId: string): Promise<any> => {
    const response = await apiClient.post(`/quotes/${quoteId}/accept`);
    return response.data;
  },

  declineQuote: async (quoteId: string, reason?: string): Promise<any> => {
    const response = await apiClient.post(`/quotes/${quoteId}/decline`, {
      reason,
    });
    return response.data;
  },

  /** Submit draft quote (draft -> sent) so you can then accept and commander. */
  sendQuote: async (quoteId: string, sendEmail = false): Promise<any> => {
    const response = await apiClient.post(`/quotes/${quoteId}/send`, {
      send_email: sendEmail,
    });
    return response.data;
  },

  getQuotePDF: async (quoteId: string): Promise<Blob> => {
    const response = await apiClient.get(`/quotes/${quoteId}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
};

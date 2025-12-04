/**
 * Quotes API Client
 *
 * @module shared/api/quotes
 */

import { apiClient } from "./client";

export const quotesApi = {
  getQuotes: async (params?: any) => {
    const response = await apiClient.get("/quotes", { params });
    return response.data;
  },

  getQuote: async (quoteId: string) => {
    const response = await apiClient.get(`/quotes/${quoteId}`);
    return response.data;
  },

  createQuote: async (data: any) => {
    const response = await apiClient.post("/quotes", data);
    return response.data;
  },

  updateQuote: async (quoteId: string, data: any) => {
    const response = await apiClient.put(`/quotes/${quoteId}`, data);
    return response.data;
  },

  deleteQuote: async (quoteId: string) => {
    const response = await apiClient.delete(`/quotes/${quoteId}`);
    return response.data;
  },

  submitForApproval: async (quoteId: string) => {
    const response = await apiClient.post(
      `/quotes/${quoteId}/submit-for-approval`
    );
    return response.data;
  },

  approveQuote: async (quoteId: string, notes?: string) => {
    const response = await apiClient.post(`/quotes/${quoteId}/approve`, {
      notes,
    });
    return response.data;
  },

  sendQuote: async (quoteId: string) => {
    const response = await apiClient.post(`/quotes/${quoteId}/send`);
    return response.data;
  },

  acceptQuote: async (quoteId: string) => {
    const response = await apiClient.post(`/quotes/${quoteId}/accept`);
    return response.data;
  },

  declineQuote: async (quoteId: string, reason?: string) => {
    const response = await apiClient.post(`/quotes/${quoteId}/decline`, {
      reason,
    });
    return response.data;
  },

  createQuoteVersion: async (quoteId: string) => {
    const response = await apiClient.post(`/quotes/${quoteId}/create-version`);
    return response.data;
  },

  getQuoteVersions: async (quoteId: string) => {
    const response = await apiClient.get(`/quotes/${quoteId}/versions`);
    return response.data;
  },

  getQuoteTimeline: async (quoteId: string) => {
    const response = await apiClient.get(`/quotes/${quoteId}/timeline`);
    return response.data;
  },

  getQuotePDF: async (quoteId: string) => {
    const response = await apiClient.get(`/quotes/${quoteId}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  expireOldQuotes: async () => {
    const response = await apiClient.post("/quotes/expire-old-quotes");
    return response.data;
  },
};

export default quotesApi;

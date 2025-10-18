/**
 * Corporate Quote Management API
 *
 * @module shared/api/dashboard/corporate/quotes
 */

import { apiClient } from "../../client";

export interface Quote {
  id: string;
  quoteNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  items: any[];
  total: number;
  currency: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export const corporateQuotesApi = {
  getQuotes: async (): Promise<{ quotes: Quote[]; total: number }> => {
    const response = await apiClient.get("/corporate/quotes");
    return response.data;
  },

  getQuote: async (quoteId: string): Promise<Quote> => {
    const response = await apiClient.get(`/corporate/quotes/${quoteId}`);
    return response.data;
  },

  createQuote: async (data: any): Promise<Quote> => {
    const response = await apiClient.post("/corporate/quotes", data);
    return response.data;
  },

  approveQuote: async (quoteId: string): Promise<void> => {
    await apiClient.post(`/corporate/quotes/${quoteId}/approve`);
  },

  convertToOrder: async (quoteId: string): Promise<any> => {
    const response = await apiClient.post(
      `/corporate/quotes/${quoteId}/convert`
    );
    return response.data;
  },
};

/**
 * Invoices API Client
 *
 * @module shared/api/invoices
 */

import { apiClient } from "./client";

export const invoicesApi = {
  getInvoices: async (params?: any) => {
    const response = await apiClient.get("/invoices", { params });
    return response.data;
  },

  getInvoice: async (invoiceId: string) => {
    const response = await apiClient.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  createInvoice: async (data: any) => {
    const response = await apiClient.post("/invoices", data);
    return response.data;
  },

  updateInvoice: async (invoiceId: string, data: any) => {
    const response = await apiClient.put(`/invoices/${invoiceId}`, data);
    return response.data;
  },

  deleteInvoice: async (invoiceId: string) => {
    const response = await apiClient.delete(`/invoices/${invoiceId}`);
    return response.data;
  },

  issueInvoice: async (invoiceId: string) => {
    const response = await apiClient.post(`/invoices/${invoiceId}/issue`);
    return response.data;
  },

  sendInvoice: async (invoiceId: string) => {
    const response = await apiClient.post(`/invoices/${invoiceId}/send`);
    return response.data;
  },

  recordPayment: async (
    invoiceId: string,
    data: {
      amount: number;
      payment_method: string;
      payment_date?: string;
      payment_notes?: string;
    }
  ) => {
    const response = await apiClient.post(
      `/invoices/${invoiceId}/payment`,
      data
    );
    return response.data;
  },

  cancelInvoice: async (invoiceId: string, reason?: string) => {
    const response = await apiClient.post(`/invoices/${invoiceId}/cancel`, {
      reason,
    });
    return response.data;
  },

  convertFromQuote: async (quoteId: string) => {
    const response = await apiClient.post("/invoices/convert-from-quote", {
      quote_id: quoteId,
    });
    return response.data;
  },

  getInvoiceTimeline: async (invoiceId: string) => {
    const response = await apiClient.get(`/invoices/${invoiceId}/timeline`);
    return response.data;
  },

  getInvoicePDF: async (invoiceId: string, includeQr: boolean = true) => {
    const response = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
      params: { include_qr: includeQr },
      responseType: "blob",
    });
    return response.data;
  },

  getInvoiceStatistics: async () => {
    const response = await apiClient.get("/invoices/statistics/overview");
    return response.data;
  },

  updateOverdueInvoices: async () => {
    const response = await apiClient.post("/invoices/update-overdue");
    return response.data;
  },
};

export default invoicesApi;

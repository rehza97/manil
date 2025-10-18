/**
 * Client Invoices API
 *
 * @module shared/api/dashboard/client/invoices
 */

import { apiClient } from "../../client";

export const clientInvoicesApi = {
  getInvoices: async (): Promise<{ invoices: unknown[]; total: number }> => {
    const response = await apiClient.get("/client/invoices");
    return response.data;
  },

  getInvoice: async (invoiceId: string): Promise<unknown> => {
    const response = await apiClient.get(`/client/invoices/${invoiceId}`);
    return response.data;
  },

  downloadInvoice: async (invoiceId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/client/invoices/${invoiceId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  getPaymentMethods: async (): Promise<unknown[]> => {
    const response = await apiClient.get("/client/payment-methods");
    return response.data;
  },

  payInvoice: async (invoiceId: string, data: unknown): Promise<unknown> => {
    const response = await apiClient.post(
      `/client/invoices/${invoiceId}/pay`,
      data
    );
    return response.data;
  },
};

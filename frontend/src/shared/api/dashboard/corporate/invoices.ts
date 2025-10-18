/**
 * Corporate Invoice Management API
 *
 * @module shared/api/dashboard/corporate/invoices
 */

import { apiClient } from "../../client";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const corporateInvoicesApi = {
  getInvoices: async (): Promise<{ invoices: Invoice[]; total: number }> => {
    const response = await apiClient.get("/corporate/invoices");
    return response.data;
  },

  getInvoice: async (invoiceId: string): Promise<Invoice> => {
    const response = await apiClient.get(`/corporate/invoices/${invoiceId}`);
    return response.data;
  },

  createInvoice: async (data: any): Promise<Invoice> => {
    const response = await apiClient.post("/corporate/invoices", data);
    return response.data;
  },

  sendInvoice: async (invoiceId: string): Promise<void> => {
    await apiClient.post(`/corporate/invoices/${invoiceId}/send`);
  },

  recordPayment: async (invoiceId: string, data: any): Promise<void> => {
    await apiClient.post(`/corporate/invoices/${invoiceId}/payment`, data);
  },
};

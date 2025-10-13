import { apiClient } from "@/shared/api";
import type {
  Invoice,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  InvoiceListResponse,
} from "../types";

export const invoiceService = {
  async getAll(page = 1, pageSize = 20): Promise<InvoiceListResponse> {
    const response = await apiClient.get<InvoiceListResponse>("/invoices", {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getById(id: string): Promise<Invoice> {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  async create(data: CreateInvoiceDTO): Promise<Invoice> {
    const response = await apiClient.post<Invoice>("/invoices", data);
    return response.data;
  },

  async update(id: string, data: UpdateInvoiceDTO): Promise<Invoice> {
    const response = await apiClient.put<Invoice>(`/invoices/${id}`, data);
    return response.data;
  },

  async downloadPDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/invoices/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
};

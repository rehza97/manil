/**
 * Invoice Service
 *
 * Wrapper around centralized invoicesApi for module-specific functionality
 * Uses centralized API client from @/shared/api
 *
 * @module modules/invoices/services/invoiceService
 */

import { invoicesApi } from "@/shared/api";
import type {
  Invoice,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  InvoiceListResponse,
} from "../types";

/**
 * Invoice service - uses centralized invoicesApi
 * Provides comprehensive invoice management with full workflow support
 */
export const invoiceService = {
  /**
   * Get all invoices with pagination and filters
   */
  async getAll(
    page = 1,
    pageSize = 20,
    filters?: {
      status?: string;
      search?: string;
      overdueOnly?: boolean;
      customerId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<InvoiceListResponse> {
    const params: any = {
      page,
      page_size: pageSize,
    };

    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.overdueOnly) params.overdue_only = filters.overdueOnly;
      if (filters.customerId) params.customer_id = filters.customerId;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
    }

    const response = await invoicesApi.getInvoices(params);
    return response as InvoiceListResponse;
  },

  /**
   * Get invoice by ID
   */
  async getById(id: string): Promise<Invoice> {
    return await invoicesApi.getInvoice(id);
  },

  /**
   * Create new invoice
   */
  async create(data: CreateInvoiceDTO): Promise<Invoice> {
    return await invoicesApi.createInvoice(data);
  },

  /**
   * Update invoice
   */
  async update(id: string, data: UpdateInvoiceDTO): Promise<Invoice> {
    return await invoicesApi.updateInvoice(id, data);
  },

  /**
   * Delete invoice
   */
  async delete(id: string): Promise<void> {
    await invoicesApi.deleteInvoice(id);
  },

  /**
   * Issue invoice (change from draft to issued)
   */
  async issue(id: string): Promise<Invoice> {
    await invoicesApi.issueInvoice(id);
    return await invoicesApi.getInvoice(id);
  },

  /**
   * Send invoice to customer
   */
  async send(id: string): Promise<Invoice> {
    await invoicesApi.sendInvoice(id);
    return await invoicesApi.getInvoice(id);
  },

  /**
   * Record payment for invoice
   */
  async recordPayment(
    id: string,
    data: {
      amount: number;
      payment_method: string;
      payment_date?: string;
      payment_notes?: string;
    }
  ): Promise<Invoice> {
    await invoicesApi.recordPayment(id, data);
    return await invoicesApi.getInvoice(id);
  },

  /**
   * Cancel invoice
   */
  async cancel(id: string, reason?: string): Promise<Invoice> {
    await invoicesApi.cancelInvoice(id, reason);
    return await invoicesApi.getInvoice(id);
  },

  /**
   * Convert quote to invoice
   */
  async convertFromQuote(quoteId: string): Promise<Invoice> {
    return await invoicesApi.convertFromQuote(quoteId);
  },

  /**
   * Get invoice timeline
   */
  async getTimeline(id: string): Promise<any> {
    return await invoicesApi.getInvoiceTimeline(id);
  },

  /**
   * Get invoice statistics
   */
  async getStatistics(): Promise<any> {
    return await invoicesApi.getInvoiceStatistics();
  },

  /**
   * Download invoice PDF
   */
  async downloadPDF(id: string, includeQr: boolean = true): Promise<Blob> {
    return await invoicesApi.getInvoicePDF(id, includeQr);
  },

  /**
   * Helper to trigger browser download
   */
  async triggerPDFDownload(
    id: string,
    fileName: string,
    includeQr: boolean = true
  ): Promise<void> {
    const blob = await this.downloadPDF(id, includeQr);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Update overdue invoices (admin function)
   */
  async updateOverdue(): Promise<any> {
    return await invoicesApi.updateOverdueInvoices();
  },
};

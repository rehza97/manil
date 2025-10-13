import { AuditFields, PaginatedResponse } from "@/shared/types";

export enum InvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export interface Invoice extends AuditFields {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidDate?: string;
}

export interface CreateInvoiceDTO {
  customerId: string;
  orderId: string;
  dueDate: string;
}

export interface UpdateInvoiceDTO {
  status?: InvoiceStatus;
  paidDate?: string;
}

export type InvoiceListResponse = PaginatedResponse<Invoice>;

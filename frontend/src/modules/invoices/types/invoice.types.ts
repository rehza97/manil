import type { AuditFields, PaginatedResponse } from "@/shared/types";

export enum InvoiceStatus {
  DRAFT = "draft",
  ISSUED = "issued",
  SENT = "sent",
  PAID = "paid",
  PARTIALLY_PAID = "partially_paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  BANK_TRANSFER = "bank_transfer",
  CHECK = "check",
  CASH = "cash",
  CREDIT_CARD = "credit_card",
  MOBILE_PAYMENT = "mobile_payment",
  OTHER = "other",
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_id?: string;
  created_at: string;
}

export interface Invoice extends AuditFields {
  id: string;
  invoice_number: string;
  customer_id: string;
  quote_id?: string;
  title: string;
  description?: string;
  status: InvoiceStatus;
  
  // Financial fields
  subtotal_amount: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_method?: PaymentMethod;
  
  // Dates
  issue_date: string;
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  
  // Items
  items: InvoiceItem[];
  
  // Notes
  notes?: string;
  
  // Currency
  currency: string;
}

export interface CreateInvoiceDTO {
  customer_id: string;
  quote_id?: string;
  title: string;
  description?: string;
  items: InvoiceItemCreate[];
  issue_date: string;
  due_date: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
}

export interface InvoiceItemCreate {
  description: string;
  quantity: number;
  unit_price: number;
  product_id?: string;
}

export interface UpdateInvoiceDTO {
  title?: string;
  description?: string;
  items?: InvoiceItemCreate[];
  tax_rate?: number;
  discount_amount?: number;
  due_date?: string;
  notes?: string;
}

export interface PaymentRecordDTO {
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  payment_notes?: string;
}

export type InvoiceListResponse = PaginatedResponse<Invoice>;

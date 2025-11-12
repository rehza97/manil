/**
 * Quote and service request types
 */

export enum QuoteStatus {
  PENDING = "pending",
  REVIEWED = "reviewed",
  QUOTED = "quoted",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum QuotePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * Quote Line Item
 */
export interface QuoteLineItem {
  id: string;
  quote_id: string;
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_percentage: number;
  discount_amount: number;
  final_price: number;
  created_at: string;
  updated_at: string;
}

/**
 * Quote Request
 */
export interface QuoteRequest {
  id: string;
  customer_id?: string;
  product_id?: string;
  title: string;
  description?: string;
  quantity: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  company_name?: string;
  status: QuoteStatus;
  priority: QuotePriority;
  estimated_price?: number;
  final_price?: number;
  internal_notes?: string;
  customer_notes?: string;
  requested_at: string;
  reviewed_at?: string;
  quoted_at?: string;
  expires_at?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  line_items: QuoteLineItem[];
}

/**
 * Create Quote Request DTO
 */
export interface CreateQuoteRequestDTO {
  title: string;
  description?: string;
  quantity: number;
  product_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  company_name?: string;
  priority?: QuotePriority;
  customer_notes?: string;
  line_items?: Array<{
    product_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    product_id?: string;
  }>;
}

/**
 * Update Quote Request DTO
 */
export interface UpdateQuoteRequestDTO {
  title?: string;
  description?: string;
  status?: QuoteStatus;
  priority?: QuotePriority;
  estimated_price?: number;
  final_price?: number;
  internal_notes?: string;
  customer_notes?: string;
  expires_at?: string;
}

/**
 * Quote Request List Response
 */
export interface QuoteRequestListResponse {
  data: QuoteRequest[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Service Request
 */
export interface ServiceRequest {
  id: string;
  customer_id?: string;
  quote_request_id?: string;
  service_type: string;
  description: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  company_name?: string;
  status: QuoteStatus;
  priority: QuotePriority;
  requested_date?: string;
  preferred_time?: string;
  duration_hours?: number;
  internal_notes?: string;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create Service Request DTO
 */
export interface CreateServiceRequestDTO {
  service_type: string;
  description: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  company_name?: string;
  requested_date?: string;
  preferred_time?: string;
  duration_hours?: number;
  priority?: QuotePriority;
  customer_notes?: string;
}

/**
 * Update Service Request DTO
 */
export interface UpdateServiceRequestDTO {
  service_type?: string;
  description?: string;
  status?: QuoteStatus;
  priority?: QuotePriority;
  requested_date?: string;
  preferred_time?: string;
  duration_hours?: number;
  internal_notes?: string;
  customer_notes?: string;
}

/**
 * Service Request List Response
 */
export interface ServiceRequestListResponse {
  data: ServiceRequest[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

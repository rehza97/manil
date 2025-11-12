/**
 * Order management types
 * Complete order workflow with status management, timeline, and calculations
 */

export enum OrderStatus {
  REQUEST = "request",
  VALIDATED = "validated",
  IN_PROGRESS = "in_progress",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

/**
 * Order Item - product in an order
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  total_price: number;
  variant_sku?: string;
  notes?: string;
  created_at: string;
}

export interface CreateOrderItemDTO {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  variant_sku?: string;
  notes?: string;
}

/**
 * Order - customer order with full details
 */
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  quote_id?: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  customer_notes?: string;
  internal_notes?: string;
  delivery_address?: string;
  delivery_contact?: string;
  items: OrderItem[];
  validated_at?: string;
  in_progress_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderDTO {
  customer_id: string;
  quote_id?: string;
  customer_notes?: string;
  delivery_address?: string;
  delivery_contact?: string;
  items: CreateOrderItemDTO[];
}

export interface UpdateOrderDTO {
  customer_notes?: string;
  internal_notes?: string;
  delivery_address?: string;
  delivery_contact?: string;
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
  notes?: string;
}

/**
 * Order List Response
 */
export interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Order Timeline Entry
 */
export interface OrderTimelineEntry {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  action_type: string;
  description?: string;
  performed_by: string;
  created_at: string;
}

export interface OrderTimelineListResponse {
  data: OrderTimelineEntry[];
  total: number;
}

/**
 * Order Summary for display
 */
export interface OrderSummary {
  order_id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  item_count: number;
  created_at: string;
}

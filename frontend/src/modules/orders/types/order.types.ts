import { AuditFields, PaginatedResponse } from "@/shared/types";

export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface Order extends AuditFields {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderDTO {
  customerId: string;
  items: OrderItem[];
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
}

export type OrderListResponse = PaginatedResponse<Order>;

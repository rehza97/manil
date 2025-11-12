/**
 * Order service for API calls
 */

import { apiClient } from "@/shared/api";
import type {
  Order,
  CreateOrderDTO,
  UpdateOrderDTO,
  UpdateOrderStatusDTO,
  OrderListResponse,
  OrderTimelineListResponse,
  OrderStatus,
} from "../types";

export const orderService = {
  /**
   * List all orders with optional filtering
   */
  async getAll(
    page = 1,
    pageSize = 20,
    filters?: {
      customer_id?: string;
      status?: OrderStatus;
    }
  ): Promise<OrderListResponse> {
    const response = await apiClient.get<OrderListResponse>("/orders", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  },

  /**
   * Get single order by ID
   */
  async getById(id: string): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  /**
   * Create a new order
   */
  async create(data: CreateOrderDTO): Promise<Order> {
    const response = await apiClient.post<Order>("/orders", data);
    return response.data;
  },

  /**
   * Update order details (notes, delivery info)
   */
  async update(id: string, data: UpdateOrderDTO): Promise<Order> {
    const response = await apiClient.put<Order>(`/orders/${id}`, data);
    return response.data;
  },

  /**
   * Update order status
   */
  async updateStatus(
    id: string,
    data: UpdateOrderStatusDTO
  ): Promise<Order> {
    const response = await apiClient.post<Order>(
      `/orders/${id}/status`,
      data
    );
    return response.data;
  },

  /**
   * Delete order (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/orders/${id}`);
  },

  /**
   * Get order timeline (status change history)
   */
  async getTimeline(orderId: string): Promise<OrderTimelineListResponse> {
    const response = await apiClient.get<OrderTimelineListResponse>(
      `/orders/${orderId}/timeline`
    );
    return response.data;
  },

  /**
   * Get all orders for a specific customer
   */
  async getCustomerOrders(
    customerId: string,
    page = 1,
    pageSize = 20
  ): Promise<OrderListResponse> {
    const response = await apiClient.get<OrderListResponse>(
      `/orders/customer/${customerId}`,
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  },
};

/**
 * Order Service
 *
 * Wrapper around centralized ordersApi for module-specific functionality
 * Uses centralized API client from @/shared/api
 *
 * @module modules/orders/services/orderService
 */

import { ordersApi } from "@/shared/api";
import type {
  Order,
  CreateOrderDTO,
  UpdateOrderDTO,
  UpdateOrderStatusDTO,
  OrderListResponse,
  OrderTimelineListResponse,
  OrderStatus,
} from "../types";

/**
 * Order service - uses centralized ordersApi
 * Provides module-specific interface aligned with component needs
 */
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
    // Use centralized API
    const response = await ordersApi.getOrders({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      ...filters,
    });
    return response as OrderListResponse;
  },

  /**
   * Get single order by ID
   */
  async getById(id: string): Promise<Order> {
    return await ordersApi.getOrder(id);
  },

  /**
   * Create a new order
   */
  async create(data: CreateOrderDTO): Promise<Order> {
    return await ordersApi.createOrder(data);
  },

  /**
   * Update order details (notes, delivery info)
   */
  async update(id: string, data: UpdateOrderDTO): Promise<Order> {
    return await ordersApi.updateOrder(id, data);
  },

  /**
   * Update order status
   */
  async updateStatus(
    id: string,
    data: UpdateOrderStatusDTO
  ): Promise<Order> {
    return await ordersApi.updateOrderStatus(id, data.status);
  },

  /**
   * Delete order (soft delete)
   */
  async delete(id: string): Promise<void> {
    await ordersApi.deleteOrder(id);
  },

  /**
   * Get order timeline (status change history)
   */
  async getTimeline(orderId: string): Promise<OrderTimelineListResponse> {
    const response = await ordersApi.getOrderTimeline(orderId);
    return response as OrderTimelineListResponse;
  },

  /**
   * Get all orders for a specific customer
   */
  async getCustomerOrders(
    customerId: string,
    page = 1,
    pageSize = 20
  ): Promise<OrderListResponse> {
    const response = await ordersApi.getCustomerOrders(customerId);
    return response as OrderListResponse;
  },
};

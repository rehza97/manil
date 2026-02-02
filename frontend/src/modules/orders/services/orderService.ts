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
    // Use centralized API - backend expects page/page_size, not skip/limit
    const response = await ordersApi.getOrders({
      page,
      page_size: pageSize,
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
    return await ordersApi.updateOrderStatus(id, {
      status: data.status,
      notes: data.notes,
    });
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
   * Get order PDF as blob for download
   */
  async getOrderPDF(orderId: string): Promise<Blob> {
    return await ordersApi.getOrderPDF(orderId) as Blob;
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

  /**
   * Get allowed status transitions for an order
   */
  async getAllowedTransitions(orderId: string): Promise<{ allowed_transitions: OrderStatus[] }> {
    const response = await ordersApi.getAllowedTransitions(orderId);
    return response as { allowed_transitions: OrderStatus[] };
  },
};

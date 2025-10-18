/**
 * Corporate Order Management API
 *
 * @module shared/api/dashboard/corporate/orders
 */

import { apiClient } from "../../client";

export interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  items: any[];
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export const corporateOrdersApi = {
  getOrders: async (): Promise<{ orders: Order[]; total: number }> => {
    const response = await apiClient.get("/corporate/orders");
    return response.data;
  },

  getOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get(`/corporate/orders/${orderId}`);
    return response.data;
  },

  processOrder: async (orderId: string): Promise<void> => {
    await apiClient.post(`/corporate/orders/${orderId}/process`);
  },

  approveOrder: async (orderId: string): Promise<void> => {
    await apiClient.post(`/corporate/orders/${orderId}/approve`);
  },

  deliverOrder: async (orderId: string): Promise<void> => {
    await apiClient.post(`/corporate/orders/${orderId}/deliver`);
  },
};

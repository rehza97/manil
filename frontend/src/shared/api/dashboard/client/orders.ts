/**
 * Client Orders API
 *
 * @module shared/api/dashboard/client/orders
 */

import { apiClient } from "../../client";

export const clientOrdersApi = {
  getOrders: async (): Promise<any> => {
    const response = await apiClient.get("/client/orders");
    return response.data;
  },

  getOrder: async (orderId: string): Promise<any> => {
    const response = await apiClient.get(`/client/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: any): Promise<any> => {
    const response = await apiClient.post("/client/orders", data);
    return response.data;
  },

  cancelOrder: async (orderId: string, reason?: string): Promise<void> => {
    await apiClient.post(`/client/orders/${orderId}/cancel`, { reason });
  },

  getOrderTracking: async (orderId: string): Promise<any[]> => {
    const response = await apiClient.get(`/client/orders/${orderId}/tracking`);
    return response.data;
  },
};

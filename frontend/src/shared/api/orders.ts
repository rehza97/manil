/**
 * Orders API Client
 *
 * @module shared/api/orders
 */

import { apiClient } from "./client";

export const ordersApi = {
  getOrders: async (params?: any) => {
    const response = await apiClient.get("/orders", { params });
    return response.data;
  },

  getOrder: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (data: any) => {
    const response = await apiClient.post("/orders", data);
    return response.data;
  },

  updateOrder: async (orderId: string, data: any) => {
    const response = await apiClient.put(`/orders/${orderId}`, data);
    return response.data;
  },

  deleteOrder: async (orderId: string) => {
    const response = await apiClient.delete(`/orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await apiClient.put(`/orders/${orderId}/status`, {
      status,
    });
    return response.data;
  },

  getOrderTimeline: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/timeline`);
    return response.data;
  },

  getCustomerOrders: async (customerId: string) => {
    const response = await apiClient.get(`/orders/customer/${customerId}`);
    return response.data;
  },
};

export default ordersApi;

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

  // Validation workflow endpoints
  getAllowedTransitions: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/transitions`);
    return response.data;
  },

  getValidationSummary: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}/validation`);
    return response.data;
  },

  submitForCommercialValidation: async (orderId: string, data?: { notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/submit-commercial`, data || {});
    return response.data;
  },

  performCommercialValidation: async (orderId: string, data: { approved: boolean; notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/commercial-validation`, data);
    return response.data;
  },

  submitForTechnicalValidation: async (orderId: string, data?: { notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/submit-technical`, data || {});
    return response.data;
  },

  performTechnicalValidation: async (orderId: string, data: { approved: boolean; notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/technical-validation`, data);
    return response.data;
  },

  finalizeValidation: async (orderId: string, data?: { notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/finalize-validation`, data || {});
    return response.data;
  },

  resubmitAfterRejection: async (orderId: string, data?: { notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/resubmit`, data || {});
    return response.data;
  },

  skipValidation: async (orderId: string, data?: { notes?: string }) => {
    const response = await apiClient.post(`/orders/${orderId}/skip-validation`, data || {});
    return response.data;
  },

  convertFromQuote: async (
    quoteId: string,
    data?: {
      customer_notes?: string;
      delivery_address?: string;
      delivery_contact?: string;
      validation_required?: boolean;
    }
  ) => {
    const response = await apiClient.post("/orders/convert-from-quote", {
      quote_id: quoteId,
      ...data,
    });
    return response.data;
  },
};

export default ordersApi;

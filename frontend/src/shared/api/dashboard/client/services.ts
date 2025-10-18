/**
 * Client Services API
 *
 * @module shared/api/dashboard/client/services
 */

import { apiClient } from "../../client";

export const clientServicesApi = {
  getServices: async (): Promise<any[]> => {
    const response = await apiClient.get("/client/services");
    return response.data;
  },

  getService: async (serviceId: string): Promise<any> => {
    const response = await apiClient.get(`/client/services/${serviceId}`);
    return response.data;
  },

  getServiceUsage: async (serviceId: string): Promise<any[]> => {
    const response = await apiClient.get(`/client/services/${serviceId}/usage`);
    return response.data;
  },

  cancelService: async (serviceId: string, reason?: string): Promise<void> => {
    await apiClient.post(`/client/services/${serviceId}/cancel`, { reason });
  },

  reactivateService: async (serviceId: string): Promise<void> => {
    await apiClient.post(`/client/services/${serviceId}/reactivate`);
  },
};

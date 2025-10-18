/**
 * Corporate Reports API
 *
 * @module shared/api/dashboard/corporate/reports
 */

import { apiClient } from "../../client";

export const corporateReportsApi = {
  getCustomerReports: async (): Promise<any> => {
    const response = await apiClient.get("/corporate/reports/customers");
    return response.data;
  },

  getTicketReports: async (): Promise<any> => {
    const response = await apiClient.get("/corporate/reports/tickets");
    return response.data;
  },

  getOrderReports: async (): Promise<any> => {
    const response = await apiClient.get("/corporate/reports/orders");
    return response.data;
  },

  getRevenueReports: async (): Promise<any> => {
    const response = await apiClient.get("/corporate/reports/revenue");
    return response.data;
  },
};

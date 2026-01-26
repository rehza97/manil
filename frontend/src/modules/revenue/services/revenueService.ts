/**
 * Revenue Service
 *
 * API service for revenue reporting and analytics.
 */

import { apiClient } from "@/shared/api/client";
import type {
  RevenueOverview,
  RevenueTrends,
  RevenueByCategory,
  RevenueByCustomer,
  RevenueReconciliation,
} from "../types/revenue.types";

export const revenueService = {
  /**
   * Get overall revenue overview
   */
  async getOverview(period: string = "month", customerId?: string): Promise<RevenueOverview> {
    const params = new URLSearchParams();
    params.append("period", period);
    if (customerId) {
      params.append("customer_id", customerId);
    }

    const response = await apiClient.get(`/revenue/overview?${params}`);
    return response.data;
  },

  /**
   * Get revenue trends over time
   */
  async getTrends(period: string = "month", groupBy: string = "day"): Promise<RevenueTrends> {
    const params = new URLSearchParams();
    params.append("period", period);
    params.append("group_by", groupBy);

    const response = await apiClient.get(`/revenue/trends?${params}`);
    return response.data;
  },

  /**
   * Get revenue breakdown by category
   */
  async getByCategory(period: string = "month"): Promise<RevenueByCategory> {
    const params = new URLSearchParams();
    params.append("period", period);

    const response = await apiClient.get(`/revenue/by-category?${params}`);
    return response.data;
  },

  /**
   * Get revenue breakdown by customer
   */
  async getByCustomer(period: string = "month", limit: number = 10): Promise<RevenueByCustomer> {
    const params = new URLSearchParams();
    params.append("period", period);
    params.append("limit", limit.toString());

    const response = await apiClient.get(`/revenue/by-customer?${params}`);
    return response.data;
  },

  /**
   * Get revenue reconciliation between Orders and Invoices
   */
  async getReconciliation(period: string = "month"): Promise<RevenueReconciliation> {
    const params = new URLSearchParams();
    params.append("period", period);

    const response = await apiClient.get(`/revenue/reconciliation?${params}`);
    return response.data;
  },
};

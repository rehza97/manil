import { apiClient } from "@/shared/api";
import type {
  QuoteRequest,
  ServiceRequest,
  QuoteRequestListResponse,
  ServiceRequestListResponse,
  CreateQuoteRequestDTO,
  UpdateQuoteRequestDTO,
  CreateServiceRequestDTO,
  UpdateServiceRequestDTO,
} from "../types/quote.types";

/**
 * Quote Request Service
 */
export const quoteService = {
  // ============================================================================
  // QUOTE REQUESTS
  // ============================================================================

  /**
   * Create a new quote request
   */
  async createQuoteRequest(data: CreateQuoteRequestDTO): Promise<QuoteRequest> {
    const response = await apiClient.post<QuoteRequest>("/quote-requests", data);
    return response.data;
  },

  /**
   * Get all quote requests with filtering
   */
  async getQuoteRequests(
    page = 1,
    pageSize = 20,
    filters?: {
      customer_id?: string;
      status?: string;
      priority?: string;
      search?: string;
    }
  ): Promise<QuoteRequestListResponse> {
    const response = await apiClient.get<QuoteRequestListResponse>("/quotes", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  },

  /**
   * Get a single quote request
   */
  async getQuoteRequest(quoteId: string): Promise<QuoteRequest> {
    const response = await apiClient.get<QuoteRequest>(`/quote-requests/${quoteId}`);
    return response.data;
  },

  /**
   * Update a quote request
   */
  async updateQuoteRequest(
    quoteId: string,
    data: UpdateQuoteRequestDTO
  ): Promise<QuoteRequest> {
    const response = await apiClient.put<QuoteRequest>(`/quote-requests/${quoteId}`, data);
    return response.data;
  },

  /**
   * Delete a quote request
   */
  async deleteQuoteRequest(quoteId: string): Promise<void> {
    await apiClient.delete(`/quote-requests/${quoteId}`);
  },

  /**
   * Approve a quote request (set status to QUOTED)
   */
  async approveQuoteRequest(quoteId: string): Promise<QuoteRequest> {
    const response = await apiClient.post<QuoteRequest>(`/quote-requests/${quoteId}/approve`);
    return response.data;
  },

  /**
   * Accept a quote request (set status to ACCEPTED)
   */
  async acceptQuoteRequest(quoteId: string): Promise<QuoteRequest> {
    const response = await apiClient.post<QuoteRequest>(`/quote-requests/${quoteId}/accept`);
    return response.data;
  },

  /**
   * Reject a quote request (set status to REJECTED)
   */
  async rejectQuoteRequest(quoteId: string): Promise<QuoteRequest> {
    const response = await apiClient.post<QuoteRequest>(`/quote-requests/${quoteId}/reject`);
    return response.data;
  },

  // ============================================================================
  // SERVICE REQUESTS
  // ============================================================================

  /**
   * Create a new service request
   */
  async createServiceRequest(data: CreateServiceRequestDTO): Promise<ServiceRequest> {
    const response = await apiClient.post<ServiceRequest>("/quote-requests/services", data);
    return response.data;
  },

  /**
   * Get all service requests with filtering
   */
  async getServiceRequests(
    page = 1,
    pageSize = 20,
    filters?: {
      customer_id?: string;
      status?: string;
      service_type?: string;
    }
  ): Promise<ServiceRequestListResponse> {
    const response = await apiClient.get<ServiceRequestListResponse>("/quote-requests/services", {
      params: { page, page_size: pageSize, ...filters },
    });
    return response.data;
  },

  /**
   * Get a single service request
   */
  async getServiceRequest(serviceId: string): Promise<ServiceRequest> {
    const response = await apiClient.get<ServiceRequest>(`/quote-requests/services/${serviceId}`);
    return response.data;
  },

  /**
   * Update a service request
   */
  async updateServiceRequest(
    serviceId: string,
    data: UpdateServiceRequestDTO
  ): Promise<ServiceRequest> {
    const response = await apiClient.put<ServiceRequest>(
      `/quote-requests/services/${serviceId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a service request
   */
  async deleteServiceRequest(serviceId: string): Promise<void> {
    await apiClient.delete(`/quote-requests/services/${serviceId}`);
  },
};

/**
 * React Query hooks for quote and service request management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quoteService } from "../services/quoteService";
import type {
  QuoteRequest,
  ServiceRequest,
  CreateQuoteRequestDTO,
  UpdateQuoteRequestDTO,
  CreateServiceRequestDTO,
  UpdateServiceRequestDTO,
} from "../types/quote.types";

// ============================================================================
// QUOTE REQUEST QUERIES
// ============================================================================

/**
 * Get all quote requests
 */
export const useQuoteRequests = (
  page: number = 1,
  filters?: {
    customer_id?: string;
    status?: string;
    priority?: string;
    search?: string;
  }
) => {
  return useQuery({
    queryKey: ["quote-requests", page, filters],
    queryFn: async () => {
      return quoteService.getQuoteRequests(page, 20, filters);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get a single quote request
 */
export const useQuoteRequest = (quoteId: string) => {
  return useQuery({
    queryKey: ["quote-request", quoteId],
    queryFn: async () => {
      return quoteService.getQuoteRequest(quoteId);
    },
    enabled: !!quoteId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Create quote request mutation
 */
export const useCreateQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuoteRequestDTO) =>
      quoteService.createQuoteRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
};

/**
 * Update quote request mutation
 */
export const useUpdateQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: UpdateQuoteRequestDTO }) =>
      quoteService.updateQuoteRequest(quoteId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-request", data.id] });
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
};

/**
 * Delete quote request mutation
 */
export const useDeleteQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => quoteService.deleteQuoteRequest(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
};

/**
 * Approve quote request mutation
 */
export const useApproveQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => quoteService.approveQuoteRequest(quoteId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-request", data.id] });
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
};

/**
 * Accept quote request mutation
 */
export const useAcceptQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => quoteService.acceptQuoteRequest(quoteId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-request", data.id] });
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
};

/**
 * Reject quote request mutation
 */
export const useRejectQuoteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => quoteService.rejectQuoteRequest(quoteId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-request", data.id] });
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
};

// ============================================================================
// SERVICE REQUEST QUERIES
// ============================================================================

/**
 * Get all service requests
 */
export const useServiceRequests = (
  page: number = 1,
  filters?: {
    customer_id?: string;
    status?: string;
    service_type?: string;
  }
) => {
  return useQuery({
    queryKey: ["service-requests", page, filters],
    queryFn: async () => {
      return quoteService.getServiceRequests(page, 20, filters);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get a single service request
 */
export const useServiceRequest = (serviceId: string) => {
  return useQuery({
    queryKey: ["service-request", serviceId],
    queryFn: async () => {
      return quoteService.getServiceRequest(serviceId);
    },
    enabled: !!serviceId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Create service request mutation
 */
export const useCreateServiceRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRequestDTO) =>
      quoteService.createServiceRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
  });
};

/**
 * Update service request mutation
 */
export const useUpdateServiceRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string; data: UpdateServiceRequestDTO }) =>
      quoteService.updateServiceRequest(serviceId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service-request", data.id] });
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
  });
};

/**
 * Delete service request mutation
 */
export const useDeleteServiceRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: string) => quoteService.deleteServiceRequest(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
  });
};

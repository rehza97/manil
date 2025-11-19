/**
 * Quote Hooks
 *
 * React Query hooks for quote management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService } from '../services';
import type {
  Quote,
  QuoteCreate,
  QuoteUpdate,
  QuoteFilters,
  QuoteApprovalRequest,
  QuoteSendRequest,
  QuoteAcceptRequest,
  QuoteVersionRequest,
} from '../types';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all quotes with filters
 */
export const useQuotes = (filters?: QuoteFilters) => {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => quoteService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get quote by ID
 */
export const useQuote = (id: string | undefined) => {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => quoteService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get all versions of a quote
 */
export const useQuoteVersions = (id: string | undefined) => {
  return useQuery({
    queryKey: ['quotes', id, 'versions'],
    queryFn: () => quoteService.getVersions(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get quote timeline/history
 */
export const useQuoteTimeline = (id: string | undefined) => {
  return useQuery({
    queryKey: ['quotes', id, 'timeline'],
    queryFn: () => quoteService.getTimeline(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new quote
 */
export const useCreateQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuoteCreate) => quoteService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
};

/**
 * Update a quote
 */
export const useUpdateQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteUpdate }) =>
      quoteService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id] });
    },
  });
};

/**
 * Delete a quote
 */
export const useDeleteQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quoteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
};

/**
 * Submit quote for approval
 */
export const useSubmitForApproval = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quoteService.submitForApproval(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', id, 'timeline'] });
    },
  });
};

/**
 * Approve or reject a quote
 */
export const useApproveQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteApprovalRequest }) =>
      quoteService.approve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id, 'timeline'] });
    },
  });
};

/**
 * Send quote to customer
 */
export const useSendQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteSendRequest }) =>
      quoteService.send(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id, 'timeline'] });
    },
  });
};

/**
 * Accept a quote (customer)
 */
export const useAcceptQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteAcceptRequest }) =>
      quoteService.accept(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id, 'timeline'] });
    },
  });
};

/**
 * Decline a quote (customer)
 */
export const useDeclineQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quoteService.decline(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', id, 'timeline'] });
    },
  });
};

/**
 * Create a new version of a quote
 */
export const useCreateQuoteVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuoteVersionRequest }) =>
      quoteService.createVersion(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['quotes', variables.id, 'timeline'] });
    },
  });
};

/**
 * Expire old quotes (admin)
 */
export const useExpireOldQuotes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quoteService.expireOldQuotes(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
};

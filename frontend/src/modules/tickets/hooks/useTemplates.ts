/**
 * Template Management Hooks
 * React Query hooks for template CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { templateService } from '../services/templateService';
import type {
  ResponseTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilters,
  TemplateVariableReference,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
} from '../types/template.types';

const QUERY_KEYS = {
  all: ['templates'] as const,
  lists: () => [...QUERY_KEYS.all, 'list'] as const,
  list: (filters?: Partial<TemplateFilters>) =>
    [...QUERY_KEYS.lists(), filters] as const,
  details: () => [...QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  variables: () => [...QUERY_KEYS.all, 'variables'] as const,
  popular: () => [...QUERY_KEYS.all, 'popular'] as const,
};

/**
 * Get all templates with filters
 */
export function useTemplates(filters?: Partial<TemplateFilters>) {
  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: () => templateService.getTemplates(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get single template
 */
export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id || ''),
    queryFn: () => templateService.getTemplate(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get available variables
 */
export function useTemplateVariables() {
  return useQuery({
    queryKey: QUERY_KEYS.variables(),
    queryFn: () => templateService.getAvailableVariables(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Get popular templates
 */
export function usePopularTemplates(limit: number = 5) {
  return useQuery({
    queryKey: QUERY_KEYS.popular(),
    queryFn: () => templateService.getPopularTemplates(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Create new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      templateService.createTemplate(data),
    onSuccess: (newTemplate) => {
      toast.success('Template created successfully');
      // Invalidate template list
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lists(),
      });
      // Set the new template in cache
      queryClient.setQueryData(
        QUERY_KEYS.detail(newTemplate.id),
        newTemplate
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || 'Failed to create template';
      toast.error(message);
    },
  });
}

/**
 * Update template
 */
export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTemplateRequest) =>
      templateService.updateTemplate(id, data),
    onSuccess: (updatedTemplate) => {
      toast.success('Template updated successfully');
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.lists(),
      });
      // Update cache
      queryClient.setQueryData(
        QUERY_KEYS.detail(updatedTemplate.id),
        updatedTemplate
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || 'Failed to update template';
      toast.error(message);
    },
  });
}

/**
 * Delete template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateService.deleteTemplate(id),
    onSuccess: () => {
      toast.success('Template deleted successfully');
      // Invalidate all template queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.all,
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.detail || 'Failed to delete template';
      toast.error(message);
    },
  });
}

/**
 * Preview template with variables
 */
export function usePreviewTemplate() {
  return useMutation({
    mutationFn: (request: TemplatePreviewRequest) =>
      templateService.previewTemplate(request),
    onError: (error: any) => {
      console.error('Preview error:', error);
    },
  });
}

/**
 * Validate template
 */
export function useValidateTemplate() {
  return useMutation({
    mutationFn: (content: string) =>
      templateService.validateTemplate(content),
    onError: (error: any) => {
      console.error('Validation error:', error);
    },
  });
}

/**
 * Get templates by category
 */
export function useTemplatesByCategory(category?: string) {
  return useQuery({
    queryKey: ['templates', 'category', category],
    queryFn: () => templateService.getTemplatesByCategory(category!),
    enabled: !!category,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

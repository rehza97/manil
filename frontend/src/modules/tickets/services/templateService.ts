/**
 * Template Service
 * Handles API calls for response template management
 */

import { apiClient } from '@/shared/api';
import type {
  ResponseTemplate,
  TemplateListResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateFilters,
  TemplateVariableReference,
} from '../types/template.types';
import { ALL_VARIABLES } from '../types/template.types';

export const templateService = {
  /**
   * Get all templates with optional filtering
   */
  async getTemplates(filters?: Partial<TemplateFilters>): Promise<TemplateListResponse> {
    const params = new URLSearchParams();

    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.category) {
      params.append('category', filters.category);
    }
    if (filters?.is_default !== undefined) {
      params.append('is_default', String(filters.is_default));
    }
    if (filters?.page) {
      params.append('page', String(filters.page));
    }
    if (filters?.page_size) {
      params.append('page_size', String(filters.page_size));
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<TemplateListResponse>(
      `/tickets/templates${query}`
    );

    return response.data;
  },

  /**
   * Get single template by ID
   */
  async getTemplate(id: string): Promise<ResponseTemplate> {
    const response = await apiClient.get<ResponseTemplate>(
      `/tickets/templates/${id}`
    );
    return response.data;
  },

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<ResponseTemplate> {
    const response = await apiClient.post<ResponseTemplate>(
      '/tickets/templates',
      data
    );
    return response.data;
  },

  /**
   * Update existing template
   */
  async updateTemplate(
    id: string,
    data: UpdateTemplateRequest
  ): Promise<ResponseTemplate> {
    const response = await apiClient.put<ResponseTemplate>(
      `/tickets/templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/tickets/templates/${id}`);
  },

  /**
   * Preview template with variable substitution
   */
  async previewTemplate(
    request: TemplatePreviewRequest
  ): Promise<TemplatePreviewResponse> {
    const response = await apiClient.post<TemplatePreviewResponse>(
      '/tickets/templates/preview',
      request
    );
    return response.data;
  },

  /**
   * Get available template variables
   */
  async getAvailableVariables(): Promise<TemplateVariableReference[]> {
    try {
      const response = await apiClient.get<TemplateVariableReference[]>(
        '/tickets/templates/variables/available'
      );
      return response.data;
    } catch {
      // Fallback to local variables if API fails
      return ALL_VARIABLES;
    }
  },

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 5): Promise<ResponseTemplate[]> {
    try {
      const response = await apiClient.get<ResponseTemplate[]>(
        `/tickets/templates/popular?limit=${limit}`
      );
      return response.data;
    } catch {
      return [];
    }
  },

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<ResponseTemplate[]> {
    try {
      const response = await apiClient.get<ResponseTemplate[]>(
        `/tickets/templates/by-category/${category}`
      );
      return response.data;
    } catch {
      return [];
    }
  },

  /**
   * Validate template syntax
   */
  async validateTemplate(content: string): Promise<{
    is_valid: boolean;
    invalid_variables?: string[];
    error?: string;
  }> {
    try {
      const response = await apiClient.post<{
        is_valid: boolean;
        invalid_variables?: string[];
        error?: string;
      }>('/tickets/templates/validate', { content });
      return response.data;
    } catch (error) {
      return {
        is_valid: false,
        error: 'Failed to validate template',
      };
    }
  },
};

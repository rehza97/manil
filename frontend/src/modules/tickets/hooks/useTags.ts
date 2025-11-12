/**
 * React Query hooks for tag management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/services/api';

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TagCreateData {
  name: string;
  description?: string;
  color?: string;
}

export interface TagUpdateData {
  name?: string;
  description?: string;
  color?: string;
}

// Get all tags
export const useTags = (search?: string) => {
  return useQuery({
    queryKey: ['tags', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await api.get(
        `/tickets/tags${params.toString() ? '?' + params.toString() : ''}`
      );
      return response.data.data as Tag[];
    },
  });
};

// Get single tag
export const useTag = (tagId: string) => {
  return useQuery({
    queryKey: ['tags', tagId],
    queryFn: async () => {
      const response = await api.get(`/tickets/tags/${tagId}`);
      return response.data as Tag;
    },
    enabled: !!tagId,
  });
};

// Get tags for a ticket
export const useTicketTags = (ticketId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tickets', ticketId, 'tags'],
    queryFn: async () => {
      const response = await api.get(
        `/tickets/${ticketId}/tags`
      );
      return response.data as Tag[];
    },
    enabled: !!ticketId,
  });

  const assignTag = useMutation({
    mutationFn: async (data: { tag_ids: string[] }) => {
      await api.post(`/tickets/${ticketId}/tags`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      await api.delete(`/tickets/${ticketId}/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return { ...query, assignTag, removeTag };
};

// Create tag
export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TagCreateData) => {
      const response = await api.post('/tickets/tags', data);
      return response.data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

// Update tag
export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TagUpdateData }) => {
      const response = await api.put(`/tickets/tags/${id}`, data);
      return response.data as Tag;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', variables.id] });
    },
  });
};

// Delete tag
export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      await api.delete(`/tickets/tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

// Get tag statistics
export const useTagStatistics = () => {
  return useQuery({
    queryKey: ['tags', 'statistics'],
    queryFn: async () => {
      const response = await api.get('/tickets/tags/statistics');
      return response.data;
    },
  });
};

// Hook with all tag operations
export const useTagOperations = () => {
  const queryClient = useQueryClient();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  return {
    createTag,
    updateTag,
    deleteTag,
    invalidateTags: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  };
};

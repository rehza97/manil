/**
 * React Query hooks for watcher management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';

export interface Watcher {
  id: string;
  ticket_id: string;
  user_id: string;
  notify_on_reply: boolean;
  notify_on_status_change: boolean;
  notify_on_assignment: boolean;
  created_at: string;
}

export interface WatcherCreateData {
  user_id: string;
  preferences?: {
    notify_on_reply?: boolean;
    notify_on_status_change?: boolean;
    notify_on_assignment?: boolean;
  };
}

export interface WatcherPreferences {
  notify_on_reply: boolean;
  notify_on_status_change: boolean;
  notify_on_assignment: boolean;
}

export interface User {
  id: string;
  name?: string;
  email: string;
}

// Get watchers for a ticket
export const useWatchers = (ticketId: string, options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  
  // Explicitly check if query should be enabled
  // If enabled is explicitly false, disable. Otherwise, enable if ticketId exists
  const isEnabled = options?.enabled !== false && !!ticketId;

  const query = useQuery({
    queryKey: ['tickets', ticketId, 'watchers'],
    queryFn: async () => {
      try {
        const response = await apiClient.get(
          `/tickets/${ticketId}/watchers`
        );
        return response.data.data as Watcher[];
      } catch (error: any) {
        // Handle 404 gracefully - endpoint may not be implemented yet
        if (error?.response?.status === 404) {
          console.warn(`Watchers endpoint not available for ticket ${ticketId}`);
          return [] as Watcher[];
        }
        throw error;
      }
    },
    enabled: isEnabled,
    // Prevent all refetching when disabled
    refetchOnWindowFocus: false,
    refetchOnMount: isEnabled,
    refetchOnReconnect: false,
    // Don't refetch on query invalidation if disabled
    refetchInterval: false,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const addWatcher = useMutation({
    mutationFn: async (data: WatcherCreateData) => {
      await apiClient.post(`/tickets/${ticketId}/watchers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'watchers'],
      });
    },
  });

  const removeWatcher = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/tickets/${ticketId}/watchers/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'watchers'],
      });
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (preferences: WatcherPreferences) => {
      const userId = (await apiClient.get('/auth/me')).data.id;
      const response = await apiClient.put(
        `/tickets/${ticketId}/watchers/${userId}/preferences`,
        preferences
      );
      return response.data as Watcher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'watchers'],
      });
    },
  });

  return {
    ...query,
    addWatcher,
    removeWatcher,
    updatePreferences,
  };
};

// Get list of available users to watch a ticket
export const useUsers = (search?: string) => {
  return useQuery({
    queryKey: ['users', search || null],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await apiClient.get(
        `/users${params.toString() ? '?' + params.toString() : ''}`
      );
      // Handle different response formats
      const users = response.data?.data || response.data?.users || response.data || [];
      return Array.isArray(users) ? users as User[] : [];
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Check if user is watching a ticket
export const useIsWatching = (ticketId: string, userId: string) => {
  return useQuery({
    queryKey: ['tickets', ticketId, 'watchers', 'is-watching', userId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tickets/${ticketId}/watchers/${userId}/is-watching`
      );
      return response.data.is_watching as boolean;
    },
    enabled: !!ticketId && !!userId,
  });
};

// Get watcher statistics for a ticket
export const useWatcherStatistics = (ticketId: string) => {
  return useQuery({
    queryKey: ['tickets', ticketId, 'watchers', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tickets/${ticketId}/watchers/statistics`
      );
      return response.data;
    },
    enabled: !!ticketId,
  });
};

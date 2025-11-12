/**
 * React Query hooks for watcher management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/services/api';

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
export const useWatchers = (ticketId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tickets', ticketId, 'watchers'],
    queryFn: async () => {
      const response = await api.get(
        `/tickets/${ticketId}/watchers`
      );
      return response.data.data as Watcher[];
    },
    enabled: !!ticketId,
  });

  const addWatcher = useMutation({
    mutationFn: async (data: WatcherCreateData) => {
      await api.post(`/tickets/${ticketId}/watchers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'watchers'],
      });
    },
  });

  const removeWatcher = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/tickets/${ticketId}/watchers/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', ticketId, 'watchers'],
      });
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (preferences: WatcherPreferences) => {
      const userId = (await api.get('/auth/me')).data.id;
      const response = await api.put(
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
    queryKey: ['users', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await api.get(
        `/users${params.toString() ? '?' + params.toString() : ''}`
      );
      return response.data.data as User[];
    },
  });
};

// Check if user is watching a ticket
export const useIsWatching = (ticketId: string, userId: string) => {
  return useQuery({
    queryKey: ['tickets', ticketId, 'watchers', 'is-watching', userId],
    queryFn: async () => {
      const response = await api.get(
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
      const response = await api.get(
        `/tickets/${ticketId}/watchers/statistics`
      );
      return response.data;
    },
    enabled: !!ticketId,
  });
};

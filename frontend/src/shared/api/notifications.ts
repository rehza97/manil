/**
 * In-app notifications API.
 * Supports list, unread count, mark read, and SSE stream.
 */

import { apiClient } from "./client";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationsApi = {
  getNotifications: async (params?: {
    page?: number;
    page_size?: number;
    unread_only?: boolean;
  }): Promise<NotificationListResponse> => {
    const { data } = await apiClient.get<NotificationListResponse>(
      "/notifications",
      { params }
    );
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<UnreadCountResponse>(
      "/notifications/unread-count"
    );
    return data.count;
  },

  markRead: async (notificationId: string): Promise<{ ok: boolean }> => {
    const { data } = await apiClient.patch<{ ok: boolean }>(
      `/notifications/${notificationId}/read`
    );
    return data;
  },

  /** Base URL for SSE stream (use with fetch + Authorization header). */
  getStreamUrl: (): string => {
    const base = (apiClient.defaults.baseURL || "").replace(/\/$/, "");
    return `${base}/notifications/stream`;
  },
};

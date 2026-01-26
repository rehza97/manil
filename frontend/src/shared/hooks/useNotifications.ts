/**
 * In-app notifications: REST API + optional SSE stream.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { notificationsApi } from "@/shared/api/notifications";
import { streamSSE } from "@/shared/utils/sse";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function useNotifications(opts?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}) {
  const { page = 1, pageSize = 20, unreadOnly = false } = opts ?? {};
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, "list", page, pageSize, unreadOnly],
    queryFn: () =>
      notificationsApi.getNotifications({
        page,
        page_size: pageSize,
        unread_only: unreadOnly,
      }),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

/**
 * Connects to /notifications/stream and invalidates notification queries
 * on each "notification" event. Call only when user is authenticated.
 */
export function useNotificationStream(enabled: boolean) {
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const token =
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("access_token");
    if (!token) return;

    const url = notificationsApi.getStreamUrl();
    abortRef.current = new AbortController();

    streamSSE(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortRef.current.signal,
      onMessage: ({ event, data }) => {
        if (event === "notification" && data) {
          qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        }
      },
      onError: (e) => {
        console.warn("[useNotificationStream]", e);
      },
    }).catch(() => {});

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [enabled, qc]);
}

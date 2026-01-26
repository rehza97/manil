/**
 * API Client Configuration
 *
 * Centralized Axios instance with interceptors for:
 * - Authentication token injection
 * - Automatic token refresh on 401 errors
 * - Error handling
 * - Request/response transformation
 *
 * @module shared/api/client
 */

import axios from "axios";
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/shared/store/authStore";

/**
 * Base API URL from environment variables
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

/**
 * Track if a token refresh is in progress to prevent multiple simultaneous refresh calls
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

/**
 * Process all queued requests after token refresh
 */
const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Create configured Axios instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Create a separate client for non-API endpoints (like /health)
 */
export const baseClient: AxiosInstance = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor
 * Adds authentication token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Token storage: sessionStorage (rememberMe=false) or localStorage (rememberMe=true).
    // Security: HTTP-only cookies are preferred for production; current impl uses storage.
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handles automatic token refresh on 401 errors and other error responses
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't retry refresh endpoint to avoid infinite loop
      if (originalRequest.url?.includes('/auth/refresh')) {
        // Refresh token itself expired, redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      // Get refresh token from storage
      const refreshToken =
        sessionStorage.getItem("refresh_token") || localStorage.getItem("refresh_token");

      if (!refreshToken) {
        // No refresh token available, redirect to login
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;

        // Update tokens in storage (use the same storage that had the refresh token)
        const isSessionStorage = !!sessionStorage.getItem("refresh_token");
        if (isSessionStorage) {
          sessionStorage.setItem("access_token", access_token);
        } else {
          localStorage.setItem("access_token", access_token);
        }

        // Update authStore state to keep it in sync
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          useAuthStore.setState({
            token: access_token,
          });
        }

        // Update authorization header
        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Process queued requests with new token
        processQueue(null, access_token);
        isRefreshing = false;

        // Retry original request with new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API Error handler
 * Extracts and formats error messages
 */
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // FastAPI returns errors in the 'detail' field
    const message =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.response?.data?.message;
    return message || error.message || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};

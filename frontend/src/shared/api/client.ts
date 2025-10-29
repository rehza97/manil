/**
 * API Client Configuration
 *
 * Centralized Axios instance with interceptors for:
 * - Authentication token injection
 * - Error handling
 * - Request/response transformation
 *
 * @module shared/api/client
 */

import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

/**
 * Base API URL from environment variables
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

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
    // Get token from storage (localStorage or auth store)
    const token = localStorage.getItem("access_token");

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
 * Handles token refresh and error responses
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && originalRequest) {
      // TODO: Implement token refresh logic
      // Try to refresh token and retry request

      // For now, redirect to login
      localStorage.removeItem("access_token");
      window.location.href = "/login";
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
    const message =
      error.response?.data?.error || error.response?.data?.message;
    return message || error.message || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};

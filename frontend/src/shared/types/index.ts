/**
 * Shared TypeScript Types and Interfaces
 *
 * Common types used across the application
 *
 * @module shared/types
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Common error response structure
 */
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Generic ID type
 */
export type ID = string;

/**
 * Timestamp type (ISO string)
 */
export type Timestamp = string;

/**
 * Common audit fields
 */
export interface AuditFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: ID;
}

/**
 * Generic filter params
 */
export interface FilterParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

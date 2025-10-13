/**
 * Application Constants
 *
 * Centralized constants used throughout the application
 *
 * @module shared/constants
 */

/**
 * Application information
 */
export const APP_INFO = {
  NAME: "CloudManager",
  VERSION: "1.0.0",
  DESCRIPTION: "Enterprise Cloud & Hosting Management Platform",
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  TIMEOUT: 30000,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

/**
 * Theme colors (matching design system)
 */
export const COLORS = {
  PRIMARY: "#38ada9",
  SECONDARY: "#3c6382",
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: "admin",
  CORPORATE: "corporate",
  CLIENT: "client",
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
  THEME: "theme",
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  DISPLAY_WITH_TIME: "MMM dd, yyyy HH:mm",
  API: "yyyy-MM-dd",
  FULL: "MMMM dd, yyyy HH:mm:ss",
} as const;

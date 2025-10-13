/**
 * Formatting Utilities
 *
 * Common formatting functions for dates, currency, numbers, etc.
 *
 * @module shared/utils/formatters
 */

import { format, parseISO } from "date-fns";
import { DATE_FORMATS } from "../constants";

/**
 * Format date string to display format
 *
 * @param {string} dateString - ISO date string
 * @param {string} formatString - Date format (default: DISPLAY)
 * @returns {string} Formatted date
 */
export const formatDate = (
  dateString: string,
  formatString: string = DATE_FORMATS.DISPLAY
): string => {
  try {
    return format(parseISO(dateString), formatString);
  } catch {
    return dateString;
  }
};

/**
 * Format currency value
 *
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Format number with thousands separator
 *
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};

/**
 * Truncate text with ellipsis
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format file size
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

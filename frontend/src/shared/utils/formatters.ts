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
 * Format currency value in DZD (Algerian Dinar)
 *
 * @param {number} amount - Amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (
  amount: number,
  decimals: number = 2
): string => {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format number with thousands separator
 *
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("fr-DZ").format(value);
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

/**
 * Format amount in DZD (alias for formatCurrency for backward compatibility)
 *
 * @param {number} amount - Amount to format in DZD
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted DZD amount
 */
export const formatDZD = (amount: number, decimals: number = 2): string => {
  return formatCurrency(amount, decimals);
};

/**
 * Safely format a date string, handling null, undefined, or invalid dates
 *
 * @param {string | null | undefined} dateString - Date string to format
 * @param {string} formatString - Date format (default: "MMM dd, yyyy")
 * @returns {string} Formatted date or "N/A" if invalid
 */
export const formatDateSafe = (
  dateString: string | null | undefined,
  formatString: string = "MMM dd, yyyy"
): string => {
  if (!dateString) {
    return "N/A";
  }

  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString;
    if (!date || isNaN(date.getTime())) {
      return "N/A";
    }
    return format(date, formatString);
  } catch (error) {
    console.warn("Invalid date value:", dateString, error);
    return "N/A";
  }
};

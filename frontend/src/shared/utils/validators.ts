/**
 * Validation Utilities
 *
 * Common validation functions for forms and inputs
 *
 * @module shared/utils/validators
 */

/**
 * Validate email format
 *
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (10 digits)
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
};

/**
 * Validate password strength
 * Requirements: min 8 chars, uppercase, lowercase, number
 *
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid password
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

/**
 * Validate URL format
 *
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if string is empty or only whitespace
 *
 * @param {string} value - String to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value: string): boolean => {
  return !value || value.trim().length === 0;
};

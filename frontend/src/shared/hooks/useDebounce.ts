/**
 * useDebounce Hook
 *
 * Debounces a value for a specified delay
 *
 * @module shared/hooks/useDebounce
 */

import { useState, useEffect } from "react";

/**
 * Debounce hook
 *
 * @param {T} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T} Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

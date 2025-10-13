/**
 * useLocalStorage Hook
 *
 * React hook for managing localStorage with state
 *
 * @module shared/hooks/useLocalStorage
 */

import { useState, useEffect } from "react";

/**
 * Local storage hook
 *
 * @param {string} key - Storage key
 * @param {T} initialValue - Initial value
 * @returns {[T, (value: T) => void]} Value and setter
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}

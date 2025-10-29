/**
 * Authentication Store
 *
 * Global state management for authentication using Zustand
 * Persists user and token information to localStorage
 *
 * @module shared/store/authStore
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "corporate" | "client";
  is_active: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Authentication state interface
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

/**
 * Authentication store
 *
 * Manages global authentication state with persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
        localStorage.setItem("access_token", token);
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("access_token");
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

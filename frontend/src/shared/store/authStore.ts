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
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string, rememberMe?: boolean) => void;
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
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken, rememberMe = true) => {
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        });
        
        // Use localStorage if rememberMe is true, sessionStorage otherwise
        const storage = rememberMe ? localStorage : sessionStorage;
        
        storage.setItem("access_token", token);
        if (refreshToken) {
          storage.setItem("refresh_token", refreshToken);
        }
        
        // Also store user data
        storage.setItem("user", JSON.stringify(user));
        
        // If rememberMe is false, also clear localStorage to ensure clean state
        if (!rememberMe) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
        }
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        // Clear both localStorage and sessionStorage
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        sessionStorage.removeItem("user");
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

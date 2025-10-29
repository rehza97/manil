/**
 * Application Providers
 *
 * Wraps the application with necessary context providers:
 * - React Query for server state management
 * - Theme provider for styling
 * - Authentication provider
 *
 * @module app/providers
 */

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/shared/components/ui/sonner";

/**
 * Create Query Client instance with default configuration
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Application Providers Component
 *
 * Wraps the entire application with necessary providers for:
 * - Server state management (React Query)
 * - Authentication state
 * - Theme management
 *
 * @param {AppProvidersProps} props - Component props
 * @returns {JSX.Element} Provider tree
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Add ThemeProvider here when implemented */}
      {/* Add AuthProvider here when implemented */}
      {children}

      {/* Toast notifications */}
      <Toaster />

      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

AppProviders.displayName = "AppProviders";

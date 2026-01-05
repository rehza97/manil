/**
 * Test setup file for Vitest.
 * 
 * Configures test environment, MSW handlers, React Query test client,
 * and mocks window APIs.
 */
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { setupServer } from "msw/node";
import { handlers } from "./mocks/handlers";

// Setup MSW server
export const server = setupServer(...handlers);

// React Query test client
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Mock window APIs
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock clipboard API
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup MSW before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Cleanup MSW after all tests
afterAll(() => {
  server.close();
});


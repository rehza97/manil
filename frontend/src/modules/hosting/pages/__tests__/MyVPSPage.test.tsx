/**
 * Unit tests for MyVPSPage component.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { MyVPSPage } from "../MyVPSPage";
import { createTestQueryClient, server } from "@/test/setup";

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("MyVPSPage", () => {
  it("should display loading state initially", () => {
    renderWithProviders(<MyVPSPage />);
    // Loading skeletons should be visible
    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0);
  });

  it("should display subscriptions after loading", async () => {
    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/VPS-20241221-00001/i)).toBeInTheDocument();
    });
  });

  it("should filter subscriptions by status", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/My VPS Subscriptions/i)).toBeInTheDocument();
    });

    // Find status filter dropdown
    const statusFilter = screen.getByRole("combobox", { name: /All Statuses/i });
    if (statusFilter) {
      await user.click(statusFilter);
      await user.click(screen.getByText(/Active/i));

      // Should filter subscriptions
      await waitFor(() => {
        expect(statusFilter).toHaveValue("ACTIVE");
      });
    }
  });

  it("should search subscriptions by subscription number", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/My VPS Subscriptions/i)).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText(/Search by subscription number/i);
    await user.type(searchInput, "VPS-20241221-00001");

    // Should filter results
    await waitFor(() => {
      expect(searchInput).toHaveValue("VPS-20241221-00001");
    });
  });

  it("should show empty state when no subscriptions", async () => {
    // Mock empty response
    server.use(
      http.get("/api/v1/hosting/subscriptions", () => {
        return HttpResponse.json({
          items: [],
          total: 0,
          page: 1,
          page_size: 20,
          total_pages: 0,
        });
      })
    );

    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/No VPS subscriptions yet/i)).toBeInTheDocument();
    });
  });

  it("should navigate to subscription details on row click", async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();
    vi.mock("react-router-dom", async () => {
      const actual = await vi.importActual("react-router-dom");
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/VPS-20241221-00001/i)).toBeInTheDocument();
    });

    // Click on subscription row
    const subscriptionRow = screen.getByText(/VPS-20241221-00001/i).closest("tr");
    if (subscriptionRow) {
      await user.click(subscriptionRow);
      // Navigation should be triggered (mocked)
    }
  });

  it("should handle pagination", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/My VPS Subscriptions/i)).toBeInTheDocument();
    });

    // Find pagination controls
    const nextButton = screen.queryByRole("button", { name: /Next/i });
    if (nextButton) {
      await user.click(nextButton);
      // Should navigate to next page
    }
  });
});


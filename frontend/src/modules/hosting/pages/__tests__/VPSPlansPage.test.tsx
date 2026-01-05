/**
 * Unit tests for VPSPlansPage component.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { VPSPlansPage } from "../VPSPlansPage";
import { createTestQueryClient, server } from "@/test/setup";

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("VPSPlansPage", () => {
  it("should display loading state initially", () => {
    renderWithProviders(<VPSPlansPage />);
    // Loading skeletons should be visible
    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0);
  });

  it("should display VPS plans after loading", async () => {
    renderWithProviders(<VPSPlansPage />);

    await waitFor(() => {
      expect(screen.getByText("Starter VPS")).toBeInTheDocument();
    });

    expect(screen.getByText("Professional VPS")).toBeInTheDocument();
  });

  it("should display plan details correctly", async () => {
    renderWithProviders(<VPSPlansPage />);

    await waitFor(() => {
      expect(screen.getByText("Starter VPS")).toBeInTheDocument();
    });

    // Check plan specs
    expect(screen.getByText(/1 CPU Core/i)).toBeInTheDocument();
    expect(screen.getByText(/2 GB RAM/i)).toBeInTheDocument();
    expect(screen.getByText(/\$10\.00/i)).toBeInTheDocument();
  });

  it("should show error state on API failure", async () => {
    // Mock API failure
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(<VPSPlansPage />);

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });

  it("should allow requesting a plan", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VPSPlansPage />);

    await waitFor(() => {
      expect(screen.getByText("Starter VPS")).toBeInTheDocument();
    });

    const requestButton = screen.getAllByText(/Request This Plan/i)[0];
    await user.click(requestButton);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Request VPS Hosting/i)).toBeInTheDocument();
    });
  });

  it("should show empty state when no plans available", async () => {
    // Mock empty response
    server.use(
      http.get("/api/v1/hosting/plans", () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<VPSPlansPage />);

    await waitFor(() => {
      expect(screen.getByText(/No plans available/i)).toBeInTheDocument();
    });
  });
});


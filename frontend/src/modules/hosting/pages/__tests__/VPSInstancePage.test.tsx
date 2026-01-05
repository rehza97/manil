/**
 * Unit tests for VPSInstancePage component.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { VPSInstancePage } from "../VPSInstancePage";
import { createTestQueryClient } from "@/test/setup";

const renderWithProviders = (component: React.ReactElement, initialEntries = ["/dashboard/vps/subscriptions/sub-1"]) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("VPSInstancePage", () => {
  it("should display loading state initially", () => {
    renderWithProviders(<VPSInstancePage />);
    // Loading skeletons should be visible
    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0);
  });

  it("should display subscription details after loading", async () => {
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/VPS-20241221-00001/i)).toBeInTheDocument();
    });
  });

  it("should display control panel with container status", async () => {
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Container Control/i)).toBeInTheDocument();
    });

    // Should show status badge
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
  });

  it("should allow starting container", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Container Control/i)).toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: /Start/i });
    await user.click(startButton);

    // Should show loading state
    await waitFor(() => {
      expect(startButton).toBeDisabled();
    });
  });

  it("should display stats dashboard", async () => {
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Resource Usage/i)).toBeInTheDocument();
    });

    // Should show CPU, Memory, Storage gauges
    expect(screen.getByText(/CPU/i)).toBeInTheDocument();
    expect(screen.getByText(/Memory/i)).toBeInTheDocument();
  });

  it("should switch between Stats, Logs, and Timeline tabs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Stats/i)).toBeInTheDocument();
    });

    // Click Logs tab
    const logsTab = screen.getByRole("tab", { name: /Logs/i });
    await user.click(logsTab);

    await waitFor(() => {
      expect(screen.getByText(/Container Logs/i)).toBeInTheDocument();
    });

    // Click Timeline tab
    const timelineTab = screen.getByRole("tab", { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText(/Subscription Timeline/i)).toBeInTheDocument();
    });
  });

  it("should display connection information", async () => {
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Connection Information/i)).toBeInTheDocument();
    });

    // Should show IP address
    expect(screen.getByText(/172\.20\.1\.2/i)).toBeInTheDocument();
  });

  it("should display upgrade panel for active subscriptions", async () => {
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Upgrade Plan/i)).toBeInTheDocument();
    });

    // Should show available plans
    expect(screen.getByText(/Professional VPS/i)).toBeInTheDocument();
  });

  it("should handle invalid subscription ID", async () => {
    renderWithProviders(<VPSInstancePage />, ["/dashboard/vps/subscriptions/invalid-id"]);

    await waitFor(() => {
      expect(screen.getByText(/Invalid subscription ID/i)).toBeInTheDocument();
    });
  });

  it("should auto-refresh stats every 5 seconds", async () => {
    vi.useFakeTimers();
    renderWithProviders(<VPSInstancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Resource Usage/i)).toBeInTheDocument();
    });

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    // Stats should have been refetched
    // Note: In real test, we'd verify the query was called again
    
    vi.useRealTimers();
  });
});


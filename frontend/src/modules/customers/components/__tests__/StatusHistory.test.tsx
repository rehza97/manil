/**
 * Unit tests for StatusHistory component.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { StatusHistory } from "../StatusHistory";
import { createTestQueryClient } from "@/test/setup";

const mockUseStatusHistory = vi.fn();

vi.mock("../../hooks/useCustomers", () => ({
  useStatusHistory: (id: string) => mockUseStatusHistory(id),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("StatusHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when loading", () => {
    mockUseStatusHistory.mockReturnValue({ data: undefined, isLoading: true, error: null });
    renderWithProviders(<StatusHistory customerId="cust-1" />);
    expect(screen.queryByText("Status History")).not.toBeInTheDocument();
  });

  it("shows no status changes when empty", async () => {
    mockUseStatusHistory.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    renderWithProviders(<StatusHistory customerId="cust-1" />);
    await waitFor(() => {
      expect(screen.getByText("Status History")).toBeInTheDocument();
    });
    expect(screen.getByText("No status changes recorded")).toBeInTheDocument();
  });

  it("shows timeline when history has entries", async () => {
    mockUseStatusHistory.mockReturnValue({
      data: [
        {
          id: "e1",
          old_status: "pending",
          new_status: "active",
          reason: "KYC approved",
          changed_by: "u1",
          changed_by_email: "admin@test.com",
          changed_at: "2024-01-15T10:00:00Z",
          description: "Status change",
        },
      ],
      isLoading: false,
      error: null,
    });
    renderWithProviders(<StatusHistory customerId="cust-1" />);
    await waitFor(() => {
      expect(screen.getByText("Status History")).toBeInTheDocument();
    });
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });
});

/**
 * Unit tests for ProfileCompleteness component.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ProfileCompleteness } from "../ProfileCompleteness";
import { createTestQueryClient } from "@/test/setup";

const mockUseProfileCompleteness = vi.fn();

vi.mock("../../hooks/useCustomers", () => ({
  useProfileCompleteness: (id: string) => mockUseProfileCompleteness(id),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("ProfileCompleteness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when loading", () => {
    mockUseProfileCompleteness.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    renderWithProviders(<ProfileCompleteness customerId="cust-1" />);
    expect(screen.queryByText("Profile Completeness")).not.toBeInTheDocument();
  });

  it("shows error when failed to load", async () => {
    mockUseProfileCompleteness.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed"),
    });
    renderWithProviders(<ProfileCompleteness customerId="cust-1" />);
    await waitFor(() => {
      expect(screen.getByText("Failed to load profile completeness")).toBeInTheDocument();
    });
  });

  it("shows completeness percentage and scores when loaded", async () => {
    mockUseProfileCompleteness.mockReturnValue({
      data: {
        customer_id: "cust-1",
        completeness_percentage: 75,
        base_info_score: 30,
        address_score: 25,
        corporate_score: 20,
        kyc_score: 0,
        missing_fields: ["state", "postal_code"],
      },
      isLoading: false,
      error: null,
    });
    renderWithProviders(<ProfileCompleteness customerId="cust-1" />);
    await waitFor(() => {
      expect(screen.getByText("Profile Completeness")).toBeInTheDocument();
    });
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Base Information")).toBeInTheDocument();
    expect(screen.getByText("Address")).toBeInTheDocument();
  });
});

/**
 * Unit tests for StatusTransition component.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { StatusTransition } from "../StatusTransition";
import { createTestQueryClient } from "@/test/setup";

const mockUseCustomer = vi.fn();
const mockUseActivateCustomer = vi.fn();
const mockUseSuspendCustomer = vi.fn();

vi.mock("../../hooks/useCustomers", () => ({
  useCustomer: (id: string) => mockUseCustomer(id),
  useActivateCustomer: () => mockUseActivateCustomer(),
  useSuspendCustomer: () => mockUseSuspendCustomer(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("StatusTransition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActivateCustomer.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseSuspendCustomer.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("shows loading state when customer is loading", () => {
    mockUseCustomer.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<StatusTransition customerId="cust-1" />);
    expect(screen.queryByText("Status Management")).not.toBeInTheDocument();
  });

  it("shows customer not found when no customer", () => {
    mockUseCustomer.mockReturnValue({ data: null, isLoading: false });
    renderWithProviders(<StatusTransition customerId="cust-1" />);
    expect(screen.getByText("Customer not found")).toBeInTheDocument();
  });

  it("shows current status and transitions when customer loaded", async () => {
    mockUseCustomer.mockReturnValue({
      data: {
        id: "cust-1",
        status: "pending",
        approval_status: "not_required",
        name: "Test",
        email: "a@b.com",
      },
      isLoading: false,
    });
    renderWithProviders(<StatusTransition customerId="cust-1" />);
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});

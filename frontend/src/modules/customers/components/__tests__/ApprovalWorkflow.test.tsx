/**
 * Unit tests for ApprovalWorkflow component.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ApprovalWorkflow } from "../ApprovalWorkflow";
import { createTestQueryClient } from "@/test/setup";

const mockUseCustomer = vi.fn();
const mockUseSubmitForApproval = vi.fn();
const mockUseApproveCustomer = vi.fn();
const mockUseRejectCustomer = vi.fn();

vi.mock("../../hooks/useCustomers", () => ({
  useCustomer: (id: string) => mockUseCustomer(id),
  useSubmitForApproval: () => mockUseSubmitForApproval(),
  useApproveCustomer: () => mockUseApproveCustomer(),
  useRejectCustomer: () => mockUseRejectCustomer(),
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("ApprovalWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubmitForApproval.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseApproveCustomer.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseRejectCustomer.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("shows loading state when customer is loading", () => {
    mockUseCustomer.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<ApprovalWorkflow customerId="cust-1" />);
    expect(screen.queryByText("Submit for Approval")).not.toBeInTheDocument();
  });

  it("shows customer not found when no customer", () => {
    mockUseCustomer.mockReturnValue({ data: null, isLoading: false });
    renderWithProviders(<ApprovalWorkflow customerId="cust-1" />);
    expect(screen.getByText("Customer not found")).toBeInTheDocument();
  });

  it("shows approval status when customer loaded", async () => {
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
    renderWithProviders(<ApprovalWorkflow customerId="cust-1" />);
    await waitFor(() => {
      expect(screen.getByText("Not Required")).toBeInTheDocument();
    });
    expect(screen.getByText("Submit for Approval")).toBeInTheDocument();
  });
});

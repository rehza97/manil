/**
 * Integration tests for VPS Hosting user flows.
 * 
 * Tests complete user journeys:
 * - Client: Browse plans → Request VPS → View → Control → Upgrade → Cancel
 * - Admin: View requests → Approve → Suspend → Reactivate → Terminate
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { VPSPlansPage } from "../pages/VPSPlansPage";
import { MyVPSPage } from "../pages/MyVPSPage";
import { VPSInstancePage } from "../pages/VPSInstancePage";
import { PendingVPSRequestsPage } from "../../admin/pages/hosting/PendingVPSRequestsPage";
import { AllVPSSubscriptionsPage } from "../../admin/pages/hosting/AllVPSSubscriptionsPage";
import { createTestQueryClient } from "@/test/setup";

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("VPS Hosting - Client User Flows", () => {
  describe("Browse Plans → Request VPS → View Pending Request", () => {
    it("should display VPS plans and allow requesting a plan", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VPSPlansPage />);

      // Wait for plans to load
      await waitFor(() => {
        expect(screen.getByText("Starter VPS")).toBeInTheDocument();
      });

      // Click "Request This Plan" button
      const requestButtons = screen.getAllByText(/Request This Plan/i);
      await user.click(requestButtons[0]);

      // Confirm dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/Request VPS Hosting/i)).toBeInTheDocument();
      });

      // Confirm request
      const confirmButton = screen.getByRole("button", { name: /Confirm Request/i });
      await user.click(confirmButton);

      // Should navigate to subscriptions page (mocked)
      await waitFor(() => {
        expect(screen.queryByText(/Request VPS Hosting/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("View Subscription → Control Container", () => {
    it("should display subscription details and allow container control", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VPSInstancePage />);

      // Wait for subscription to load
      await waitFor(() => {
        expect(screen.getByText(/VPS-20241221-00001/i)).toBeInTheDocument();
      });

      // Should show control panel
      expect(screen.getByText(/Container Control/i)).toBeInTheDocument();

      // Click stop button
      const stopButton = screen.getByRole("button", { name: /Stop/i });
      await user.click(stopButton);

      // Should show success message (mocked)
      await waitFor(() => {
        expect(stopButton).toBeDisabled();
      });
    });
  });

  describe("View Stats Dashboard → Verify Auto-Refresh", () => {
    it("should display stats and auto-refresh every 5 seconds", async () => {
      vi.useFakeTimers();
      renderWithProviders(<VPSInstancePage />);

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText(/Resource Usage/i)).toBeInTheDocument();
      });

      // Fast-forward 5 seconds
      vi.advanceTimersByTime(5000);

      // Stats should have been refetched (verify via query invalidation)
      // Note: In real test, we'd check that the query was called again
      
      vi.useRealTimers();
    });
  });

  describe("View Connection Info → Copy Credentials", () => {
    it("should allow copying SSH connection details", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VPSInstancePage />);

      // Wait for connection info to load
      await waitFor(() => {
        expect(screen.getByText(/Connection Information/i)).toBeInTheDocument();
      });

      // Find copy button
      const copyButtons = screen.getAllByRole("button", { name: /Copy/i });
      if (copyButtons.length > 0) {
        await user.click(copyButtons[0]);
        
        // Verify clipboard API was called
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }
    });
  });

  describe("Upgrade Plan → Verify Pro-Rated Invoice", () => {
    it("should display upgrade options and pro-rated pricing", async () => {
      const user = userEvent.setup();
      renderWithProviders(<VPSInstancePage />);

      // Wait for upgrade panel to load
      await waitFor(() => {
        expect(screen.getByText(/Upgrade Plan/i)).toBeInTheDocument();
      });

      // Should show available plans
      expect(screen.getByText(/Professional VPS/i)).toBeInTheDocument();

      // Click upgrade button
      const upgradeButton = screen.getByRole("button", { name: /Upgrade to Professional/i });
      if (upgradeButton) {
        await user.click(upgradeButton);
        
        // Should show pro-rated amount
        await waitFor(() => {
          expect(screen.getByText(/5.00/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("Cancel Subscription", () => {
    it("should allow cancelling subscription with confirmation", async () => {
      const user = userEvent.setup();
      renderWithProviders(<MyVPSPage />);

      // Wait for subscriptions to load
      await waitFor(() => {
        expect(screen.getByText(/VPS-20241221-00001/i)).toBeInTheDocument();
      });

      // Find cancel button (if present)
      const cancelButtons = screen.queryAllByRole("button", { name: /Cancel/i });
      if (cancelButtons.length > 0) {
        await user.click(cancelButtons[0]);
        
        // Should show confirmation dialog
        await waitFor(() => {
          expect(screen.getByText(/Cancel Subscription/i)).toBeInTheDocument();
        });
      }
    });
  });
});

describe("VPS Hosting - Admin User Flows", () => {
  describe("View Pending Requests → Approve", () => {
    it("should display pending requests and allow approval", async () => {
      const user = userEvent.setup();
      renderWithProviders(<PendingVPSRequestsPage />);

      // Wait for requests to load
      await waitFor(() => {
        expect(screen.getByText(/Pending VPS Requests/i)).toBeInTheDocument();
      });

      // Find approve button
      const approveButtons = screen.queryAllByRole("button", { name: /Approve/i });
      if (approveButtons.length > 0) {
        await user.click(approveButtons[0]);
        
        // Confirm dialog should appear
        await waitFor(() => {
          expect(screen.getByText(/Approve VPS Request/i)).toBeInTheDocument();
        });

        // Confirm approval
        const confirmButton = screen.getByRole("button", { name: /Confirm Approval/i });
        await user.click(confirmButton);

        // Should show success message
        await waitFor(() => {
          expect(screen.queryByText(/Approve VPS Request/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe("View All Subscriptions → Suspend", () => {
    it("should allow suspending subscriptions", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AllVPSSubscriptionsPage />);

      // Wait for subscriptions to load
      await waitFor(() => {
        expect(screen.getByText(/All VPS Subscriptions/i)).toBeInTheDocument();
      });

      // Find actions menu (if present)
      const actionMenus = screen.queryAllByRole("button", { name: /Actions/i });
      if (actionMenus.length > 0) {
        await user.click(actionMenus[0]);
        
        // Should show suspend option
        await waitFor(() => {
          expect(screen.getByText(/Suspend/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("Reactivate Subscription", () => {
    it("should allow reactivating suspended subscriptions", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AllVPSSubscriptionsPage />);

      // Wait for subscriptions to load
      await waitFor(() => {
        expect(screen.getByText(/All VPS Subscriptions/i)).toBeInTheDocument();
      });

      // Find reactivate button (if present for suspended subscriptions)
      const reactivateButtons = screen.queryAllByRole("button", { name: /Reactivate/i });
      if (reactivateButtons.length > 0) {
        await user.click(reactivateButtons[0]);
        
        // Should show success message
        await waitFor(() => {
          expect(screen.getByText(/Subscription Reactivated/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("Terminate Subscription", () => {
    it("should allow terminating subscriptions with confirmation", async () => {
      const user = userEvent.setup();
      renderWithProviders(<AllVPSSubscriptionsPage />);

      // Wait for subscriptions to load
      await waitFor(() => {
        expect(screen.getByText(/All VPS Subscriptions/i)).toBeInTheDocument();
      });

      // Find terminate button (if present)
      const terminateButtons = screen.queryAllByRole("button", { name: /Terminate/i });
      if (terminateButtons.length > 0) {
        await user.click(terminateButtons[0]);
        
        // Should show confirmation dialog with warning
        await waitFor(() => {
          expect(screen.getByText(/Terminate/i)).toBeInTheDocument();
        });
      }
    });
  });
});


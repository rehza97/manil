/**
 * Performance tests for UI with large datasets.
 * 
 * Tests:
 * - 100+ subscriptions in table
 * - 1000+ metrics in charts
 * - Rendering performance
 * - Pagination performance
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { MyVPSPage } from "@/modules/hosting/pages/MyVPSPage";
import { VPSInstancePage } from "@/modules/hosting/pages/VPSInstancePage";
import { AllVPSSubscriptionsPage } from "@/modules/admin/pages/hosting/AllVPSSubscriptionsPage";
import { createTestQueryClient, server } from "@/test/setup";
import { http, HttpResponse } from "msw";

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("UI Performance with Large Datasets", () => {
  it("should render 100+ subscriptions in table efficiently", async () => {
    // Mock 100 subscriptions
    const largeSubscriptions = Array.from({ length: 100 }, (_, i) => ({
      id: `sub-${i}`,
      subscription_number: `VPS-20241221-${String(i + 1).padStart(5, "0")}`,
      customer_id: "user-1",
      plan_id: "plan-1",
      status: "ACTIVE",
      billing_cycle: "MONTHLY",
      auto_renew: true,
      grace_period_days: 7,
      total_invoiced: 10.0,
      total_paid: 10.0,
      is_trial: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      plan: {
        id: "plan-1",
        name: "Starter VPS",
      },
    }));

    server.use(
      http.get("/api/v1/hosting/subscriptions", () => {
        return HttpResponse.json({
          items: largeSubscriptions,
          total: 100,
          page: 1,
          page_size: 20,
          total_pages: 5,
        });
      })
    );

    const startTime = performance.now();
    renderWithProviders(<MyVPSPage />);

    await waitFor(() => {
      expect(screen.getByText(/VPS-20241221-00001/i)).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in <2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  it("should render 1000+ metrics in charts efficiently", async () => {
    // Mock 1000 metrics
    const largeMetricsHistory = Array.from({ length: 1000 }, (_, i) => ({
      id: `metric-${i}`,
      subscription_id: "sub-1",
      container_id: "container-1",
      cpu_usage_percent: 30 + (i % 20),
      memory_usage_mb: 512 + (i % 100),
      memory_usage_percent: 25 + (i % 10),
      storage_usage_mb: 2560,
      storage_usage_percent: 10,
      network_rx_bytes: 1000000 + i * 1000,
      network_tx_bytes: 500000 + i * 500,
      block_read_bytes: 2000000,
      block_write_bytes: 1000000,
      process_count: 5,
      recorded_at: new Date(Date.now() - (1000 - i) * 3600000).toISOString(),
    }));

    server.use(
      http.get("/api/v1/hosting/instances/sub-1/stats", () => {
        return HttpResponse.json({
          current: {
            cpu_percent: 45.5,
            memory_percent: 50.0,
            storage_percent: 20.0,
            network_rx_mb: 1.0,
            network_tx_mb: 0.5,
            uptime: "1 day",
            status: "RUNNING",
          },
          history: largeMetricsHistory,
        });
      })
    );

    const startTime = performance.now();
    renderWithProviders(<VPSInstancePage />, ["/dashboard/vps/subscriptions/sub-1"]);

    await waitFor(() => {
      expect(screen.getByText(/Resource Usage/i)).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in <2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  it("should handle pagination efficiently with large datasets", async () => {
    const largeSubscriptions = Array.from({ length: 200 }, (_, i) => ({
      id: `sub-${i}`,
      subscription_number: `VPS-20241221-${String(i + 1).padStart(5, "0")}`,
      customer_id: "user-1",
      plan_id: "plan-1",
      status: "ACTIVE",
      billing_cycle: "MONTHLY",
      auto_renew: true,
      grace_period_days: 7,
      total_invoiced: 10.0,
      total_paid: 10.0,
      is_trial: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      plan: {
        id: "plan-1",
        name: "Starter VPS",
      },
    }));

    server.use(
      http.get("/api/v1/hosting/admin/subscriptions", ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const page_size = parseInt(url.searchParams.get("page_size") || "20");
        const start = (page - 1) * page_size;
        const end = start + page_size;

        return HttpResponse.json({
          items: largeSubscriptions.slice(start, end),
          total: 200,
          page,
          page_size,
          total_pages: 10,
        });
      })
    );

    renderWithProviders(<AllVPSSubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/All VPS Subscriptions/i)).toBeInTheDocument();
    });

    // Pagination should work correctly
    const nextButton = screen.queryByRole("button", { name: /Next/i });
    expect(nextButton).toBeInTheDocument();
  });
});










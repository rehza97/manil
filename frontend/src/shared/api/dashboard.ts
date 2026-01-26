/**
 * Dashboard API Client
 *
 * Handles dashboard-related API calls for customer, corporate, and admin dashboards
 *
 * @module shared/api/dashboard
 */

import { apiClient } from "./client";
import type { AxiosResponse } from "axios";

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  activeServices: number;
  openTickets: number;
  pendingOrders: number;
  totalSpent: number;
}

export interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface RecentOrder {
  id: string;
  service: string;
  status: string;
  amount: number;
  created_at: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentTickets: RecentTicket[];
  recentOrders: RecentOrder[];
}

// Backend response types
interface BackendDashboardMetrics {
  total_customers: number;
  active_customers: number;
  pending_customers: number;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_products: number;
  active_products: number;
  total_revenue: number;
}

interface BackendRecentActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  status?: string;
  priority?: string;
  amount?: number;
}

interface BackendDashboardResponse {
  metrics: BackendDashboardMetrics;
  recent_activity: BackendRecentActivity[];
  trends: Record<string, Array<{ date: string; value: number; label?: string }>>;
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformDashboardResponse(
  backendData: BackendDashboardResponse
): DashboardResponse {
  // Transform metrics to stats
  // Note: total_revenue from backend (business perspective) = totalSpent from customer perspective
  // This is semantically correct - what the business earns (revenue) is what the customer spends
  const stats: DashboardStats = {
    activeServices: backendData.metrics.active_products || 0,
    openTickets: backendData.metrics.open_tickets || 0,
    pendingOrders: backendData.metrics.pending_orders || 0,
    totalSpent: backendData.metrics.total_revenue || 0,
  };

  // Filter and transform recent activity to tickets
  const recentTickets: RecentTicket[] = backendData.recent_activity
    .filter((activity) => activity.type === "ticket")
    .slice(0, 5)
    .map((activity) => ({
      id: activity.id,
      subject: activity.title,
      status: activity.status || "open",
      priority: activity.priority || "medium", // Use priority from backend, default to medium if not provided
      created_at: activity.timestamp,
    }));

  // Filter and transform recent activity to orders
  const recentOrders: RecentOrder[] = backendData.recent_activity
    .filter((activity) => activity.type === "order")
    .slice(0, 5)
    .map((activity) => {
      // Use amount directly from backend if available, otherwise extract from description
      let amount = 0;
      if (activity.amount !== undefined && activity.amount !== null) {
        amount = activity.amount;
      } else if (activity.description) {
        // Fallback: Extract amount from description if backend doesn't provide it (e.g., "Total: 299.99 DZD")
        const amountMatch = activity.description.match(/(\d+\.?\d*)/);
        amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      }

      return {
        id: activity.id,
        service: activity.title.replace("Order ", ""),
        status: activity.status || "pending",
        amount: amount,
        created_at: activity.timestamp,
      };
    });

  return {
    stats,
    recentTickets,
    recentOrders,
  };
}

// ============================================================================
// API Client Functions
// ============================================================================

/**
 * Dashboard API Client
 */
export const dashboardApi = {
  /**
   * Get customer dashboard data
   * GET /api/v1/reports/dashboard/customer
   */
  getCustomerDashboard: async (period: string = "month"): Promise<DashboardResponse> => {
    const response: AxiosResponse<BackendDashboardResponse> = await apiClient.get(
      "/reports/dashboard/customer",
      {
        params: { period },
      }
    );
    return transformDashboardResponse(response.data);
  },
};

// Named export to avoid conflict with dashboard directory
export { dashboardApi as customerDashboardApi };
export default dashboardApi;


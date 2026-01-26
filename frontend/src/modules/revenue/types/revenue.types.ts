/**
 * Revenue Types
 *
 * TypeScript interfaces for revenue data structures.
 */

export enum RevenueType {
  RECOGNIZED = "recognized", // Paid invoices (cash received)
  BOOKED = "booked", // Delivered orders (earned but may not be paid)
  RECURRING = "recurring", // Subscription MRR
  DEFERRED = "deferred", // Paid but not yet delivered
}

export enum RevenueCategory {
  PRODUCT_SALES = "product_sales",
  SUBSCRIPTIONS = "subscriptions",
  SERVICES = "services",
  OTHER = "other",
}

export interface RevenueMetrics {
  total_revenue: number;
  booked_revenue: number;
  recurring_revenue: number;
  deferred_revenue: number;
  monthly_revenue: number;
  previous_month_revenue: number;
  revenue_growth: number;
}

export interface RevenueOverview {
  metrics: RevenueMetrics;
  period: string;
  calculated_at: string;
}

export interface RevenueTrendDataPoint {
  date: string;
  recognized_revenue: number;
  booked_revenue: number;
  recurring_revenue: number;
  total_revenue: number;
}

export interface RevenueTrends {
  period: string;
  start_date: string;
  end_date: string;
  data: RevenueTrendDataPoint[];
}

export interface CategoryRevenue {
  category: RevenueCategory;
  revenue: number;
  percentage: number;
  count: number;
}

export interface RevenueByCategory {
  period: string;
  total_revenue: number;
  categories: CategoryRevenue[];
}

export interface CustomerRevenue {
  customer_id: string;
  customer_name: string;
  revenue: number;
  order_count: number;
  invoice_count: number;
  last_transaction_date?: string;
}

export interface RevenueByCustomer {
  period: string;
  total_revenue: number;
  customers: CustomerRevenue[];
  limit: number;
}

export interface ReconciliationItem {
  order_id?: string;
  invoice_id?: string;
  order_amount: number;
  invoice_amount: number;
  difference: number;
  status: string;
}

export interface RevenueReconciliation {
  period: string;
  total_orders_revenue: number;
  total_invoices_revenue: number;
  difference: number;
  matched_count: number;
  unmatched_orders_count: number;
  unmatched_invoices_count: number;
  items: ReconciliationItem[];
}

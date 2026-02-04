/**
 * Report Types
 *
 * TypeScript interfaces for all report data structures.
 */

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardMetrics {
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

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
  status?: string;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  recent_activity: RecentActivity[];
  trends: {
    [key: string]: TrendData[];
  };
}

// ============================================================================
// Ticket Report Types
// ============================================================================

export interface TicketStatusReport {
  status: string;
  count: number;
  percentage: number;
}

export interface TicketPriorityReport {
  priority: string;
  count: number;
  percentage: number;
  avg_resolution_time?: number;
}

export interface TicketCategoryReport {
  category: string;
  category_id?: number;
  count: number;
  percentage: number;
  avg_resolution_time?: number;
}

export interface AgentPerformance {
  agent_id: number;
  agent_name: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_response_time?: number;
  avg_resolution_time?: number;
  resolution_rate: number;
}

export interface TeamPerformance {
  team_name: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_response_time?: number;
  avg_resolution_time?: number;
  resolution_rate: number;
  agents: AgentPerformance[];
}

export interface ResponseTimeMetrics {
  avg_first_response_time?: number;
  median_first_response_time?: number;
  min_response_time?: number;
  max_response_time?: number;
  within_sla: number;
  breached_sla: number;
  sla_compliance_rate: number;
}

export interface ResolutionTimeMetrics {
  avg_resolution_time?: number;
  median_resolution_time?: number;
  min_resolution_time?: number;
  max_resolution_time?: number;
  within_sla: number;
  breached_sla: number;
  sla_compliance_rate: number;
}

export interface OpenVsClosedReport {
  period: string;
  open_count: number;
  closed_count: number;
  total_count: number;
  closure_rate: number;
}

// ============================================================================
// Customer Report Types
// ============================================================================

export interface CustomerStatusReport {
  status: string;
  count: number;
  percentage: number;
}

export interface CustomerTypeReport {
  customer_type: string;
  count: number;
  percentage: number;
}

export interface CustomerGrowthReport {
  period: string;
  new_customers: number;
  total_customers: number;
  growth_rate: number;
}

export interface KYCStatusReport {
  status: string;
  count: number;
  percentage: number;
}

// ============================================================================
// Order Report Types
// ============================================================================

export interface OrderStatusReport {
  status: string;
  count: number;
  percentage: number;
  total_value: number;
}

export interface OrderValueMetrics {
  total_orders: number;
  total_value: number;
  avg_order_value: number;
  min_order_value: number;
  max_order_value: number;
}

export interface MonthlyOrderReport {
  month: string;
  order_count: number;
  total_value: number;
  avg_order_value: number;
}

export interface ProductPerformance {
  product_id: number;
  product_name: string;
  order_count: number;
  quantity_sold: number;
  total_revenue: number;
}

export interface CustomerOrderReport {
  customer_id: number;
  customer_name: string;
  order_count: number;
  total_value: number;
  avg_order_value: number;
  last_order_date?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export interface ReportFilter {
  date_range?: DateRangeFilter;
  status?: string;
  category?: string;
  agent_id?: number;
  customer_id?: number;
  product_id?: number;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportRequest {
  report_type: 'tickets' | 'customers' | 'orders';
  format: 'csv' | 'excel' | 'pdf';
  filters?: ReportFilter;
  include_charts?: boolean;
}

export interface ExportResponse {
  file_name: string;
  file_path: string;
  file_size: number;
  format: string;
  generated_at: string;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
}

export interface LineChartData {
  name: string;
  [key: string]: string | number;
}

export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

// ============================================================================
// Live Report Preview Types
// ============================================================================

export interface ChartSeries {
  name: string;
  dataKey: string;
  color?: string;
  data?: Record<string, any>[];
}

export interface ChartConfig {
  chart_id: string;
  chart_type: 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'scatter';
  title: string;
  subtitle?: string;
  data: Record<string, any>[];
  dataKeys?: {
    xAxis?: string;
    yAxis?: string;
    [key: string]: string | undefined;
  };
  series?: ChartSeries[];
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  height?: number;
  config?: Record<string, any>;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'duration';
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: string;
  width?: string;
}

export interface TableRow {
  data: Record<string, any>;
  metadata?: Record<string, any>;
  className?: string;
}

export interface TableData {
  table_id: string;
  title: string;
  subtitle?: string;
  columns: TableColumn[];
  rows: TableRow[];
  totals?: Record<string, any>;
  pagination?: boolean;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportMetadata {
  report_id: string;
  report_type: string;
  report_name: string;
  description?: string;
  generated_at: string;
  generated_by?: string;
  date_range?: Record<string, any>;
  filters?: Record<string, any>;
  total_records?: number;
  period_label?: string;
}

export interface ReportSummary {
  key: string;
  label: string;
  value: any;
  format?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  icon?: string;
  color?: string;
}

export interface ReportPreviewData {
  metadata: ReportMetadata;
  summary: ReportSummary[];
  charts: ChartConfig[];
  tables: TableData[];
  raw_data?: Record<string, any>;
  export_formats: string[];
}

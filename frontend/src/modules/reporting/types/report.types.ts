export interface DashboardMetrics {
  totalCustomers: number;
  totalTickets: number;
  totalOrders: number;
  totalRevenue: number;
  openTickets: number;
  pendingOrders: number;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  status?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

export enum ReportType {
  SALES = "sales",
  CUSTOMERS = "customers",
  TICKETS = "tickets",
  REVENUE = "revenue",
}

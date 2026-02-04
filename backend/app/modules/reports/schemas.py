"""
Report Schemas

Pydantic schemas for all report responses and filters.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# Dashboard Schemas
# ============================================================================

class DashboardMetrics(BaseModel):
    """Overall dashboard metrics"""
    total_customers: int = 0
    active_customers: int = 0
    pending_customers: int = 0
    total_tickets: int = 0
    open_tickets: int = 0
    resolved_tickets: int = 0
    total_orders: int = 0
    pending_orders: int = 0
    completed_orders: int = 0
    total_products: int = 0
    active_products: int = 0
    total_revenue: float = 0.0

    class Config:
        from_attributes = True


class RecentActivity(BaseModel):
    """Recent activity item"""
    id: str
    type: str  # ticket, order, customer, etc.
    title: str
    description: Optional[str] = None
    timestamp: datetime
    user: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None  # For tickets: priority level
    amount: Optional[float] = None  # For orders: total amount

    class Config:
        from_attributes = True


class TrendData(BaseModel):
    """Trend data point"""
    date: str
    value: int
    label: Optional[str] = None

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    """Complete dashboard response"""
    metrics: DashboardMetrics
    recent_activity: List[RecentActivity] = []
    trends: Dict[str, List[TrendData]] = {}

    class Config:
        from_attributes = True


# ============================================================================
# Ticket Report Schemas
# ============================================================================

class TicketStatusReport(BaseModel):
    """Tickets grouped by status"""
    status: str
    count: int
    percentage: float

    class Config:
        from_attributes = True


class TicketPriorityReport(BaseModel):
    """Tickets grouped by priority"""
    priority: str
    count: int
    percentage: float
    avg_resolution_time: Optional[float] = None  # in hours

    class Config:
        from_attributes = True


class TicketCategoryReport(BaseModel):
    """Tickets grouped by category"""
    category: str
    category_id: Optional[int] = None
    count: int
    percentage: float
    avg_resolution_time: Optional[float] = None

    class Config:
        from_attributes = True


class AgentPerformance(BaseModel):
    """Agent performance metrics"""
    agent_id: int
    agent_name: str
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    avg_response_time: Optional[float] = None  # in hours
    avg_resolution_time: Optional[float] = None  # in hours
    resolution_rate: float = 0.0  # percentage

    class Config:
        from_attributes = True


class TeamPerformance(BaseModel):
    """Team performance metrics"""
    team_name: str
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    avg_response_time: Optional[float] = None
    avg_resolution_time: Optional[float] = None
    resolution_rate: float = 0.0
    agents: List[AgentPerformance] = []

    class Config:
        from_attributes = True


class ResponseTimeMetrics(BaseModel):
    """Response time analytics"""
    avg_first_response_time: Optional[float] = None  # in hours
    median_first_response_time: Optional[float] = None
    min_response_time: Optional[float] = None
    max_response_time: Optional[float] = None
    within_sla: int = 0
    breached_sla: int = 0
    sla_compliance_rate: float = 0.0

    class Config:
        from_attributes = True


class ResolutionTimeMetrics(BaseModel):
    """Resolution time analytics"""
    avg_resolution_time: Optional[float] = None  # in hours
    median_resolution_time: Optional[float] = None
    min_resolution_time: Optional[float] = None
    max_resolution_time: Optional[float] = None
    within_sla: int = 0
    breached_sla: int = 0
    sla_compliance_rate: float = 0.0

    class Config:
        from_attributes = True


class OpenVsClosedReport(BaseModel):
    """Open vs closed tickets report"""
    period: str
    open_count: int
    closed_count: int
    total_count: int
    closure_rate: float = 0.0

    class Config:
        from_attributes = True


# ============================================================================
# Customer Report Schemas
# ============================================================================

class CustomerStatusReport(BaseModel):
    """Customers grouped by status"""
    status: str
    count: int
    percentage: float

    class Config:
        from_attributes = True


class CustomerTypeReport(BaseModel):
    """Customers grouped by type"""
    customer_type: str
    count: int
    percentage: float

    class Config:
        from_attributes = True


class CustomerGrowthReport(BaseModel):
    """Customer growth over time"""
    period: str
    new_customers: int
    total_customers: int
    growth_rate: float = 0.0

    class Config:
        from_attributes = True


class KYCStatusReport(BaseModel):
    """KYC verification status report"""
    status: str
    count: int
    percentage: float

    class Config:
        from_attributes = True


# ============================================================================
# Order Report Schemas
# ============================================================================

class OrderStatusReport(BaseModel):
    """Orders grouped by status"""
    status: str
    count: int
    percentage: float
    total_value: float = 0.0

    class Config:
        from_attributes = True


class OrderValueMetrics(BaseModel):
    """Order value metrics"""
    total_orders: int
    total_value: float
    avg_order_value: float
    min_order_value: float
    max_order_value: float

    class Config:
        from_attributes = True


class MonthlyOrderReport(BaseModel):
    """Monthly order statistics"""
    month: str
    order_count: int
    total_value: float
    avg_order_value: float

    class Config:
        from_attributes = True


class ProductPerformance(BaseModel):
    """Product performance in orders"""
    product_id: int
    product_name: str
    order_count: int
    quantity_sold: int
    total_revenue: float

    class Config:
        from_attributes = True


class CustomerOrderReport(BaseModel):
    """Orders grouped by customer"""
    customer_id: int
    customer_name: str
    order_count: int
    total_value: float
    avg_order_value: float
    last_order_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Filter Schemas
# ============================================================================

class DateRangeFilter(BaseModel):
    """Date range filter for reports"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    period: Optional[str] = None  # today, week, month, quarter, year, custom

    class Config:
        from_attributes = True


class ReportFilter(BaseModel):
    """Generic report filter"""
    date_range: Optional[DateRangeFilter] = None
    date_from: Optional[str] = None  # YYYY-MM-DD, for export alignment with frontend
    date_to: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    agent_id: Optional[int] = None
    customer_id: Optional[int] = None
    product_id: Optional[int] = None

    class Config:
        from_attributes = True


# ============================================================================
# Export Schemas
# ============================================================================

class ExportRequest(BaseModel):
    """Export request parameters"""
    report_type: str  # tickets, customers, orders, etc.
    format: str  # csv, pdf, excel
    filters: Optional[ReportFilter] = None
    include_charts: bool = False

    class Config:
        from_attributes = True


class ExportResponse(BaseModel):
    """Export response"""
    file_name: str
    file_path: str
    file_size: int
    format: str
    generated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Export Model Schemas
# ============================================================================

class ExportCreate(BaseModel):
    """Schema for creating a new export job"""
    export_type: str  # tickets, customers, orders, invoices, quotes, vps, etc.
    export_format: str  # csv, pdf, excel
    title: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ExportUpdate(BaseModel):
    """Schema for updating an export job"""
    status: Optional[str] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    total_records: Optional[int] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class ExportDetail(BaseModel):
    """Detailed export information"""
    id: str
    export_number: str
    export_type: str
    export_format: str
    status: str
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None
    total_records: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    download_count: int = 0
    last_downloaded_at: Optional[datetime] = None
    requested_by_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExportListItem(BaseModel):
    """Export list item (summary)"""
    id: str
    export_number: str
    export_type: str
    export_format: str
    status: str
    title: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    total_records: Optional[int] = None
    download_count: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportListResponse(BaseModel):
    """Paginated export list response"""
    items: List[ExportListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        from_attributes = True


# ============================================================================
# Live Report Preview Schemas
# ============================================================================

class ChartDataPoint(BaseModel):
    """Single data point in a chart"""
    label: str
    value: float
    percentage: Optional[float] = None
    color: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ChartSeries(BaseModel):
    """Chart series for multi-series charts"""
    name: str
    dataKey: str
    color: Optional[str] = None
    data: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True


class ChartConfig(BaseModel):
    """Chart configuration for live preview"""
    chart_id: str
    chart_type: str  # bar, line, pie, area, donut, scatter
    title: str
    subtitle: Optional[str] = None
    data: List[Dict[str, Any]] = []  # Array of data objects
    dataKeys: Optional[Dict[str, str]] = None  # {xAxis: "name", yAxis: "value"}
    series: Optional[List[ChartSeries]] = []  # For multi-series charts
    colors: Optional[List[str]] = None  # Color palette
    xAxisLabel: Optional[str] = None
    yAxisLabel: Optional[str] = None
    showLegend: bool = True
    showGrid: bool = True
    stacked: bool = False
    height: Optional[int] = 300
    config: Optional[Dict[str, Any]] = None  # Additional chart-specific config

    class Config:
        from_attributes = True


class TableColumn(BaseModel):
    """Table column definition"""
    key: str
    label: str
    type: str  # text, number, currency, percentage, date, datetime, duration
    align: Optional[str] = "left"  # left, center, right
    sortable: bool = True
    format: Optional[str] = None  # Format string for numbers/dates
    width: Optional[str] = None  # CSS width value

    class Config:
        from_attributes = True


class TableRow(BaseModel):
    """Table row data"""
    data: Dict[str, Any]  # Column key -> value mapping
    metadata: Optional[Dict[str, Any]] = None
    className: Optional[str] = None  # CSS class for styling

    class Config:
        from_attributes = True


class TableData(BaseModel):
    """Table configuration for live preview"""
    table_id: str
    title: str
    subtitle: Optional[str] = None
    columns: List[TableColumn]
    rows: List[TableRow]
    totals: Optional[Dict[str, Any]] = None  # Summary row data
    pagination: bool = True
    pageSize: int = 10
    sortBy: Optional[str] = None
    sortOrder: Optional[str] = "asc"  # asc, desc

    class Config:
        from_attributes = True


class ReportMetadata(BaseModel):
    """Report metadata"""
    report_id: str
    report_type: str
    report_name: str
    description: Optional[str] = None
    generated_at: datetime
    generated_by: Optional[str] = None
    date_range: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    total_records: Optional[int] = None
    period_label: Optional[str] = None  # "Last 30 days", "Q1 2024", etc.

    class Config:
        from_attributes = True


class ReportSummary(BaseModel):
    """Report summary statistics"""
    key: str
    label: str
    value: Any
    format: Optional[str] = None  # number, currency, percentage, etc.
    trend: Optional[str] = None  # up, down, neutral
    trendValue: Optional[float] = None
    icon: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


class ReportPreviewData(BaseModel):
    """Complete report preview data with charts and tables"""
    metadata: ReportMetadata
    summary: List[ReportSummary] = []
    charts: List[ChartConfig] = []
    tables: List[TableData] = []
    raw_data: Optional[Dict[str, Any]] = None  # Original data for custom rendering
    export_formats: List[str] = ["pdf", "excel", "csv"]  # Available export formats

    class Config:
        from_attributes = True

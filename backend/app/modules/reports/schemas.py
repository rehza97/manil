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

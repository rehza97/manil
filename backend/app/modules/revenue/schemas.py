"""
Revenue Pydantic schemas.

Request/response schemas for revenue management operations.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class RevenueType(str, Enum):
    """Revenue type enumeration."""
    RECOGNIZED = "recognized"  # Paid invoices (cash received)
    BOOKED = "booked"  # Delivered orders (earned but may not be paid)
    RECURRING = "recurring"  # Subscription MRR
    DEFERRED = "deferred"  # Paid but not yet delivered


class RevenueCategory(str, Enum):
    """Revenue category enumeration."""
    PRODUCT_SALES = "product_sales"
    SUBSCRIPTIONS = "subscriptions"
    SERVICES = "services"
    OTHER = "other"


# ============================================================================
# Response Schemas
# ============================================================================

class RevenueMetrics(BaseModel):
    """Revenue metrics summary."""
    total_revenue: Decimal = Field(default=Decimal("0.00"), description="Total recognized revenue")
    booked_revenue: Decimal = Field(default=Decimal("0.00"), description="Total booked revenue (delivered orders)")
    recurring_revenue: Decimal = Field(default=Decimal("0.00"), description="Monthly recurring revenue (MRR)")
    deferred_revenue: Decimal = Field(default=Decimal("0.00"), description="Deferred revenue")
    monthly_revenue: Decimal = Field(default=Decimal("0.00"), description="Current month revenue")
    previous_month_revenue: Decimal = Field(default=Decimal("0.00"), description="Previous month revenue")
    revenue_growth: float = Field(default=0.0, description="Revenue growth percentage")

    model_config = ConfigDict(from_attributes=True)


class RevenueOverview(BaseModel):
    """Overall revenue overview."""
    metrics: RevenueMetrics
    period: str = Field(description="Time period (today, week, month, quarter, year)")
    calculated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)


class RevenueTrendDataPoint(BaseModel):
    """Single data point in revenue trend."""
    date: str = Field(description="Date in YYYY-MM-DD format")
    recognized_revenue: Decimal = Field(default=Decimal("0.00"))
    booked_revenue: Decimal = Field(default=Decimal("0.00"))
    recurring_revenue: Decimal = Field(default=Decimal("0.00"))
    total_revenue: Decimal = Field(default=Decimal("0.00"))

    model_config = ConfigDict(from_attributes=True)


class RevenueTrends(BaseModel):
    """Revenue trends over time."""
    period: str = Field(description="Time period")
    start_date: datetime
    end_date: datetime
    data: List[RevenueTrendDataPoint] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CategoryRevenue(BaseModel):
    """Revenue by category."""
    category: RevenueCategory
    revenue: Decimal = Field(default=Decimal("0.00"))
    percentage: float = Field(default=0.0, description="Percentage of total revenue")
    count: int = Field(default=0, description="Number of transactions")

    model_config = ConfigDict(from_attributes=True)


class RevenueByCategory(BaseModel):
    """Revenue breakdown by category."""
    period: str
    total_revenue: Decimal
    categories: List[CategoryRevenue] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CustomerRevenue(BaseModel):
    """Revenue by customer."""
    customer_id: str
    customer_name: str
    revenue: Decimal = Field(default=Decimal("0.00"))
    order_count: int = Field(default=0)
    invoice_count: int = Field(default=0)
    last_transaction_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RevenueByCustomer(BaseModel):
    """Revenue breakdown by customer."""
    period: str
    total_revenue: Decimal
    customers: List[CustomerRevenue] = Field(default_factory=list)
    limit: int = Field(default=10, description="Number of top customers returned")

    model_config = ConfigDict(from_attributes=True)


class ReconciliationItem(BaseModel):
    """Single reconciliation item."""
    order_id: Optional[str] = None
    invoice_id: Optional[str] = None
    order_amount: Decimal = Field(default=Decimal("0.00"))
    invoice_amount: Decimal = Field(default=Decimal("0.00"))
    difference: Decimal = Field(default=Decimal("0.00"))
    status: str = Field(description="matched, unmatched, partial")

    model_config = ConfigDict(from_attributes=True)


class RevenueReconciliation(BaseModel):
    """Revenue reconciliation between Orders and Invoices."""
    period: str
    total_orders_revenue: Decimal = Field(default=Decimal("0.00"))
    total_invoices_revenue: Decimal = Field(default=Decimal("0.00"))
    difference: Decimal = Field(default=Decimal("0.00"))
    matched_count: int = Field(default=0)
    unmatched_orders_count: int = Field(default=0)
    unmatched_invoices_count: int = Field(default=0)
    items: List[ReconciliationItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

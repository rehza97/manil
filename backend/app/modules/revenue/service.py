"""
Revenue Service

Centralized service for revenue calculations, reporting, and reconciliation.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from .repository import RevenueRepository
from .schemas import (
    RevenueOverview,
    RevenueMetrics,
    RevenueTrends,
    RevenueTrendDataPoint,
    RevenueByCategory,
    CategoryRevenue,
    RevenueByCustomer,
    CustomerRevenue,
    RevenueReconciliation,
    ReconciliationItem,
    RevenueCategory,
)


class RevenueService:
    """Service for revenue management and reporting."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = RevenueRepository(db)

    async def get_overview(
        self,
        period: str = "month",
        customer_id: Optional[str] = None,
    ) -> RevenueOverview:
        """
        Get overall revenue overview.

        Args:
            period: Time period (today, week, month, quarter, year)
            customer_id: Optional customer ID to filter by

        Returns:
            RevenueOverview with all revenue metrics
        """
        # Calculate date range based on period
        end_date = datetime.now(timezone.utc)
        start_date = self._get_period_start_date(period, end_date)

        # Get all revenue types
        recognized_revenue = await self.repository.get_recognized_revenue(
            start_date=start_date,
            end_date=end_date,
            customer_id=customer_id
        )

        booked_revenue = await self.repository.get_booked_revenue(
            start_date=start_date,
            end_date=end_date,
            customer_id=customer_id
        )

        recurring_revenue = await self.repository.get_recurring_revenue(
            customer_id=customer_id
        )

        deferred_revenue = await self.repository.get_deferred_revenue(
            start_date=start_date,
            end_date=end_date,
            customer_id=customer_id
        )

        # Get monthly revenue for current and previous month
        current_month = datetime.now(timezone.utc)
        monthly_revenue = await self.repository.get_monthly_revenue(
            month=current_month,
            customer_id=customer_id
        )

        # Calculate previous month properly
        if current_month.month == 1:
            previous_month = current_month.replace(year=current_month.year - 1, month=12, day=1)
        else:
            previous_month = current_month.replace(month=current_month.month - 1, day=1)
        previous_month_revenue = await self.repository.get_monthly_revenue(
            month=previous_month,
            customer_id=customer_id
        )

        # Calculate growth percentage
        if previous_month_revenue > 0:
            revenue_growth = float(
                ((monthly_revenue - previous_month_revenue) / previous_month_revenue) * 100
            )
        elif monthly_revenue > 0:
            revenue_growth = 100.0  # First month with revenue
        else:
            revenue_growth = 0.0

        metrics = RevenueMetrics(
            total_revenue=recognized_revenue,
            booked_revenue=booked_revenue,
            recurring_revenue=recurring_revenue,
            deferred_revenue=deferred_revenue,
            monthly_revenue=monthly_revenue,
            previous_month_revenue=previous_month_revenue,
            revenue_growth=revenue_growth,
        )

        # Validate metrics
        validation_warnings = self.validate_revenue_metrics(metrics)
        
        # Detect anomalies by comparing with previous month
        previous_metrics = RevenueMetrics(
            total_revenue=previous_month_revenue,
            booked_revenue=Decimal("0"),  # Would need to calculate
            recurring_revenue=recurring_revenue,  # Same for recurring
            deferred_revenue=Decimal("0"),  # Would need to calculate
            monthly_revenue=previous_month_revenue,
            previous_month_revenue=Decimal("0"),
            revenue_growth=0.0,
        )
        anomalies = self.detect_revenue_anomalies(metrics, previous_metrics)
        
        # Log warnings and anomalies if any
        if validation_warnings or anomalies:
            from app.core.logging import logger
            if validation_warnings:
                logger.warning(f"Revenue validation warnings: {validation_warnings}")
            if anomalies:
                logger.warning(f"Revenue anomalies detected: {anomalies}")

        return RevenueOverview(
            metrics=metrics,
            period=period,
            calculated_at=datetime.now(timezone.utc)
        )

    async def get_trends(
        self,
        period: str = "month",
        group_by: str = "day",
    ) -> RevenueTrends:
        """
        Get revenue trends over time.

        Args:
            period: Time period (today, week, month, quarter, year)
            group_by: Grouping (day, week, month)

        Returns:
            RevenueTrends with trend data points
        """
        end_date = datetime.now(timezone.utc)
        start_date = self._get_period_start_date(period, end_date)

        trend_data = await self.repository.get_revenue_trends(
            start_date=start_date,
            end_date=end_date,
            group_by=group_by
        )

        data_points = [
            RevenueTrendDataPoint(
                date=item["date"],
                recognized_revenue=item["recognized_revenue"],
                booked_revenue=item["booked_revenue"],
                recurring_revenue=item["recurring_revenue"],
                total_revenue=item["total_revenue"],
            )
            for item in trend_data
        ]

        return RevenueTrends(
            period=period,
            start_date=start_date,
            end_date=end_date,
            data=data_points
        )

    async def get_by_category(
        self,
        period: str = "month",
    ) -> RevenueByCategory:
        """
        Get revenue breakdown by product category.

        Args:
            period: Time period

        Returns:
            RevenueByCategory with category breakdown
        """
        end_date = datetime.now(timezone.utc)
        start_date = self._get_period_start_date(period, end_date)

        category_data = await self.repository.get_revenue_by_category(
            start_date=start_date,
            end_date=end_date
        )

        total_revenue = sum(item["revenue"] for item in category_data)

        categories = [
            CategoryRevenue(
                category=RevenueCategory(item["category"]) if item["category"] in [e.value for e in RevenueCategory] else RevenueCategory.OTHER,
                revenue=item["revenue"],
                percentage=item["percentage"],
                count=item["count"],
            )
            for item in category_data
        ]

        return RevenueByCategory(
            period=period,
            total_revenue=total_revenue,
            categories=categories
        )

    async def get_by_customer(
        self,
        period: str = "month",
        limit: int = 10,
    ) -> RevenueByCustomer:
        """
        Get revenue breakdown by customer.

        Args:
            period: Time period
            limit: Number of top customers to return

        Returns:
            RevenueByCustomer with customer breakdown
        """
        end_date = datetime.now(timezone.utc)
        start_date = self._get_period_start_date(period, end_date)

        customer_data = await self.repository.get_revenue_by_customer(
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        total_revenue = sum(item["revenue"] for item in customer_data)

        customers = [
            CustomerRevenue(
                customer_id=item["customer_id"],
                customer_name=item["customer_name"],
                revenue=item["revenue"],
                order_count=item.get("order_count", 0),
                invoice_count=item.get("invoice_count", 0),
                last_transaction_date=item.get("last_transaction_date"),
            )
            for item in customer_data
        ]

        return RevenueByCustomer(
            period=period,
            total_revenue=total_revenue,
            customers=customers,
            limit=limit
        )

    async def get_reconciliation(
        self,
        period: str = "month",
    ) -> RevenueReconciliation:
        """
        Get revenue reconciliation between Orders and Invoices.

        Args:
            period: Time period

        Returns:
            RevenueReconciliation with reconciliation data
        """
        end_date = datetime.now(timezone.utc)
        start_date = self._get_period_start_date(period, end_date)

        reconciliation_data = await self.repository.get_reconciliation_data(
            start_date=start_date,
            end_date=end_date
        )

        items = [
            ReconciliationItem(
                order_id=item.get("order_id"),
                invoice_id=item.get("invoice_id"),
                order_amount=item["order_amount"],
                invoice_amount=item["invoice_amount"],
                difference=item["difference"],
                status=item["status"],
            )
            for item in reconciliation_data["items"]
        ]

        return RevenueReconciliation(
            period=period,
            total_orders_revenue=reconciliation_data["total_orders_revenue"],
            total_invoices_revenue=reconciliation_data["total_invoices_revenue"],
            difference=reconciliation_data["difference"],
            matched_count=reconciliation_data["matched_count"],
            unmatched_orders_count=reconciliation_data["unmatched_orders_count"],
            unmatched_invoices_count=reconciliation_data["unmatched_invoices_count"],
            items=items
        )

    def validate_revenue_metrics(self, metrics: RevenueMetrics) -> List[str]:
        """
        Validate revenue metrics for anomalies and inconsistencies.
        
        Returns:
            List of validation warnings/errors (empty if all valid)
        """
        warnings = []
        
        # Check for negative values
        if metrics.total_revenue < 0:
            warnings.append("Total revenue is negative")
        if metrics.booked_revenue < 0:
            warnings.append("Booked revenue is negative")
        if metrics.recurring_revenue < 0:
            warnings.append("Recurring revenue is negative")
        if metrics.deferred_revenue < 0:
            warnings.append("Deferred revenue is negative")
        if metrics.monthly_revenue < 0:
            warnings.append("Monthly revenue is negative")
        if metrics.previous_month_revenue < 0:
            warnings.append("Previous month revenue is negative")
        
        # Check for unrealistic growth (more than 1000% or less than -100%)
        if metrics.revenue_growth > 1000:
            warnings.append(f"Unusually high revenue growth: {metrics.revenue_growth:.2f}%")
        elif metrics.revenue_growth < -100:
            warnings.append(f"Revenue growth below -100%: {metrics.revenue_growth:.2f}%")
        
        # Check if total revenue matches sum of components (with tolerance for rounding)
        component_sum = (
            metrics.booked_revenue + 
            metrics.recurring_revenue + 
            metrics.deferred_revenue
        )
        difference = abs(float(metrics.total_revenue) - float(component_sum))
        if difference > 0.01:  # Allow small rounding differences
            warnings.append(
                f"Total revenue ({metrics.total_revenue}) doesn't match sum of components "
                f"({component_sum}), difference: {difference}"
            )
        
        return warnings

    def detect_revenue_anomalies(
        self,
        current_metrics: RevenueMetrics,
        historical_metrics: Optional[RevenueMetrics] = None,
    ) -> List[str]:
        """
        Detect revenue anomalies by comparing with historical data.
        
        Args:
            current_metrics: Current period revenue metrics
            historical_metrics: Previous period metrics for comparison
            
        Returns:
            List of detected anomalies
        """
        anomalies = []
        
        if historical_metrics is None:
            return anomalies
        
        # Detect sudden drops (more than 50% decrease)
        if historical_metrics.monthly_revenue > 0:
            drop_percentage = (
                (float(historical_metrics.monthly_revenue) - float(current_metrics.monthly_revenue))
                / float(historical_metrics.monthly_revenue)
                * 100
            )
            if drop_percentage > 50:
                anomalies.append(
                    f"Significant revenue drop detected: {drop_percentage:.2f}% decrease "
                    f"from {historical_metrics.monthly_revenue} to {current_metrics.monthly_revenue}"
                )
        
        # Detect sudden spikes (more than 200% increase)
        if historical_metrics.monthly_revenue > 0:
            increase_percentage = (
                (float(current_metrics.monthly_revenue) - float(historical_metrics.monthly_revenue))
                / float(historical_metrics.monthly_revenue)
                * 100
            )
            if increase_percentage > 200:
                anomalies.append(
                    f"Unusual revenue spike detected: {increase_percentage:.2f}% increase "
                    f"from {historical_metrics.monthly_revenue} to {current_metrics.monthly_revenue}"
                )
        
        # Detect if deferred revenue is unusually high compared to recognized revenue
        if current_metrics.total_revenue > 0:
            deferred_ratio = float(current_metrics.deferred_revenue) / float(current_metrics.total_revenue)
            if deferred_ratio > 0.5:  # More than 50% deferred
                anomalies.append(
                    f"High deferred revenue ratio: {deferred_ratio:.2%} of total revenue is deferred"
                )
        
        return anomalies

    def _get_period_start_date(self, period: str, end_date: datetime) -> datetime:
        """Calculate start date based on period."""
        # Ensure timezone-aware datetime
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
            
        if period == "today":
            return end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            return end_date - timedelta(days=7)
        elif period == "month":
            return end_date - timedelta(days=30)
        elif period == "quarter":
            return end_date - timedelta(days=90)
        elif period == "year":
            return end_date - timedelta(days=365)
        else:
            return end_date - timedelta(days=30)  # Default to month

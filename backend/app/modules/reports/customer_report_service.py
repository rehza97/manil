"""
Customer Report Service

Provides customer analytics and reports.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from .schemas import (
    CustomerStatusReport,
    CustomerTypeReport,
    CustomerGrowthReport,
    KYCStatusReport,
)


class CustomerReportService:
    """Service for customer reports and analytics"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_customers_by_status(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[CustomerStatusReport]:
        """
        Get customers grouped by status

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Customer.deleted_at.is_(None)]

        if start_date:
            conditions.append(Customer.created_at >= start_date)
        if end_date:
            conditions.append(Customer.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Customer.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1

        # Get count by status
        query = select(
            Customer.status,
            func.count(Customer.id).label("count")
        ).where(
            and_(*conditions)
        ).group_by(Customer.status)

        result = await self.db.execute(query)
        data = result.all()

        return [
            CustomerStatusReport(
                status=row.status,
                count=row.count,
                percentage=round((row.count / total) * 100, 2)
            )
            for row in data
        ]

    async def get_customers_by_type(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[CustomerTypeReport]:
        """
        Get customers grouped by type

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Customer.deleted_at.is_(None)]

        if start_date:
            conditions.append(Customer.created_at >= start_date)
        if end_date:
            conditions.append(Customer.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Customer.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1

        # Get count by type
        query = select(
            Customer.customer_type,
            func.count(Customer.id).label("count")
        ).where(
            and_(*conditions)
        ).group_by(Customer.customer_type)

        result = await self.db.execute(query)
        data = result.all()

        return [
            CustomerTypeReport(
                customer_type=row.customer_type,
                count=row.count,
                percentage=round((row.count / total) * 100, 2)
            )
            for row in data
        ]

    async def get_customer_growth(
        self,
        period: str = "month"
    ) -> List[CustomerGrowthReport]:
        """
        Get customer growth over time

        Args:
            period: Time period (week, month, quarter, year)
        """
        # Calculate date range
        end_date = datetime.now(timezone.utc)

        if period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        # Get customer growth by date
        query = select(
            func.date(Customer.created_at).label("date"),
            func.count(Customer.id).label("new_customers")
        ).where(
            and_(
                Customer.deleted_at.is_(None),
                Customer.created_at >= start_date,
                Customer.created_at <= end_date
            )
        ).group_by(func.date(Customer.created_at)).order_by(func.date(Customer.created_at))

        result = await self.db.execute(query)
        data = result.all()

        # Calculate cumulative totals and growth rates
        reports = []
        cumulative_total = 0
        previous_total = 0

        for row in data:
            cumulative_total += row.new_customers

            # Calculate growth rate
            if previous_total > 0:
                growth_rate = ((cumulative_total - previous_total) / previous_total) * 100
            else:
                growth_rate = 0.0

            reports.append(
                CustomerGrowthReport(
                    period=str(row.date),
                    new_customers=row.new_customers,
                    total_customers=cumulative_total,
                    growth_rate=round(growth_rate, 2)
                )
            )

            previous_total = cumulative_total

        return reports

    async def get_kyc_status_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[KYCStatusReport]:
        """
        Get KYC verification status report

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Customer.deleted_at.is_(None)]

        if start_date:
            conditions.append(Customer.created_at >= start_date)
        if end_date:
            conditions.append(Customer.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Customer.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1

        # Get count by KYC status
        # Note: This assumes there's a kyc_status field in Customer model
        # If not, you'd need to join with KYCDocument table and aggregate
        query = select(
            func.coalesce(Customer.status, 'unknown').label("status"),
            func.count(Customer.id).label("count")
        ).where(
            and_(*conditions)
        ).group_by(Customer.status)

        result = await self.db.execute(query)
        data = result.all()

        # Map customer status to KYC-like status for reporting
        # In a real implementation, you'd query the actual KYC documents
        status_mapping = {
            'active': 'verified',
            'pending': 'pending_verification',
            'suspended': 'suspended',
            'inactive': 'not_verified',
        }

        return [
            KYCStatusReport(
                status=status_mapping.get(row.status, 'unknown'),
                count=row.count,
                percentage=round((row.count / total) * 100, 2)
            )
            for row in data
        ]

    async def get_new_customers_count(
        self,
        period: str = "month"
    ) -> int:
        """
        Get count of new customers in the specified period

        Args:
            period: Time period (today, week, month, quarter, year)
        """
        end_date = datetime.now(timezone.utc)

        if period == "today":
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        query = select(func.count(Customer.id)).where(
            and_(
                Customer.deleted_at.is_(None),
                Customer.created_at >= start_date,
                Customer.created_at <= end_date
            )
        )

        return await self.db.scalar(query) or 0

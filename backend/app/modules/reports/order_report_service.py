"""
Order Report Service

Provides order analytics and reports.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import Order, OrderItem
from app.modules.products.models import Product
from app.modules.customers.models import Customer
from .schemas import (
    OrderStatusReport,
    OrderValueMetrics,
    MonthlyOrderReport,
    ProductPerformance,
    CustomerOrderReport,
)


class OrderReportService:
    """Service for order reports and analytics"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_orders_by_status(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[OrderStatusReport]:
        """
        Get orders grouped by status with total values

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Order.deleted_at.is_(None)]

        if start_date:
            conditions.append(Order.created_at >= start_date)
        if end_date:
            conditions.append(Order.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Order.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1

        # Get count and value by status
        query = select(
            Order.status,
            func.count(Order.id).label("count"),
            func.sum(Order.total_amount).label("total_value")
        ).where(
            and_(*conditions)
        ).group_by(Order.status)

        result = await self.db.execute(query)
        data = result.all()

        return [
            OrderStatusReport(
                status=row.status,
                count=row.count,
                percentage=round((row.count / total) * 100, 2),
                total_value=float(row.total_value) if row.total_value else 0.0
            )
            for row in data
        ]

    async def get_order_value_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> OrderValueMetrics:
        """
        Get order value metrics

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Order.deleted_at.is_(None)]

        if start_date:
            conditions.append(Order.created_at >= start_date)
        if end_date:
            conditions.append(Order.created_at <= end_date)

        # Get order value statistics
        query = select(
            func.count(Order.id).label("total_orders"),
            func.sum(Order.total_amount).label("total_value"),
            func.avg(Order.total_amount).label("avg_value"),
            func.min(Order.total_amount).label("min_value"),
            func.max(Order.total_amount).label("max_value")
        ).where(and_(*conditions))

        result = await self.db.execute(query)
        stats = result.first()

        if not stats or stats.total_orders == 0:
            return OrderValueMetrics(
                total_orders=0,
                total_value=0.0,
                avg_order_value=0.0,
                min_order_value=0.0,
                max_order_value=0.0
            )

        return OrderValueMetrics(
            total_orders=stats.total_orders,
            total_value=float(stats.total_value) if stats.total_value else 0.0,
            avg_order_value=float(stats.avg_value) if stats.avg_value else 0.0,
            min_order_value=float(stats.min_value) if stats.min_value else 0.0,
            max_order_value=float(stats.max_value) if stats.max_value else 0.0
        )

    async def get_monthly_orders(
        self,
        months: int = 12
    ) -> List[MonthlyOrderReport]:
        """
        Get monthly order statistics

        Args:
            months: Number of months to retrieve (default 12)
        """
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=months * 30)

        # Get orders grouped by month
        query = select(
            func.to_char(Order.created_at, 'YYYY-MM').label("month"),
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_amount).label("total_value"),
            func.avg(Order.total_amount).label("avg_value")
        ).where(
            and_(
                Order.deleted_at.is_(None),
                Order.created_at >= start_date,
                Order.created_at <= end_date
            )
        ).group_by(
            func.to_char(Order.created_at, 'YYYY-MM')
        ).order_by(
            func.to_char(Order.created_at, 'YYYY-MM')
        )

        result = await self.db.execute(query)
        data = result.all()

        return [
            MonthlyOrderReport(
                month=row.month,
                order_count=row.order_count,
                total_value=float(row.total_value) if row.total_value else 0.0,
                avg_order_value=float(row.avg_value) if row.avg_value else 0.0
            )
            for row in data
        ]

    async def get_product_performance(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10
    ) -> List[ProductPerformance]:
        """
        Get top performing products in orders

        Args:
            start_date: Filter start date
            end_date: Filter end date
            limit: Number of top products to return
        """
        conditions = [
            Order.deleted_at.is_(None),
            OrderItem.deleted_at.is_(None)
        ]

        if start_date:
            conditions.append(Order.created_at >= start_date)
        if end_date:
            conditions.append(Order.created_at <= end_date)

        # Get product performance from order items
        query = select(
            OrderItem.product_id,
            Product.name.label("product_name"),
            func.count(func.distinct(Order.id)).label("order_count"),
            func.sum(OrderItem.quantity).label("quantity_sold"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("total_revenue")
        ).join(
            Order, Order.id == OrderItem.order_id
        ).join(
            Product, Product.id == OrderItem.product_id
        ).where(
            and_(*conditions)
        ).group_by(
            OrderItem.product_id,
            Product.name
        ).order_by(
            desc(func.sum(OrderItem.quantity * OrderItem.unit_price))
        ).limit(limit)

        result = await self.db.execute(query)
        data = result.all()

        return [
            ProductPerformance(
                product_id=row.product_id,
                product_name=row.product_name,
                order_count=row.order_count,
                quantity_sold=row.quantity_sold,
                total_revenue=float(row.total_revenue) if row.total_revenue else 0.0
            )
            for row in data
        ]

    async def get_orders_by_customer(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10
    ) -> List[CustomerOrderReport]:
        """
        Get top customers by order value

        Args:
            start_date: Filter start date
            end_date: Filter end date
            limit: Number of top customers to return
        """
        conditions = [Order.deleted_at.is_(None)]

        if start_date:
            conditions.append(Order.created_at >= start_date)
        if end_date:
            conditions.append(Order.created_at <= end_date)

        # Get customer order statistics
        query = select(
            Order.customer_id,
            Customer.full_name.label("customer_name"),
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_amount).label("total_value"),
            func.avg(Order.total_amount).label("avg_value"),
            func.max(Order.created_at).label("last_order_date")
        ).join(
            Customer, Customer.id == Order.customer_id
        ).where(
            and_(*conditions)
        ).group_by(
            Order.customer_id,
            Customer.full_name
        ).order_by(
            desc(func.sum(Order.total_amount))
        ).limit(limit)

        result = await self.db.execute(query)
        data = result.all()

        return [
            CustomerOrderReport(
                customer_id=row.customer_id,
                customer_name=row.customer_name,
                order_count=row.order_count,
                total_value=float(row.total_value) if row.total_value else 0.0,
                avg_order_value=float(row.avg_value) if row.avg_value else 0.0,
                last_order_date=row.last_order_date
            )
            for row in data
        ]

    async def get_order_completion_rate(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> float:
        """
        Get order completion rate (delivered / total orders)

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Order.deleted_at.is_(None)]

        if start_date:
            conditions.append(Order.created_at >= start_date)
        if end_date:
            conditions.append(Order.created_at <= end_date)

        # Get total orders
        total_query = select(func.count(Order.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 0

        if total == 0:
            return 0.0

        # Get delivered orders
        delivered_query = select(func.count(Order.id)).where(
            and_(
                *conditions,
                Order.status == "delivered"
            )
        )
        delivered = await self.db.scalar(delivered_query) or 0

        return round((delivered / total) * 100, 2)

    async def get_orders_for_export(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch flat list of orders as dicts for CSV/Excel/PDF export.

        Returns dicts with keys: id, order_number, customer_id, status,
        subtotal_amount, tax_amount, total_amount, created_at.
        """
        conditions = [Order.deleted_at.is_(None)]
        if start_date:
            conditions.append(Order.created_at >= start_date)
        if end_date:
            conditions.append(Order.created_at <= end_date)
        query = select(Order).where(and_(*conditions)).order_by(Order.created_at.desc())
        result = await self.db.execute(query)
        orders = result.scalars().all()
        return [
            {
                "id": o.id,
                "order_number": o.order_number or "",
                "customer_id": o.customer_id or "",
                "status": o.status.value if hasattr(o.status, "value") else str(o.status),
                "subtotal_amount": float(o.subtotal) if o.subtotal is not None else 0.0,
                "tax_amount": float(o.tax_amount) if o.tax_amount is not None else 0.0,
                "total_amount": float(o.total_amount) if o.total_amount is not None else 0.0,
                "created_at": o.created_at.isoformat() if o.created_at else "",
            }
            for o in orders
        ]

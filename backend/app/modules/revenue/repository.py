"""
Revenue repository layer.

Handles database operations for revenue calculations.
"""
from typing import List, Optional, Tuple, Dict
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func, and_, or_, case, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.orders.models import Order, OrderStatus
from app.modules.invoices.models import Invoice, InvoiceStatus
from app.modules.hosting.models import VPSSubscription, SubscriptionStatus
from app.modules.products.models import Product


class RevenueRepository:
    """Repository for revenue database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_recognized_revenue(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        customer_id: Optional[str] = None,
    ) -> Decimal:
        """
        Get recognized revenue from paid invoices.

        Recognized revenue = sum of paid_amount from invoices with status PAID or PARTIALLY_PAID
        """
        conditions = [
            Invoice.deleted_at.is_(None),
            or_(
                cast(Invoice.status, String) == InvoiceStatus.PAID.value,
                cast(Invoice.status, String) == InvoiceStatus.PARTIALLY_PAID.value
            )
        ]

        if start_date:
            conditions.append(Invoice.paid_at >= start_date)
        if end_date:
            conditions.append(Invoice.paid_at <= end_date)
        if customer_id:
            conditions.append(Invoice.customer_id == customer_id)

        query = select(func.sum(Invoice.paid_amount)).where(and_(*conditions))
        result = await self.db.scalar(query)
        return Decimal(str(result or 0))

    async def get_deferred_revenue(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        customer_id: Optional[str] = None,
    ) -> Decimal:
        """
        Get deferred revenue from paid invoices for undelivered orders.

        Deferred revenue = paid invoices where:
        - Invoice is PAID or PARTIALLY_PAID
        - Associated order (if exists) is not DELIVERED
        - Or invoice has no associated order
        """
        from app.modules.quotes.models import Quote
        
        conditions = [
            Invoice.deleted_at.is_(None),
            or_(
                cast(Invoice.status, String) == InvoiceStatus.PAID.value,
                cast(Invoice.status, String) == InvoiceStatus.PARTIALLY_PAID.value
            )
        ]

        if start_date:
            conditions.append(Invoice.paid_at >= start_date)
        if end_date:
            conditions.append(Invoice.paid_at <= end_date)
        if customer_id:
            conditions.append(Invoice.customer_id == customer_id)

        # Get paid invoices that are either:
        # 1. Not linked to an order
        # 2. Linked to an order that is not DELIVERED
        query = (
            select(func.sum(Invoice.paid_amount))
            .outerjoin(Quote, Invoice.quote_id == Quote.id)
            .outerjoin(Order, Quote.id == Order.quote_id)
            .where(
                and_(
                    *conditions,
                    or_(
                        Order.id.is_(None),  # No associated order
                        Order.status != OrderStatus.DELIVERED  # Order not delivered
                    )
                )
            )
        )
        
        result = await self.db.scalar(query)
        return Decimal(str(result or 0))

    async def get_booked_revenue(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        customer_id: Optional[str] = None,
    ) -> Decimal:
        """
        Get booked revenue from delivered orders.

        Booked revenue = sum of total_amount from orders with status DELIVERED
        """
        conditions = [
            Order.deleted_at.is_(None),
            Order.status == OrderStatus.DELIVERED
        ]

        if start_date:
            conditions.append(Order.delivered_at >= start_date)
        if end_date:
            conditions.append(Order.delivered_at <= end_date)
        if customer_id:
            conditions.append(Order.customer_id == customer_id)

        query = select(func.sum(Order.total_amount)).where(and_(*conditions))
        result = await self.db.scalar(query)
        return Decimal(str(result or 0))

    async def get_recurring_revenue(
        self,
        customer_id: Optional[str] = None,
    ) -> Decimal:
        """
        Get monthly recurring revenue (MRR) from active VPS subscriptions.

        MRR = sum of monthly_price from active subscriptions
        """
        conditions = [
            VPSSubscription.status == SubscriptionStatus.ACTIVE
        ]

        if customer_id:
            conditions.append(VPSSubscription.customer_id == customer_id)

        # Join with plan to get monthly_price
        from app.modules.hosting.models import VPSPlan
        query = (
            select(func.sum(VPSPlan.monthly_price))
            .select_from(VPSSubscription)
            .join(VPSPlan, VPSSubscription.plan_id == VPSPlan.id)
            .where(and_(*conditions))
        )
        result = await self.db.scalar(query)
        return Decimal(str(result or 0))

    async def get_monthly_revenue(
        self,
        month: Optional[datetime] = None,
        customer_id: Optional[str] = None,
    ) -> Decimal:
        """
        Get recognized revenue for a specific month.

        Uses paid_at date from invoices.
        """
        if month is None:
            month = datetime.now(timezone.utc)

        month_start = month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month.month == 12:
            month_end = month.replace(year=month.year + 1, month=1, day=1)
        else:
            month_end = month.replace(month=month.month + 1, day=1)

        return await self.get_recognized_revenue(
            start_date=month_start,
            end_date=month_end - timedelta(seconds=1),
            customer_id=customer_id
        )

    async def get_revenue_trends(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day",  # day, week, month
    ) -> List[Dict]:
        """
        Get revenue trends over time.

        Returns list of dictionaries with date and revenue values.
        """
        trends = []
        current_date = start_date

        while current_date <= end_date:
            if group_by == "day":
                period_end = current_date + timedelta(days=1)
                date_str = current_date.strftime("%Y-%m-%d")
            elif group_by == "week":
                period_end = current_date + timedelta(weeks=1)
                date_str = current_date.strftime("%Y-W%W")
            else:  # month
                if current_date.month == 12:
                    period_end = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    period_end = current_date.replace(month=current_date.month + 1, day=1)
                date_str = current_date.strftime("%Y-%m")

            recognized = await self.get_recognized_revenue(
                start_date=current_date,
                end_date=period_end - timedelta(seconds=1)
            )
            booked = await self.get_booked_revenue(
                start_date=current_date,
                end_date=period_end - timedelta(seconds=1)
            )
            recurring = await self.get_recurring_revenue()

            trends.append({
                "date": date_str,
                "recognized_revenue": recognized,
                "booked_revenue": booked,
                "recurring_revenue": recurring,
                "total_revenue": recognized + booked + recurring,
            })

            current_date = period_end

        return trends

    async def get_revenue_by_category(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict]:
        """
        Get revenue breakdown by product category.

        Groups revenue by product categories from orders.
        """
        from app.modules.orders.models import OrderItem

        conditions = [
            Order.deleted_at.is_(None),
            Order.status == OrderStatus.DELIVERED,
            OrderItem.deleted_at.is_(None)
        ]

        if start_date:
            conditions.append(Order.delivered_at >= start_date)
        if end_date:
            conditions.append(Order.delivered_at <= end_date)

        # Join orders with order items and products to get categories
        query = (
            select(
                Product.category,
                func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
                func.count(func.distinct(Order.id)).label("order_count")
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(Product, Product.id == OrderItem.product_id)
            .where(and_(*conditions))
            .group_by(Product.category)
        )

        result = await self.db.execute(query)
        rows = result.all()

        total_revenue = sum(Decimal(str(row.revenue or 0)) for row in rows)

        return [
            {
                "category": row.category or "other",
                "revenue": Decimal(str(row.revenue or 0)),
                "count": row.order_count,
                "percentage": float((Decimal(str(row.revenue or 0)) / total_revenue * 100) if total_revenue > 0 else 0)
            }
            for row in rows
        ]

    async def get_revenue_by_customer(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Get revenue breakdown by customer.

        Returns top customers by revenue.
        """
        from app.modules.customers.models import Customer

        conditions = [
            Invoice.deleted_at.is_(None),
            or_(
                cast(Invoice.status, String) == InvoiceStatus.PAID.value,
                cast(Invoice.status, String) == InvoiceStatus.PARTIALLY_PAID.value
            )
        ]

        if start_date:
            conditions.append(Invoice.paid_at >= start_date)
        if end_date:
            conditions.append(Invoice.paid_at <= end_date)

        query = (
            select(
                Customer.id,
                Customer.full_name,
                func.sum(Invoice.paid_amount).label("revenue"),
                func.count(Invoice.id).label("invoice_count"),
                func.max(Invoice.paid_at).label("last_transaction_date")
            )
            .join(Customer, Customer.id == Invoice.customer_id)
            .where(and_(*conditions))
            .group_by(Customer.id, Customer.full_name)
            .order_by(func.sum(Invoice.paid_amount).desc())
            .limit(limit)
        )

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "customer_id": str(row.id),
                "customer_name": row.full_name or "Unknown",
                "revenue": Decimal(str(row.revenue or 0)),
                "invoice_count": row.invoice_count,
                "order_count": 0,  # Would need separate query
                "last_transaction_date": row.last_transaction_date
            }
            for row in rows
        ]

    async def get_reconciliation_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict:
        """
        Get reconciliation data between Orders and Invoices.

        Helps identify double-counting and mismatches.
        """
        # Get orders that have been converted to invoices
        order_conditions = [Order.deleted_at.is_(None)]
        invoice_conditions = [Invoice.deleted_at.is_(None)]

        if start_date:
            order_conditions.append(Order.created_at >= start_date)
            invoice_conditions.append(Invoice.created_at >= start_date)
        if end_date:
            order_conditions.append(Order.created_at <= end_date)
            invoice_conditions.append(Invoice.created_at <= end_date)

        # Total revenue from delivered orders
        orders_query = select(func.sum(Order.total_amount)).where(
            and_(*order_conditions, Order.status == OrderStatus.DELIVERED)
        )
        total_orders_revenue = Decimal(str(await self.db.scalar(orders_query) or 0))

        # Total revenue from paid invoices
        invoices_query = select(func.sum(Invoice.paid_amount)).where(
            and_(
                *invoice_conditions,
                or_(
                    cast(Invoice.status, String) == InvoiceStatus.PAID.value,
                    cast(Invoice.status, String) == InvoiceStatus.PARTIALLY_PAID.value
                )
            )
        )
        total_invoices_revenue = Decimal(str(await self.db.scalar(invoices_query) or 0))

        # Get orders with invoices (matched)
        matched_query = (
            select(
                Order.id.label("order_id"),
                Invoice.id.label("invoice_id"),
                Order.total_amount.label("order_amount"),
                Invoice.paid_amount.label("invoice_amount")
            )
            .join(Invoice, Invoice.quote_id == Order.quote_id)
            .where(and_(*order_conditions, Order.quote_id.isnot(None)))
        )
        matched_result = await self.db.execute(matched_query)
        matched_rows = matched_result.all()

        matched_count = len(matched_rows)
        unmatched_orders_count = 0  # Would need more complex query
        unmatched_invoices_count = 0  # Would need more complex query

        items = [
            {
                "order_id": str(row.order_id),
                "invoice_id": str(row.invoice_id),
                "order_amount": Decimal(str(row.order_amount or 0)),
                "invoice_amount": Decimal(str(row.invoice_amount or 0)),
                "difference": Decimal(str(row.invoice_amount or 0)) - Decimal(str(row.order_amount or 0)),
                "status": "matched" if abs(Decimal(str(row.invoice_amount or 0)) - Decimal(str(row.order_amount or 0))) < Decimal("0.01") else "partial"
            }
            for row in matched_rows
        ]

        return {
            "total_orders_revenue": total_orders_revenue,
            "total_invoices_revenue": total_invoices_revenue,
            "difference": total_invoices_revenue - total_orders_revenue,
            "matched_count": matched_count,
            "unmatched_orders_count": unmatched_orders_count,
            "unmatched_invoices_count": unmatched_invoices_count,
            "items": items[:100]  # Limit to first 100 items
        }

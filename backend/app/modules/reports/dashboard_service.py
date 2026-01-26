"""
Dashboard Service

Provides aggregated metrics for Admin, Corporate, and Customer dashboards.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.tickets.models import Ticket, TicketReply
from app.modules.orders.models import Order
from app.modules.products.models import Product
from .schemas import (
    DashboardMetrics,
    DashboardResponse,
    RecentActivity,
    TrendData,
)


class DashboardService:
    """Service for dashboard metrics and analytics"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_admin_dashboard(
        self, period: str = "month"
    ) -> DashboardResponse:
        """
        Get admin dashboard with system-wide metrics

        Args:
            period: Time period for trends (today, week, month, quarter, year)
        """
        # Get all metrics
        metrics = await self._get_overall_metrics()

        # Get recent activity
        recent_activity = await self._get_recent_activity(limit=10)

        # Get trends
        trends = await self._get_trends(period)

        return DashboardResponse(
            metrics=metrics,
            recent_activity=recent_activity,
            trends=trends,
        )

    async def get_corporate_dashboard(
        self, user_id: int, period: str = "month"
    ) -> DashboardResponse:
        """
        Get corporate dashboard with business operations overview

        Args:
            user_id: Corporate user ID
            period: Time period for trends
        """
        # For corporate, we show all metrics but can filter by assigned tickets
        metrics = await self._get_overall_metrics()

        # Get recent activity (could be filtered by user assignments)
        recent_activity = await self._get_recent_activity(
            limit=10, user_id=user_id
        )

        # Get trends
        trends = await self._get_trends(period)

        return DashboardResponse(
            metrics=metrics,
            recent_activity=recent_activity,
            trends=trends,
        )

    async def get_customer_dashboard(
        self, customer_id: str, period: str = "month"
    ) -> DashboardResponse:
        """
        Get customer dashboard with personal account overview

        Args:
            customer_id: Customer ID
            period: Time period for trends
        """
        # Get customer-specific metrics
        metrics = await self._get_customer_metrics(customer_id)

        # Get recent activity for this customer
        recent_activity = await self._get_customer_activity(
            customer_id, limit=10
        )

        # Get customer trends
        trends = await self._get_customer_trends(customer_id, period)

        return DashboardResponse(
            metrics=metrics,
            recent_activity=recent_activity,
            trends=trends,
        )

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    async def _get_overall_metrics(self) -> DashboardMetrics:
        """Get overall system metrics"""

        # Customer metrics
        total_customers_query = select(func.count(Customer.id)).where(
            Customer.deleted_at.is_(None)
        )
        total_customers = await self.db.scalar(total_customers_query) or 0

        active_customers_query = select(func.count(Customer.id)).where(
            and_(
                Customer.deleted_at.is_(None),
                Customer.status == "active"
            )
        )
        active_customers = await self.db.scalar(active_customers_query) or 0

        pending_customers_query = select(func.count(Customer.id)).where(
            and_(
                Customer.deleted_at.is_(None),
                Customer.status == "pending"
            )
        )
        pending_customers = await self.db.scalar(pending_customers_query) or 0

        # Ticket metrics
        total_tickets_query = select(func.count(Ticket.id)).where(
            Ticket.deleted_at.is_(None)
        )
        total_tickets = await self.db.scalar(total_tickets_query) or 0

        open_tickets_query = select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.status.in_(["open", "in_progress", "waiting_for_response"])
            )
        )
        open_tickets = await self.db.scalar(open_tickets_query) or 0

        resolved_tickets_query = select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.status.in_(["resolved", "closed"])
            )
        )
        resolved_tickets = await self.db.scalar(resolved_tickets_query) or 0

        # Order metrics
        total_orders_query = select(func.count(Order.id)).where(
            Order.deleted_at.is_(None)
        )
        total_orders = await self.db.scalar(total_orders_query) or 0

        pending_orders_query = select(func.count(Order.id)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.status.in_(["request", "validated"])
            )
        )
        pending_orders = await self.db.scalar(pending_orders_query) or 0

        completed_orders_query = select(func.count(Order.id)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.status == "delivered"
            )
        )
        completed_orders = await self.db.scalar(completed_orders_query) or 0

        # Calculate total revenue
        revenue_query = select(func.sum(Order.total_amount)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.status == "delivered"
            )
        )
        total_revenue = await self.db.scalar(revenue_query) or 0.0

        # Product metrics
        total_products_query = select(func.count(Product.id)).where(
            Product.deleted_at.is_(None)
        )
        total_products = await self.db.scalar(total_products_query) or 0

        active_products_query = select(func.count(Product.id)).where(
            and_(
                Product.deleted_at.is_(None),
                Product.is_active == True
            )
        )
        active_products = await self.db.scalar(active_products_query) or 0

        return DashboardMetrics(
            total_customers=total_customers,
            active_customers=active_customers,
            pending_customers=pending_customers,
            total_tickets=total_tickets,
            open_tickets=open_tickets,
            resolved_tickets=resolved_tickets,
            total_orders=total_orders,
            pending_orders=pending_orders,
            completed_orders=completed_orders,
            total_products=total_products,
            active_products=active_products,
            total_revenue=float(total_revenue),
        )

    async def _get_customer_metrics(self, customer_id: str) -> DashboardMetrics:
        """Get metrics for a specific customer"""

        # Ticket metrics for this customer
        total_tickets_query = select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.customer_id == customer_id
            )
        )
        total_tickets = await self.db.scalar(total_tickets_query) or 0

        open_tickets_query = select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.customer_id == customer_id,
                Ticket.status.in_(["open", "in_progress", "waiting_for_response"])
            )
        )
        open_tickets = await self.db.scalar(open_tickets_query) or 0

        resolved_tickets_query = select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.customer_id == customer_id,
                Ticket.status.in_(["resolved", "closed"])
            )
        )
        resolved_tickets = await self.db.scalar(resolved_tickets_query) or 0

        # Order metrics for this customer
        total_orders_query = select(func.count(Order.id)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.customer_id == customer_id
            )
        )
        total_orders = await self.db.scalar(total_orders_query) or 0

        pending_orders_query = select(func.count(Order.id)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.customer_id == customer_id,
                Order.status.in_(["request", "validated"])
            )
        )
        pending_orders = await self.db.scalar(pending_orders_query) or 0

        completed_orders_query = select(func.count(Order.id)).where(
            and_(
                Order.deleted_at.is_(None),
                Order.customer_id == customer_id,
                Order.status == "delivered"
            )
        )
        completed_orders = await self.db.scalar(completed_orders_query) or 0

        # Calculate total spent using revenue service
        from app.modules.revenue.service import RevenueService
        revenue_service = RevenueService(self.db)
        revenue_overview = await revenue_service.get_overview(period="month", customer_id=customer_id)
        total_revenue = float(revenue_overview.metrics.booked_revenue)  # Use booked revenue (delivered orders)

        return DashboardMetrics(
            total_customers=0,  # Not applicable for customer view
            active_customers=0,
            pending_customers=0,
            total_tickets=total_tickets,
            open_tickets=open_tickets,
            resolved_tickets=resolved_tickets,
            total_orders=total_orders,
            pending_orders=pending_orders,
            completed_orders=completed_orders,
            total_products=0,  # Not applicable for customer view
            active_products=0,
            total_revenue=float(total_revenue),
        )

    async def _get_recent_activity(
        self, limit: int = 10, user_id: Optional[int] = None
    ) -> List[RecentActivity]:
        """Get recent activity across all modules"""
        activities = []

        # Recent tickets
        ticket_query = select(Ticket).where(
            Ticket.deleted_at.is_(None)
        ).order_by(Ticket.created_at.desc()).limit(limit)

        if user_id:
            ticket_query = ticket_query.where(Ticket.assigned_to_id == user_id)

        result = await self.db.execute(ticket_query)
        tickets = result.scalars().all()

        for ticket in tickets:
            activities.append(
                RecentActivity(
                    id=str(ticket.id),
                    type="ticket",
                    title=ticket.subject,
                    description=ticket.description[:100] if ticket.description else None,
                    timestamp=ticket.created_at,
                    status=ticket.status,
                )
            )

        # Recent orders
        order_query = select(Order).where(
            Order.deleted_at.is_(None)
        ).order_by(Order.created_at.desc()).limit(limit)

        result = await self.db.execute(order_query)
        orders = result.scalars().all()

        for order in orders:
            activities.append(
                RecentActivity(
                    id=str(order.id),
                    type="order",
                    title=f"Order {order.order_number}",
                    description=f"Total: {order.total_amount} DZD",
                    timestamp=order.created_at,
                    status=order.status,
                )
            )

        # Sort all activities by timestamp
        activities.sort(key=lambda x: x.timestamp, reverse=True)

        return activities[:limit]

    async def _get_customer_activity(
        self, customer_id: str, limit: int = 10
    ) -> List[RecentActivity]:
        """Get recent activity for a specific customer"""
        activities = []

        # Recent tickets
        ticket_query = select(Ticket).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.customer_id == customer_id
            )
        ).order_by(Ticket.created_at.desc()).limit(limit)

        result = await self.db.execute(ticket_query)
        tickets = result.scalars().all()

        for ticket in tickets:
            activities.append(
                RecentActivity(
                    id=str(ticket.id),
                    type="ticket",
                    title=ticket.subject,
                    description=ticket.description[:100] if ticket.description else None,
                    timestamp=ticket.created_at,
                    status=ticket.status,
                    priority=ticket.priority,  # Include priority for tickets
                )
            )

        # Recent orders
        order_query = select(Order).where(
            and_(
                Order.deleted_at.is_(None),
                Order.customer_id == customer_id
            )
        ).order_by(Order.created_at.desc()).limit(limit)

        result = await self.db.execute(order_query)
        orders = result.scalars().all()

        for order in orders:
            activities.append(
                RecentActivity(
                    id=str(order.id),
                    type="order",
                    title=f"Order {order.order_number}",
                    description=f"Total: {order.total_amount} DZD",
                    timestamp=order.created_at,
                    status=order.status,
                    amount=float(order.total_amount),  # Include amount for orders
                )
            )

        # Sort by timestamp
        activities.sort(key=lambda x: x.timestamp, reverse=True)

        return activities[:limit]

    async def _get_trends(self, period: str = "month") -> Dict[str, List[TrendData]]:
        """Get trend data for the specified period"""
        # Calculate date range
        end_date = datetime.utcnow()

        if period == "today":
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
            days = 1
        elif period == "week":
            start_date = end_date - timedelta(days=7)
            days = 7
        elif period == "month":
            start_date = end_date - timedelta(days=30)
            days = 30
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
            days = 90
        elif period == "year":
            start_date = end_date - timedelta(days=365)
            days = 365
        else:
            start_date = end_date - timedelta(days=30)
            days = 30

        trends = {
            "tickets": await self._get_ticket_trends(start_date, end_date, days),
            "orders": await self._get_order_trends(start_date, end_date, days),
            "customers": await self._get_customer_trends_data(start_date, end_date, days),
        }

        return trends

    async def _get_customer_trends(
        self, customer_id: str, period: str = "month"
    ) -> Dict[str, List[TrendData]]:
        """Get trend data for a specific customer"""
        # Calculate date range
        end_date = datetime.utcnow()

        if period == "month":
            start_date = end_date - timedelta(days=30)
            days = 30
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
            days = 90
        elif period == "year":
            start_date = end_date - timedelta(days=365)
            days = 365
        else:
            start_date = end_date - timedelta(days=30)
            days = 30

        trends = {
            "tickets": await self._get_customer_ticket_trends(
                customer_id, start_date, end_date, days
            ),
            "orders": await self._get_customer_order_trends(
                customer_id, start_date, end_date, days
            ),
        }

        return trends

    async def _get_ticket_trends(
        self, start_date: datetime, end_date: datetime, days: int
    ) -> List[TrendData]:
        """Get ticket creation trends"""
        query = select(
            func.date(Ticket.created_at).label("date"),
            func.count(Ticket.id).label("count")
        ).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.created_at >= start_date,
                Ticket.created_at <= end_date
            )
        ).group_by(func.date(Ticket.created_at)).order_by(func.date(Ticket.created_at))

        result = await self.db.execute(query)
        data = result.all()

        return [
            TrendData(
                date=str(row.date),
                value=row.count,
                label="Tickets"
            )
            for row in data
        ]

    async def _get_order_trends(
        self, start_date: datetime, end_date: datetime, days: int
    ) -> List[TrendData]:
        """Get order creation trends"""
        query = select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("count")
        ).where(
            and_(
                Order.deleted_at.is_(None),
                Order.created_at >= start_date,
                Order.created_at <= end_date
            )
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))

        result = await self.db.execute(query)
        data = result.all()

        return [
            TrendData(
                date=str(row.date),
                value=row.count,
                label="Orders"
            )
            for row in data
        ]

    async def _get_customer_trends_data(
        self, start_date: datetime, end_date: datetime, days: int
    ) -> List[TrendData]:
        """Get customer registration trends"""
        query = select(
            func.date(Customer.created_at).label("date"),
            func.count(Customer.id).label("count")
        ).where(
            and_(
                Customer.deleted_at.is_(None),
                Customer.created_at >= start_date,
                Customer.created_at <= end_date
            )
        ).group_by(func.date(Customer.created_at)).order_by(func.date(Customer.created_at))

        result = await self.db.execute(query)
        data = result.all()

        return [
            TrendData(
                date=str(row.date),
                value=row.count,
                label="Customers"
            )
            for row in data
        ]

    async def _get_customer_ticket_trends(
        self, customer_id: str, start_date: datetime, end_date: datetime, days: int
    ) -> List[TrendData]:
        """Get ticket trends for a specific customer"""
        query = select(
            func.date(Ticket.created_at).label("date"),
            func.count(Ticket.id).label("count")
        ).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.customer_id == customer_id,
                Ticket.created_at >= start_date,
                Ticket.created_at <= end_date
            )
        ).group_by(func.date(Ticket.created_at)).order_by(func.date(Ticket.created_at))

        result = await self.db.execute(query)
        data = result.all()

        return [
            TrendData(
                date=str(row.date),
                value=row.count,
                label="Tickets"
            )
            for row in data
        ]

    async def _get_customer_order_trends(
        self, customer_id: str, start_date: datetime, end_date: datetime, days: int
    ) -> List[TrendData]:
        """Get order trends for a specific customer"""
        query = select(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("count")
        ).where(
            and_(
                Order.deleted_at.is_(None),
                Order.customer_id == customer_id,
                Order.created_at >= start_date,
                Order.created_at <= end_date
            )
        ).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))

        result = await self.db.execute(query)
        data = result.all()

        return [
            TrendData(
                date=str(row.date),
                value=row.count,
                label="Orders"
            )
            for row in data
        ]

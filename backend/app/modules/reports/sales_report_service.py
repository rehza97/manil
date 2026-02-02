"""
Sales Report Service

Four reports: quote conversion, order pipeline, product performance, customer purchase patterns.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.quotes.models import Quote, QuoteStatus
from app.modules.orders.models import Order, OrderStatus
from app.modules.products.models import Product
from .aggregation_service import AggregationService
from .base_report_service import BaseReportService


class SalesReportService(BaseReportService):
    """Sales reports: conversion, pipeline, product, patterns."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.agg = AggregationService(db)

    async def get_quote_conversion_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Quote lifecycle funnel and conversion to orders."""
        start, end = self._get_date_range("month", start_date, end_date)
        rates = await self.agg.get_conversion_rates(start, end)
        q = select(func.count(Quote.id)).where(
            and_(Quote.deleted_at.is_(None), Quote.created_at >=
                 start, Quote.created_at <= end)
        )
        total = (await self.db.scalar(q)) or 0
        return {**rates, "total_quotes": total, "start_date": start, "end_date": end}

    async def get_order_pipeline_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Orders by status (pipeline stages)."""
        end = end_date or datetime.now(timezone.utc)
        q = select(Order.status, func.count(Order.id)).where(
            and_(Order.deleted_at.is_(None), Order.created_at <= end)
        ).group_by(Order.status)
        rows = (await self.db.execute(q)).all()
        by_status = [{"status": r[0], "count": r[1]} for r in rows]
        return {"by_status": by_status, "end_date": end}

    async def get_product_performance_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Top products by order volume (simplified: product count from orders)."""
        end = end_date or datetime.now(timezone.utc)
        from app.modules.orders.models import OrderItem
        q = select(OrderItem.product_id, func.count(OrderItem.id).label("cnt")).join(
            Order, OrderItem.order_id == Order.id
        ).where(
            and_(Order.deleted_at.is_(None), Order.status ==
                 OrderStatus.DELIVERED.value, Order.created_at <= end)
        ).group_by(OrderItem.product_id).order_by(func.count(OrderItem.id).desc()).limit(limit)
        rows = (await self.db.execute(q)).all()
        details = [{"product_id": r[0], "order_count": r[1]} for r in rows]
        return {"details": details, "end_date": end}

    async def get_customer_purchase_patterns_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Segmentation by order frequency and value."""
        end = end_date or datetime.now(timezone.utc)
        q = select(
            Order.customer_id,
            func.count(Order.id).label("orders"),
            func.sum(Order.total_amount).label("total"),
        ).where(
            and_(Order.deleted_at.is_(None), Order.status ==
                 OrderStatus.DELIVERED.value, Order.created_at <= end)
        ).group_by(Order.customer_id)
        rows = (await self.db.execute(q)).all()
        details = [{"customer_id": r[0], "order_count": r[1],
                    "total_value": float(r[2] or 0)} for r in rows]
        return {"details": details, "end_date": end}

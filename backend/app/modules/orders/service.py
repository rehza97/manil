"""
Order management service.
Handles order creation, updates, status management, and timeline tracking.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.modules.orders.models import Order, OrderItem, OrderTimeline, OrderStatus
from app.modules.orders.schemas import (
    OrderCreate,
    OrderUpdate,
    OrderStatusUpdate,
    OrderItemCreate,
)
from app.modules.products.models import Product

logger = logging.getLogger(__name__)


class OrderService:
    """Service for managing orders."""

    # Valid status transitions
    STATUS_TRANSITIONS = {
        OrderStatus.REQUEST: [OrderStatus.VALIDATED, OrderStatus.CANCELLED],
        OrderStatus.VALIDATED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
        OrderStatus.IN_PROGRESS: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        OrderStatus.DELIVERED: [],  # Final state
        OrderStatus.CANCELLED: [],  # Final state
    }

    @staticmethod
    def _generate_order_number() -> str:
        """Generate a human-readable order number."""
        # Format: ORD-YYYYMMDD-XXXXX
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        random_part = str(uuid.uuid4())[:5].upper()
        return f"ORD-{timestamp}-{random_part}"

    @staticmethod
    def _calculate_order_total(
        items: list[OrderItem],
        tax_rate: float = 0.1,  # 10% tax by default
    ) -> Tuple[float, float, float, float]:
        """
        Calculate order totals.

        Returns: (subtotal, tax, discount, total)
        """
        subtotal = 0.0
        total_discount = 0.0

        for item in items:
            item_subtotal = item.unit_price * item.quantity
            item_discount = item_subtotal * (item.discount_percentage / 100)
            subtotal += item_subtotal - item_discount
            total_discount += item_discount

        tax = subtotal * tax_rate
        total = subtotal + tax

        return subtotal, tax, total_discount, total

    @staticmethod
    def create_order(
        db: Session,
        data: OrderCreate,
        created_by_user_id: str,
    ) -> Order:
        """Create a new order."""
        try:
            # Create order
            order = Order(
                id=str(uuid.uuid4()),
                customer_id=data.customer_id,
                quote_id=data.quote_id,
                order_number=OrderService._generate_order_number(),
                status=OrderStatus.REQUEST,
                customer_notes=data.customer_notes,
                delivery_address=data.delivery_address,
                delivery_contact=data.delivery_contact,
                created_by=created_by_user_id,
            )

            # Add items and calculate totals
            for item_data in data.items:
                product = db.query(Product).filter(
                    Product.id == item_data.product_id
                ).first()

                if not product:
                    raise NotFoundException(f"Product not found: {item_data.product_id}")

                # Calculate item totals
                item_subtotal = item_data.unit_price * item_data.quantity
                item_discount = item_subtotal * (item_data.discount_percentage / 100)
                item_total = item_subtotal - item_discount

                item = OrderItem(
                    id=str(uuid.uuid4()),
                    product_id=item_data.product_id,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    discount_percentage=item_data.discount_percentage,
                    discount_amount=item_discount,
                    total_price=item_total,
                    variant_sku=item_data.variant_sku,
                    notes=item_data.notes,
                )

                order.items.append(item)

            # Calculate order totals
            subtotal, tax, discount, total = OrderService._calculate_order_total(order.items)

            order.subtotal = subtotal
            order.tax_amount = tax
            order.discount_amount = discount
            order.total_amount = total

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order.id,
                previous_status=None,
                new_status=OrderStatus.REQUEST,
                action_type="order_created",
                description="Order created",
                performed_by=created_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.add(order)
            db.commit()

            logger.info(f"Order created: {order.order_number}")

            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error creating order: {str(e)}")
            raise

    @staticmethod
    def get_order(db: Session, order_id: str) -> Order:
        """Get order by ID."""
        order = db.query(Order).filter(
            and_(Order.id == order_id, Order.deleted_at.is_(None))
        ).first()

        if not order:
            raise NotFoundException(f"Order not found: {order_id}")

        return order

    @staticmethod
    def list_orders(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
        status: Optional[OrderStatus] = None,
    ) -> Tuple[list[Order], int]:
        """List orders with filtering."""
        query = db.query(Order).filter(Order.deleted_at.is_(None))

        if customer_id:
            query = query.filter(Order.customer_id == customer_id)

        if status:
            query = query.filter(Order.status == status)

        total = query.count()
        orders = query.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()

        return orders, total

    @staticmethod
    def update_order(
        db: Session,
        order_id: str,
        data: OrderUpdate,
        updated_by_user_id: str,
    ) -> Order:
        """Update order details."""
        order = OrderService.get_order(db, order_id)

        try:
            if data.customer_notes is not None:
                order.customer_notes = data.customer_notes

            if data.internal_notes is not None:
                order.internal_notes = data.internal_notes

            if data.delivery_address is not None:
                order.delivery_address = data.delivery_address

            if data.delivery_contact is not None:
                order.delivery_contact = data.delivery_contact

            order.updated_by = updated_by_user_id

            db.commit()

            logger.info(f"Order updated: {order_id}")

            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating order: {str(e)}")
            raise

    @staticmethod
    def update_order_status(
        db: Session,
        order_id: str,
        new_status: OrderStatus,
        notes: Optional[str] = None,
        performed_by_user_id: Optional[str] = None,
    ) -> Order:
        """Update order status with validation."""
        order = OrderService.get_order(db, order_id)

        # Validate status transition
        allowed_transitions = OrderService.STATUS_TRANSITIONS.get(order.status, [])
        if new_status not in allowed_transitions:
            raise BadRequestException(
                f"Cannot transition from {order.status} to {new_status}. "
                f"Allowed: {allowed_transitions}"
            )

        try:
            previous_status = order.status
            order.status = new_status

            # Update status timestamps
            if new_status == OrderStatus.VALIDATED:
                order.validated_at = datetime.now(timezone.utc)
            elif new_status == OrderStatus.IN_PROGRESS:
                order.in_progress_at = datetime.now(timezone.utc)
            elif new_status == OrderStatus.DELIVERED:
                order.delivered_at = datetime.now(timezone.utc)
            elif new_status == OrderStatus.CANCELLED:
                order.cancelled_at = datetime.now(timezone.utc)

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=new_status,
                action_type="status_changed",
                description=notes,
                performed_by=performed_by_user_id or "system",
            )
            order.timeline.append(timeline_entry)

            db.commit()

            logger.info(f"Order status updated: {order_id} ({previous_status} → {new_status})")

            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error updating order status: {str(e)}")
            raise

    @staticmethod
    def delete_order(db: Session, order_id: str, deleted_by_user_id: str) -> None:
        """Soft delete an order."""
        order = OrderService.get_order(db, order_id)

        try:
            order.deleted_at = datetime.now(timezone.utc)

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=order.status,
                new_status=OrderStatus.CANCELLED,
                action_type="order_deleted",
                description="Order deleted",
                performed_by=deleted_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()

            logger.info(f"Order deleted: {order_id}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting order: {str(e)}")
            raise

    @staticmethod
    def get_order_timeline(
        db: Session,
        order_id: str,
    ) -> Tuple[list[OrderTimeline], int]:
        """Get timeline for an order."""
        timeline = db.query(OrderTimeline).filter(
            OrderTimeline.order_id == order_id
        ).order_by(desc(OrderTimeline.created_at)).all()

        return timeline, len(timeline)

    @staticmethod
    def get_customer_orders(
        db: Session,
        customer_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[list[Order], int]:
        """Get all orders for a customer."""
        return OrderService.list_orders(
            db,
            skip=skip,
            limit=limit,
            customer_id=customer_id,
        )

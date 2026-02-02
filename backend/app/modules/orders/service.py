"""
Order management service.
Handles order creation, updates, status management, and timeline tracking.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.core.exceptions import NotFoundException, BadRequestException, ConflictException
from app.modules.orders.models import Order, OrderItem, OrderTimeline, OrderStatus
from app.modules.orders.schemas import (
    OrderCreate,
    OrderUpdate,
    OrderStatusUpdate,
    OrderItemCreate,
    OrderConvertFromQuoteRequest,
)
from app.modules.orders.repository import OrderRepository
from app.modules.products.models import Product
from app.modules.quotes.models import Quote, QuoteStatus
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class OrderService:
    """Service for managing orders."""

    # Simple status transitions (for orders without validation workflow)
    # For full validation workflow, use OrderWorkflowService
    STATUS_TRANSITIONS = {
        OrderStatus.REQUEST: [OrderStatus.VALIDATED, OrderStatus.CANCELLED],
        OrderStatus.PENDING_COMMERCIAL: [OrderStatus.CANCELLED],
        OrderStatus.COMMERCIAL_APPROVED: [OrderStatus.CANCELLED],
        OrderStatus.COMMERCIAL_REJECTED: [OrderStatus.CANCELLED],
        OrderStatus.PENDING_TECHNICAL: [OrderStatus.CANCELLED],
        OrderStatus.TECHNICAL_APPROVED: [OrderStatus.VALIDATED, OrderStatus.CANCELLED],
        OrderStatus.TECHNICAL_REJECTED: [OrderStatus.CANCELLED],
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
            subtotal += float(item_subtotal - item_discount)
            total_discount += float(item_discount)

        tax = subtotal * tax_rate
        total = subtotal + tax

        return subtotal, tax, total_discount, total

    @staticmethod
    def _ensure_sync_session(db: Session | AsyncSession) -> Session:
        """
        Accept either a sync Session or an AsyncSession and return a sync Session.
        This lets service code use the traditional ORM query API.
        """
        if hasattr(db, "query"):
            return db  # already a sync Session
        # AsyncSession has a .sync_session attribute
        sync_session = getattr(db, "sync_session", None)
        if sync_session is None:
            raise RuntimeError(
                "Database session is neither sync Session nor AsyncSession with sync_session.")
        return sync_session

    @staticmethod
    def create_order(
        db: Session | AsyncSession,
        data: OrderCreate,
        created_by_user_id: str,
    ) -> Order:
        """Create a new order."""
        try:
            # normalize session
            db = OrderService._ensure_sync_session(db)
            # Create order
            order = Order(
                id=str(uuid.uuid4()),
                customer_id=data.customer_id,
                quote_id=data.quote_id,
                order_number=OrderService._generate_order_number(),
                status=OrderStatus.REQUEST,
                validation_required=getattr(data, 'validation_required', True),
                customer_notes=data.customer_notes,
                delivery_address=data.delivery_address,
                delivery_contact=data.delivery_contact,
                created_by=created_by_user_id,
            )

            # Add items and calculate totals
            for item_data in data.items:
                if not item_data.product_id:
                    raise NotFoundException(
                        "product_id is required for order items when creating an order manually"
                    )
                product = db.query(Product).filter(
                    Product.id == item_data.product_id
                ).first()

                if not product:
                    raise NotFoundException(
                        f"Product not found: {item_data.product_id}")

                # Calculate item totals
                item_subtotal = item_data.unit_price * item_data.quantity
                item_discount = item_subtotal * \
                    (item_data.discount_percentage / 100)
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
            subtotal, tax, discount, total = OrderService._calculate_order_total(
                order.items)

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
    def convert_quote_to_order(
        db: Session | AsyncSession,
        conversion_data: OrderConvertFromQuoteRequest,
        created_by_user_id: str,
    ) -> Order:
        """Convert an accepted quote to an order."""
        db = OrderService._ensure_sync_session(db)

        # Get quote
        quote = db.query(Quote).filter(
            Quote.id == conversion_data.quote_id,
            Quote.deleted_at.is_(None)
        ).first()

        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quote {conversion_data.quote_id} not found"
            )

        # Verify quote is accepted/approved; allow CONVERTED so invoice+order can both be created
        if quote.status not in (QuoteStatus.ACCEPTED, QuoteStatus.APPROVED, QuoteStatus.CONVERTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quote must be accepted or approved.",
            )

        # Check if quote already converted to order
        existing_order = db.query(Order).filter(
            Order.quote_id == quote.id,
            Order.deleted_at.is_(None)
        ).first()

        if existing_order:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quote {quote.quote_number} has already been converted to order {existing_order.order_number}"
            )

        try:
            # Create order from quote
            order = Order(
                id=str(uuid.uuid4()),
                customer_id=quote.customer_id,
                quote_id=quote.id,
                order_number=OrderService._generate_order_number(),
                status=OrderStatus.REQUEST,
                validation_required=conversion_data.validation_required,
                customer_notes=conversion_data.customer_notes or quote.notes,
                delivery_address=conversion_data.delivery_address,
                delivery_contact=conversion_data.delivery_contact,
                created_by=created_by_user_id,
            )

            # Convert quote items to order items
            for quote_item in quote.items:
                # Calculate item totals
                item_subtotal = quote_item.unit_price * quote_item.quantity
                item_discount = item_subtotal * \
                    (quote_item.discount_percentage / 100)
                item_total = item_subtotal - item_discount

                order_item = OrderItem(
                    id=str(uuid.uuid4()),
                    product_id=quote_item.product_id,
                    quantity=quote_item.quantity,
                    unit_price=quote_item.unit_price,
                    discount_percentage=quote_item.discount_percentage,
                    discount_amount=item_discount,
                    total_price=item_total,
                    variant_sku=None,
                    notes=quote_item.description,
                )

                order.items.append(order_item)

            # Calculate order totals
            subtotal, tax, discount, total = OrderService._calculate_order_total(
                order.items)

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
                action_type="order_created_from_quote",
                description=f"Order created from quote {quote.quote_number}",
                performed_by=created_by_user_id,
            )
            order.timeline.append(timeline_entry)

            # Update quote status to CONVERTED
            quote.status = QuoteStatus.CONVERTED

            db.add(order)
            db.commit()

            logger.info(
                f"Order {order.order_number} created from quote {quote.quote_number}")

            return order

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error converting quote to order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to convert quote to order: {str(e)}"
            )

    @staticmethod
    def get_order(db: Session | AsyncSession, order_id: str) -> Order:
        """Get order by ID."""
        repo = OrderRepository(db)
        order = repo.get_by_id(order_id)

        if not order:
            raise NotFoundException(f"Order not found: {order_id}")

        return order

    @staticmethod
    def list_orders(
        db: Session | AsyncSession,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
        status: Optional[OrderStatus] = None,
    ) -> Tuple[list[Order], int]:
        """List orders with filtering."""
        repo = OrderRepository(db)
        return repo.list_orders(skip, limit, customer_id, status)

    @staticmethod
    def update_order(
        db: Session | AsyncSession,
        order_id: str,
        data: OrderUpdate,
        updated_by_user_id: str,
    ) -> Order:
        """Update order details."""
        repo = OrderRepository(db)
        order = OrderService.get_order(db, order_id)

        try:
            updated_order = repo.update(order_id, data, updated_by_user_id)
            if not updated_order:
                raise NotFoundException(f"Order not found: {order_id}")

            logger.info(f"Order updated: {order_id}")
            return updated_order

        except Exception as e:
            logger.error(f"Error updating order: {str(e)}")
            raise

    @staticmethod
    def update_order_status(
        db: Session | AsyncSession,
        order_id: str,
        new_status: OrderStatus,
        notes: Optional[str] = None,
        performed_by_user_id: Optional[str] = None,
        allow_any_transition: bool = False,
    ) -> Order:
        """Update order status with validation (skipped when allow_any_transition=True for admin)."""
        repo = OrderRepository(db)
        order = OrderService.get_order(db, order_id)

        if not allow_any_transition:
            # If order requires validation workflow, use OrderWorkflowService
            if order.validation_required:
                from app.modules.orders.service_workflow import OrderWorkflowService
                workflow_transitions = OrderWorkflowService.WORKFLOW_TRANSITIONS.get(
                    order.status, [])
                if new_status not in workflow_transitions:
                    raise BadRequestException(
                        f"Cannot transition from {order.status} to {new_status}. "
                        f"This order requires validation workflow. Use workflow endpoints for validation steps."
                    )
            else:
                allowed_transitions = OrderService.STATUS_TRANSITIONS.get(
                    order.status, [])
                if new_status not in allowed_transitions:
                    raise BadRequestException(
                        f"Cannot transition from {order.status} to {new_status}. "
                        f"Allowed: {allowed_transitions}"
                    )

        try:
            updated_order = repo.update_status(
                order_id, new_status, notes, performed_by_user_id)
            if not updated_order:
                raise NotFoundException(f"Order not found: {order_id}")

            logger.info(
                f"Order status updated: {order_id} ({order.status} → {new_status})")
            return updated_order

        except Exception as e:
            logger.error(f"Error updating order status: {str(e)}")
            raise

    @staticmethod
    def delete_order(db: Session | AsyncSession, order_id: str, deleted_by_user_id: str) -> None:
        """Soft delete an order."""
        db = OrderService._ensure_sync_session(db)
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
        db: Session | AsyncSession,
        order_id: str,
    ) -> Tuple[list[OrderTimeline], int]:
        """Get timeline for an order."""
        db = OrderService._ensure_sync_session(db)
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

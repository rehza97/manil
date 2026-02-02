"""Order repository - data access layer."""
import uuid
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import Order, OrderItem, OrderTimeline, OrderStatus
from app.modules.orders.schemas import OrderCreate, OrderUpdate


class OrderRepository:
    """Order data access layer."""

    def __init__(self, db: Session | AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    def _ensure_sync_session(self) -> Session:
        """Get sync session from either sync or async session."""
        if isinstance(self.db, AsyncSession):
            # For async sessions, we need to use sync session
            from app.config.database import get_sync_db
            return next(get_sync_db())
        return self.db

    def create(self, order_data: OrderCreate, created_by: str) -> Order:
        """Create new order."""
        db = self._ensure_sync_session()
        try:
            order = Order(
                id=str(uuid.uuid4()),
                customer_id=order_data.customer_id,
                order_number=order_data.order_number,
                status=OrderStatus.REQUEST,
                total_amount=order_data.total_amount,
                tax_amount=order_data.tax_amount,
                customer_notes=order_data.customer_notes,
                internal_notes=order_data.internal_notes,
                delivery_address=order_data.delivery_address,
                delivery_contact=order_data.delivery_contact,
                validation_required=getattr(
                    order_data, 'validation_required', True),
                created_by=created_by,
            )
            db.add(order)
            db.flush()

            # Create order items
            if order_data.items:
                for item_data in order_data.items:
                    item = OrderItem(
                        id=str(uuid.uuid4()),
                        order_id=order.id,
                        product_id=item_data.product_id,
                        quantity=item_data.quantity,
                        unit_price=item_data.unit_price,
                        total_price=item_data.total_price,
                    )
                    db.add(item)

            db.commit()
            db.refresh(order)
            return order
        except Exception as e:
            db.rollback()
            raise

    def get_by_id(self, order_id: str) -> Optional[Order]:
        """Get order by ID with items and product names."""
        db = self._ensure_sync_session()
        order = (
            db.query(Order)
            .options(
                joinedload(Order.items).joinedload(OrderItem.product),
            )
            .filter(and_(Order.id == order_id, Order.deleted_at.is_(None)))
            .first()
        )
        return order

    def get_by_order_number(self, order_number: str) -> Optional[Order]:
        """Get order by order number."""
        db = self._ensure_sync_session()
        order = db.query(Order).filter(
            and_(Order.order_number == order_number, Order.deleted_at.is_(None))
        ).first()
        return order

    def list_orders(
        self,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
        status: Optional[OrderStatus] = None,
    ) -> Tuple[list[Order], int]:
        """List orders with filtering."""
        db = self._ensure_sync_session()
        query = db.query(Order).filter(Order.deleted_at.is_(None))

        if customer_id:
            query = query.filter(Order.customer_id == customer_id)

        if status:
            query = query.filter(Order.status == status)

        total = query.count()
        orders = (
            query.options(joinedload(Order.items).joinedload(OrderItem.product))
            .order_by(desc(Order.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

        return orders, total

    def update(self, order_id: str, order_data: OrderUpdate, updated_by: str) -> Optional[Order]:
        """Update order details."""
        db = self._ensure_sync_session()
        order = self.get_by_id(order_id)
        if not order:
            return None

        try:
            update_data = order_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(order, field, value)

            order.updated_by = updated_by
            order.updated_at = datetime.now(timezone.utc)

            db.commit()
            db.refresh(order)
            return order
        except Exception as e:
            db.rollback()
            raise

    def update_status(
        self,
        order_id: str,
        new_status: OrderStatus,
        notes: Optional[str] = None,
        performed_by: Optional[str] = None,
    ) -> Optional[Order]:
        """Update order status."""
        db = self._ensure_sync_session()
        order = self.get_by_id(order_id)
        if not order:
            return None

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
                performed_by=performed_by or "system",
            )
            order.timeline.append(timeline_entry)

            db.commit()
            db.refresh(order)
            return order
        except Exception as e:
            db.rollback()
            raise

    def delete(self, order_id: str, deleted_by: str) -> bool:
        """Soft delete an order."""
        db = self._ensure_sync_session()
        order = self.get_by_id(order_id)
        if not order:
            return False

        try:
            order.deleted_at = datetime.now(timezone.utc)
            order.deleted_by = deleted_by
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise

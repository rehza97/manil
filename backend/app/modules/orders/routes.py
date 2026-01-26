"""
Order management API routes.
Endpoints for order CRUD and status management.
"""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config.database import get_sync_db, get_db
from app.core.dependencies import get_current_active_user, require_permission, require_any_permission
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.orders.schemas import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderListResponse,
    OrderStatusUpdate,
    OrderStatus,
    OrderTimelineListResponse,
)
from app.modules.orders.service import OrderService
from app.modules.customers.models import Customer
from app.infrastructure.email.service import EmailService
from app.config.database import AsyncSessionLocal
from app.modules.notifications.service import create_notification, user_id_by_email
from app.modules.settings.service import UserNotificationPreferencesService
from app.infrastructure.sms.service import SMSService

logger = logging.getLogger(__name__)


async def _send_order_status_email(to: str, order_id: str, status: str) -> None:
    """Send order status update email (async, for use in background tasks)."""
    try:
        async with AsyncSessionLocal() as db:
            uid = await user_id_by_email(db, to)
            if uid:
                prefs_svc = UserNotificationPreferencesService(db)
                prefs = await prefs_svc.get(uid)
                if not prefs.get("email", {}).get("orderUpdates", True):
                    return
        email_service = EmailService()
        await email_service.send_order_status_update(to=to, order_id=order_id, status=status)
    except Exception as e:
        logger.warning("Order status notification email failed: %s", e)


async def _create_order_status_notification(
    customer_email: str, order_id: str, status: str
) -> None:
    """Create in-app notification for order status update (async, for background tasks)."""
    try:
        async with AsyncSessionLocal() as db:
            uid = await user_id_by_email(db, customer_email)
            if not uid:
                return
            # Check push notification preferences (in-app notifications are considered push)
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            if not prefs.get("push", {}).get("orderUpdates", True):
                return
            await create_notification(
                db,
                uid,
                "order_status",
                f"Order {order_id} – {status}",
                body=f"Your order status has been updated to {status}.",
                link=f"/orders/{order_id}",
            )
    except Exception as e:
        logger.warning("Order status in-app notification failed: %s", e)


async def _send_order_status_sms(
    customer_email: str, customer_phone: str, order_id: str, status: str
) -> None:
    """Send order status SMS if user has sms.orderUpdates and customer has phone."""
    if not customer_phone or not customer_phone.strip():
        return
    try:
        async with AsyncSessionLocal() as db:
            uid = await user_id_by_email(db, customer_email)
            if not uid:
                return
            prefs_svc = UserNotificationPreferencesService(db)
            prefs = await prefs_svc.get(uid)
            if not prefs.get("sms", {}).get("orderUpdates", False):
                return
        sms = SMSService()
        await sms.send_order_notification(customer_phone, order_id, status)
    except Exception as e:
        logger.warning("Order status SMS notification failed: %s", e)


router = APIRouter(prefix="/orders", tags=["orders"])


# ============================================================================
# ORDER ENDPOINTS
# ============================================================================


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_CREATE)),
):
    """
    Create a new order. Requires ORDERS_CREATE permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_CREATE permission
    - Clients can only create orders for themselves

    **Request body:**
    - customer_id: Customer ID
    - quote_id: Optional quote request ID
    - items: List of order items (product_id, quantity, unit_price)
    - customer_notes: Optional notes
    - delivery_address: Optional delivery address
    - delivery_contact: Optional contact person

    **Response:**
    - Returns created order with calculated totals
    """
    try:
        # Security: Clients can only create orders for their own customer account
        if current_user.role.value == "client":
            # Verify customer_id matches user's customer account
            if not hasattr(current_user, 'customer_id') or order_data.customer_id != str(current_user.customer_id):
                raise ForbiddenException("You can only create orders for your own account")

        order = OrderService.create_order(db, order_data, str(current_user.id))
        return OrderResponse.model_validate(order)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str | None = Query(None),
    status: OrderStatus | None = Query(None),
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_VIEW)),
):
    """
    List orders with filtering and pagination. Requires ORDERS_VIEW permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_VIEW permission
    - Clients can only view their own orders
    - Corporate/Admin can view all orders

    **Query parameters:**
    - page: Page number (default 1)
    - page_size: Records per page (default 20, max 100)
    - customer_id: Filter by customer (optional, admin/corporate only)
    - status: Filter by status (optional)

    **Response:**
    - Returns paginated list of orders
    """
    skip = (page - 1) * page_size

    # Security: Clients can only view their own orders
    if current_user.role.value == "client":
        if hasattr(current_user, 'customer_id'):
            customer_id = str(current_user.customer_id)
        else:
            # Client has no customer_id, return empty list
            return OrderListResponse(
                data=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0,
            )

    orders, total = OrderService.list_orders(
        db,
        skip=skip,
        limit=page_size,
        customer_id=customer_id,
        status=status,
    )

    return OrderListResponse(
        data=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_VIEW)),
):
    """
    Get order by ID. Requires ORDERS_VIEW permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_VIEW permission
    - Clients can only view their own orders
    - Corporate/Admin can view all orders
    """
    try:
        order = OrderService.get_order(db, order_id)

        # Security: Clients can only view their own orders
        if current_user.role.value == "client":
            if not hasattr(current_user, 'customer_id') or str(order.customer_id) != str(current_user.customer_id):
                raise ForbiddenException("You can only view your own orders")

        return OrderResponse.model_validate(order)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    order_data: OrderUpdate,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_EDIT)),
):
    """
    Update order details (notes, delivery info). Requires ORDERS_EDIT permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_EDIT permission
    - Clients can only update their own orders
    - Corporate/Admin can update all orders

    **Note:** Does not change order status - use /orders/{order_id}/status for that.
    """
    try:
        # Get order first to check ownership
        order = OrderService.get_order(db, order_id)

        # Security: Clients can only update their own orders
        if current_user.role.value == "client":
            if not hasattr(current_user, 'customer_id') or str(order.customer_id) != str(current_user.customer_id):
                raise ForbiddenException("You can only update your own orders")

        order = OrderService.update_order(db, order_id, order_data, str(current_user.id))
        return OrderResponse.model_validate(order)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# ORDER STATUS MANAGEMENT
# ============================================================================


@router.post("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_data: OrderStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_any_permission([Permission.ORDERS_APPROVE, Permission.ORDERS_DELIVER])),
):
    """
    Update order status with validation. Requires admin or corporate role.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires admin OR corporate role (clients cannot change status)
    - Status changes are logged with user attribution

    **Valid transitions:**
    - REQUEST → VALIDATED or CANCELLED
    - VALIDATED → IN_PROGRESS or CANCELLED
    - IN_PROGRESS → DELIVERED or CANCELLED
    - DELIVERED → (no transitions)
    - CANCELLED → (no transitions)

    **Request body:**
    - status: New order status
    - notes: Optional notes for the status change
    """
    try:
        order = OrderService.update_order_status(
            db,
            order_id,
            status_data.status,
            status_data.notes,
            str(current_user.id),
        )
        customer = db.execute(
            select(Customer).where(Customer.id == order.customer_id)
        ).scalar_one_or_none()
        if customer and customer.email:
            st = status_data.status.value
            background_tasks.add_task(
                _send_order_status_email,
                customer.email,
                order_id,
                st,
            )
            background_tasks.add_task(
                _create_order_status_notification,
                customer.email,
                order_id,
                st,
            )
            if getattr(customer, "phone", None):
                background_tasks.add_task(
                    _send_order_status_sms,
                    customer.email,
                    customer.phone,
                    order_id,
                    st,
                )
        return OrderResponse.model_validate(order)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_DELETE)),
):
    """
    Delete (soft delete) an order. Requires ORDERS_DELETE permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_DELETE permission
    - Clients can only delete their own orders
    - Corporate/Admin can delete all orders

    **Note:** This soft deletes the order and marks it as CANCELLED.
    """
    try:
        # Get order first to check ownership
        order = OrderService.get_order(db, order_id)

        # Security: Clients can only delete their own orders
        if current_user.role.value == "client":
            if not hasattr(current_user, 'customer_id') or str(order.customer_id) != str(current_user.customer_id):
                raise ForbiddenException("You can only delete your own orders")

        OrderService.delete_order(db, order_id, str(current_user.id))

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============================================================================
# ORDER TIMELINE
# ============================================================================


@router.get("/{order_id}/timeline", response_model=OrderTimelineListResponse)
def get_order_timeline(
    order_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_VIEW)),
):
    """
    Get timeline of status changes for an order. Requires ORDERS_VIEW permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_VIEW permission
    - Clients can only view timeline of their own orders
    - Corporate/Admin can view all order timelines

    **Response:**
    Shows all state transitions and who performed them.
    """
    try:
        # Get order first to check ownership
        order = OrderService.get_order(db, order_id)

        # Security: Clients can only view timeline of their own orders
        if current_user.role.value == "client":
            if not hasattr(current_user, 'customer_id') or str(order.customer_id) != str(current_user.customer_id):
                raise ForbiddenException("You can only view timeline of your own orders")

        timeline, total = OrderService.get_order_timeline(db, order_id)

        from app.modules.orders.schemas import OrderTimelineEntry

        return OrderTimelineListResponse(
            data=[OrderTimelineEntry.model_validate(t) for t in timeline],
            total=total,
        )

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============================================================================
# CUSTOMER ORDERS
# ============================================================================


@router.get("/customer/{customer_id}", response_model=OrderListResponse)
def get_customer_orders(
    customer_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.ORDERS_VIEW)),
):
    """
    Get all orders for a specific customer. Requires ORDERS_VIEW permission.

    **Security:**
    - Requires authentication (valid JWT token)
    - Requires ORDERS_VIEW permission
    - Clients can only view their own orders
    - Corporate/Admin can view any customer's orders
    """
    # Security: Clients can only view their own customer orders
    if current_user.role.value == "client":
        if not hasattr(current_user, 'customer_id') or str(customer_id) != str(current_user.customer_id):
            raise ForbiddenException("You can only view your own orders")

    skip = (page - 1) * page_size

    try:
        orders, total = OrderService.get_customer_orders(
            db,
            customer_id,
            skip=skip,
            limit=page_size,
        )

        return OrderListResponse(
            data=[OrderResponse.model_validate(o) for o in orders],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenException as e:
        raise HTTPException(status_code=403, detail=str(e))

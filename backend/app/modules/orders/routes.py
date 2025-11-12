"""
Order management API routes.
Endpoints for order CRUD and status management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.core.exceptions import NotFoundException, BadRequestException
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

router = APIRouter(prefix="/orders", tags=["orders"])


# ============================================================================
# ORDER ENDPOINTS
# ============================================================================


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    # current_user would be injected by auth dependency in production
):
    """
    Create a new order.

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
        # In production, use current_user.id
        created_by_user_id = "system_user"

        order = OrderService.create_order(db, order_data, created_by_user_id)
        return OrderResponse.model_validate(order)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: str | None = Query(None),
    status: OrderStatus | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    List orders with filtering and pagination.

    **Query parameters:**
    - page: Page number (default 1)
    - page_size: Records per page (default 20, max 100)
    - customer_id: Filter by customer (optional)
    - status: Filter by status (optional)

    **Response:**
    - Returns paginated list of orders
    """
    skip = (page - 1) * page_size

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
    db: Session = Depends(get_db),
):
    """Get order by ID."""
    try:
        order = OrderService.get_order(db, order_id)
        return OrderResponse.model_validate(order)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    order_data: OrderUpdate,
    db: Session = Depends(get_db),
    # current_user would be injected by auth dependency
):
    """
    Update order details (notes, delivery info).

    Does not change order status - use /orders/{order_id}/status for that.
    """
    try:
        # In production, use current_user.id
        updated_by_user_id = "system_user"

        order = OrderService.update_order(db, order_id, order_data, updated_by_user_id)
        return OrderResponse.model_validate(order)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# ORDER STATUS MANAGEMENT
# ============================================================================


@router.post("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    # current_user would be injected by auth dependency
):
    """
    Update order status with validation.

    Valid transitions:
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
        # In production, use current_user.id
        performed_by_user_id = "system_user"

        order = OrderService.update_order_status(
            db,
            order_id,
            status_data.status,
            status_data.notes,
            performed_by_user_id,
        )
        return OrderResponse.model_validate(order)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BadRequestException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    # current_user would be injected by auth dependency
):
    """
    Delete (soft delete) an order.

    This soft deletes the order and marks it as CANCELLED.
    """
    try:
        # In production, use current_user.id
        deleted_by_user_id = "system_user"

        OrderService.delete_order(db, order_id, deleted_by_user_id)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# ORDER TIMELINE
# ============================================================================


@router.get("/{order_id}/timeline", response_model=OrderTimelineListResponse)
def get_order_timeline(
    order_id: str,
    db: Session = Depends(get_db),
):
    """
    Get timeline of status changes for an order.

    Shows all state transitions and who performed them.
    """
    try:
        timeline, total = OrderService.get_order_timeline(db, order_id)

        from app.modules.orders.schemas import OrderTimelineEntry

        return OrderTimelineListResponse(
            data=[OrderTimelineEntry.model_validate(t) for t in timeline],
            total=total,
        )

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# CUSTOMER ORDERS
# ============================================================================


@router.get("/customer/{customer_id}", response_model=OrderListResponse)
def get_customer_orders(
    customer_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get all orders for a specific customer."""
    skip = (page - 1) * page_size

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

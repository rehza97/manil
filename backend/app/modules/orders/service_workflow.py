"""
Order workflow service.

Handles commercial and technical validation workflow for orders.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.modules.orders.models import Order, OrderTimeline, OrderStatus
from app.modules.orders.service import OrderService

logger = logging.getLogger(__name__)


class OrderWorkflowService:
    """Service for managing order validation workflow."""

    # Valid workflow transitions
    WORKFLOW_TRANSITIONS = {
        # From REQUEST: can go to commercial validation or cancel
        OrderStatus.REQUEST: [
            OrderStatus.PENDING_COMMERCIAL,
            OrderStatus.CANCELLED,
        ],
        # From PENDING_COMMERCIAL: commercial team decides
        OrderStatus.PENDING_COMMERCIAL: [
            OrderStatus.COMMERCIAL_APPROVED,
            OrderStatus.COMMERCIAL_REJECTED,
            OrderStatus.CANCELLED,
        ],
        # From COMMERCIAL_APPROVED: goes to technical validation
        OrderStatus.COMMERCIAL_APPROVED: [
            OrderStatus.PENDING_TECHNICAL,
            OrderStatus.CANCELLED,
        ],
        # From COMMERCIAL_REJECTED: can be revised and resubmitted or cancelled
        OrderStatus.COMMERCIAL_REJECTED: [
            OrderStatus.PENDING_COMMERCIAL,
            OrderStatus.CANCELLED,
        ],
        # From PENDING_TECHNICAL: technical team decides
        OrderStatus.PENDING_TECHNICAL: [
            OrderStatus.TECHNICAL_APPROVED,
            OrderStatus.TECHNICAL_REJECTED,
            OrderStatus.CANCELLED,
        ],
        # From TECHNICAL_APPROVED: order is fully validated
        OrderStatus.TECHNICAL_APPROVED: [
            OrderStatus.VALIDATED,
            OrderStatus.CANCELLED,
        ],
        # From TECHNICAL_REJECTED: can be revised and resubmitted or cancelled
        OrderStatus.TECHNICAL_REJECTED: [
            OrderStatus.PENDING_TECHNICAL,
            OrderStatus.CANCELLED,
        ],
        # From VALIDATED: can start processing
        OrderStatus.VALIDATED: [
            OrderStatus.IN_PROGRESS,
            OrderStatus.CANCELLED,
        ],
        # From IN_PROGRESS: can complete or cancel
        OrderStatus.IN_PROGRESS: [
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
        ],
        # Final states
        OrderStatus.DELIVERED: [],
        OrderStatus.CANCELLED: [],
    }

    # Simplified workflow for orders that don't require validation
    SIMPLE_TRANSITIONS = {
        OrderStatus.REQUEST: [OrderStatus.VALIDATED, OrderStatus.CANCELLED],
        OrderStatus.VALIDATED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
        OrderStatus.IN_PROGRESS: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        OrderStatus.DELIVERED: [],
        OrderStatus.CANCELLED: [],
    }

    @staticmethod
    def _ensure_sync_session(db: Session | AsyncSession) -> Session:
        """Get sync session from either sync or async session."""
        if hasattr(db, "query"):
            return db
        sync_session = getattr(db, "sync_session", None)
        if sync_session is None:
            raise RuntimeError("Database session is neither sync Session nor AsyncSession with sync_session.")
        return sync_session

    @staticmethod
    def get_allowed_transitions(order: Order) -> list[OrderStatus]:
        """Get allowed status transitions for an order."""
        if order.validation_required:
            return OrderWorkflowService.WORKFLOW_TRANSITIONS.get(order.status, [])
        return OrderWorkflowService.SIMPLE_TRANSITIONS.get(order.status, [])

    @staticmethod
    def submit_for_commercial_validation(
        db: Session | AsyncSession,
        order_id: str,
        submitted_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Submit order for commercial validation."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        if order.status != OrderStatus.REQUEST:
            raise BadRequestException(
                f"Only orders in REQUEST status can be submitted for commercial validation. "
                f"Current status: {order.status}"
            )

        if not order.validation_required:
            raise BadRequestException("This order does not require validation workflow")

        try:
            previous_status = order.status
            order.status = OrderStatus.PENDING_COMMERCIAL

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=OrderStatus.PENDING_COMMERCIAL,
                action_type="submitted_for_commercial_validation",
                description=notes or "Order submitted for commercial validation",
                performed_by=submitted_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} submitted for commercial validation")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error submitting order for commercial validation: {str(e)}")
            raise

    @staticmethod
    def perform_commercial_validation(
        db: Session | AsyncSession,
        order_id: str,
        approved: bool,
        validated_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Perform commercial validation on an order."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        if order.status != OrderStatus.PENDING_COMMERCIAL:
            raise BadRequestException(
                f"Order must be in PENDING_COMMERCIAL status for commercial validation. "
                f"Current status: {order.status}"
            )

        try:
            previous_status = order.status
            now = datetime.now(timezone.utc)

            # Update validation fields
            order.commercial_validated_by = validated_by_user_id
            order.commercial_validated_at = now
            order.commercial_validation_notes = notes
            order.commercial_approved = approved

            if approved:
                order.status = OrderStatus.COMMERCIAL_APPROVED
                action_description = "Commercial validation approved"
            else:
                order.status = OrderStatus.COMMERCIAL_REJECTED
                action_description = f"Commercial validation rejected: {notes}" if notes else "Commercial validation rejected"

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=order.status,
                action_type="commercial_validation",
                description=action_description,
                performed_by=validated_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} commercial validation: {'approved' if approved else 'rejected'}")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error performing commercial validation: {str(e)}")
            raise

    @staticmethod
    def submit_for_technical_validation(
        db: Session | AsyncSession,
        order_id: str,
        submitted_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Submit order for technical validation after commercial approval."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        if order.status != OrderStatus.COMMERCIAL_APPROVED:
            raise BadRequestException(
                f"Order must be COMMERCIAL_APPROVED before technical validation. "
                f"Current status: {order.status}"
            )

        try:
            previous_status = order.status
            order.status = OrderStatus.PENDING_TECHNICAL

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=OrderStatus.PENDING_TECHNICAL,
                action_type="submitted_for_technical_validation",
                description=notes or "Order submitted for technical validation",
                performed_by=submitted_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} submitted for technical validation")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error submitting order for technical validation: {str(e)}")
            raise

    @staticmethod
    def perform_technical_validation(
        db: Session | AsyncSession,
        order_id: str,
        approved: bool,
        validated_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Perform technical validation on an order."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        if order.status != OrderStatus.PENDING_TECHNICAL:
            raise BadRequestException(
                f"Order must be in PENDING_TECHNICAL status for technical validation. "
                f"Current status: {order.status}"
            )

        try:
            previous_status = order.status
            now = datetime.now(timezone.utc)

            # Update validation fields
            order.technical_validated_by = validated_by_user_id
            order.technical_validated_at = now
            order.technical_validation_notes = notes
            order.technical_approved = approved

            if approved:
                order.status = OrderStatus.TECHNICAL_APPROVED
                action_description = "Technical validation approved"
            else:
                order.status = OrderStatus.TECHNICAL_REJECTED
                action_description = f"Technical validation rejected: {notes}" if notes else "Technical validation rejected"

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=order.status,
                action_type="technical_validation",
                description=action_description,
                performed_by=validated_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} technical validation: {'approved' if approved else 'rejected'}")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error performing technical validation: {str(e)}")
            raise

    @staticmethod
    def finalize_validation(
        db: Session | AsyncSession,
        order_id: str,
        finalized_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Finalize order validation after both commercial and technical approval."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        if order.status != OrderStatus.TECHNICAL_APPROVED:
            raise BadRequestException(
                f"Order must be TECHNICAL_APPROVED to finalize validation. "
                f"Current status: {order.status}"
            )

        try:
            previous_status = order.status
            now = datetime.now(timezone.utc)

            order.status = OrderStatus.VALIDATED
            order.validated_at = now

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=OrderStatus.VALIDATED,
                action_type="validation_finalized",
                description=notes or "Order validation finalized - ready for processing",
                performed_by=finalized_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} validation finalized")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error finalizing order validation: {str(e)}")
            raise

    @staticmethod
    def resubmit_after_rejection(
        db: Session | AsyncSession,
        order_id: str,
        resubmitted_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Resubmit an order after commercial or technical rejection."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        allowed_statuses = [OrderStatus.COMMERCIAL_REJECTED, OrderStatus.TECHNICAL_REJECTED]
        if order.status not in allowed_statuses:
            raise BadRequestException(
                f"Order must be in COMMERCIAL_REJECTED or TECHNICAL_REJECTED status to resubmit. "
                f"Current status: {order.status}"
            )

        try:
            previous_status = order.status

            # Determine target status based on current rejected state
            if order.status == OrderStatus.COMMERCIAL_REJECTED:
                order.status = OrderStatus.PENDING_COMMERCIAL
                # Clear previous commercial validation
                order.commercial_validated_by = None
                order.commercial_validated_at = None
                order.commercial_validation_notes = None
                order.commercial_approved = None
                action_type = "resubmitted_for_commercial"
            else:
                order.status = OrderStatus.PENDING_TECHNICAL
                # Clear previous technical validation
                order.technical_validated_by = None
                order.technical_validated_at = None
                order.technical_validation_notes = None
                order.technical_approved = None
                action_type = "resubmitted_for_technical"

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=order.status,
                action_type=action_type,
                description=notes or f"Order resubmitted for validation",
                performed_by=resubmitted_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} resubmitted for validation")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error resubmitting order: {str(e)}")
            raise

    @staticmethod
    def skip_validation(
        db: Session | AsyncSession,
        order_id: str,
        skipped_by_user_id: str,
        notes: Optional[str] = None,
    ) -> Order:
        """Skip validation workflow and mark order as validated directly."""
        db = OrderWorkflowService._ensure_sync_session(db)
        order = OrderService.get_order(db, order_id)

        if order.status != OrderStatus.REQUEST:
            raise BadRequestException(
                f"Can only skip validation for orders in REQUEST status. "
                f"Current status: {order.status}"
            )

        try:
            previous_status = order.status
            now = datetime.now(timezone.utc)

            # Mark as not requiring validation and validate directly
            order.validation_required = False
            order.status = OrderStatus.VALIDATED
            order.validated_at = now

            # Add timeline entry
            timeline_entry = OrderTimeline(
                id=str(uuid.uuid4()),
                order_id=order_id,
                previous_status=previous_status,
                new_status=OrderStatus.VALIDATED,
                action_type="validation_skipped",
                description=notes or "Validation workflow skipped - order validated directly",
                performed_by=skipped_by_user_id,
            )
            order.timeline.append(timeline_entry)

            db.commit()
            logger.info(f"Order {order_id} validation skipped")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"Error skipping validation: {str(e)}")
            raise

    @staticmethod
    def get_validation_summary(order: Order) -> dict:
        """Get a summary of the order's validation status."""
        return {
            "validation_required": order.validation_required,
            "commercial_validation": {
                "status": "approved" if order.commercial_approved else (
                    "rejected" if order.commercial_approved is False else "pending"
                ),
                "validated_by": order.commercial_validated_by,
                "validated_at": order.commercial_validated_at.isoformat() if order.commercial_validated_at else None,
                "notes": order.commercial_validation_notes,
            } if order.validation_required else None,
            "technical_validation": {
                "status": "approved" if order.technical_approved else (
                    "rejected" if order.technical_approved is False else "pending"
                ),
                "validated_by": order.technical_validated_by,
                "validated_at": order.technical_validated_at.isoformat() if order.technical_validated_at else None,
                "notes": order.technical_validation_notes,
            } if order.validation_required else None,
            "fully_validated": order.status == OrderStatus.VALIDATED,
            "validated_at": order.validated_at.isoformat() if order.validated_at else None,
        }

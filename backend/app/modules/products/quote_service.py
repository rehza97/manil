"""Quote request and service request business logic service."""
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session

from app.modules.products.quote_models import (
    QuoteRequest,
    QuoteLineItem,
    ServiceRequest,
    QuoteStatus,
    QuotePriority,
)
from app.modules.products.quote_schemas import (
    QuoteRequestCreate,
    QuoteRequestUpdate,
    QuoteLineItemCreate,
    ServiceRequestCreate,
    ServiceRequestUpdate,
)
from app.core.exceptions import NotFoundException, ConflictException

logger = logging.getLogger(__name__)


class QuoteRequestService:
    """Service for managing quote requests."""

    @staticmethod
    def create_quote_request(
        db: Session,
        quote_data: QuoteRequestCreate,
        customer_id: Optional[str] = None,
    ) -> QuoteRequest:
        """Create a new quote request."""
        quote = QuoteRequest(
            id=str(uuid4()),
            customer_id=customer_id,
            product_id=quote_data.product_id,
            title=quote_data.title,
            description=quote_data.description,
            quantity=quote_data.quantity,
            customer_name=quote_data.customer_name,
            customer_email=quote_data.customer_email,
            customer_phone=quote_data.customer_phone,
            company_name=quote_data.company_name,
            customer_notes=quote_data.customer_notes,
            priority=quote_data.priority,
            status=QuoteStatus.PENDING,
        )

        db.add(quote)
        db.flush()

        # Add line items if provided
        if quote_data.line_items:
            for item_data in quote_data.line_items:
                total_price = item_data.quantity * item_data.unit_price
                discount_amount = total_price * (item_data.discount_percentage / 100)
                final_price = total_price - discount_amount

                line_item = QuoteLineItem(
                    id=str(uuid4()),
                    quote_id=quote.id,
                    product_id=item_data.product_id,
                    product_name=item_data.product_name,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    total_price=total_price,
                    discount_percentage=item_data.discount_percentage,
                    discount_amount=discount_amount,
                    final_price=final_price,
                )
                db.add(line_item)

        db.commit()
        db.refresh(quote)

        logger.info(f"Quote request created: {quote.id}")
        return quote

    @staticmethod
    def get_quote_request(db: Session, quote_id: str) -> QuoteRequest:
        """Get a quote request by ID."""
        quote = db.execute(
            select(QuoteRequest).where(
                and_(QuoteRequest.id == quote_id, QuoteRequest.deleted_at.is_(None))
            )
        ).first()

        if not quote:
            raise NotFoundException(f"Quote request {quote_id} not found")

        return quote[0]

    @staticmethod
    def list_quote_requests(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
        status: Optional[QuoteStatus] = None,
        priority: Optional[QuotePriority] = None,
        search: Optional[str] = None,
    ) -> Tuple[list[QuoteRequest], int]:
        """List quote requests with optional filtering."""
        query = select(QuoteRequest).where(QuoteRequest.deleted_at.is_(None))

        if customer_id:
            query = query.where(QuoteRequest.customer_id == customer_id)

        if status:
            query = query.where(QuoteRequest.status == status)

        if priority:
            query = query.where(QuoteRequest.priority == priority)

        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    QuoteRequest.title.ilike(search_term),
                    QuoteRequest.description.ilike(search_term),
                    QuoteRequest.customer_email.ilike(search_term),
                )
            )

        # Get total count
        total_count = db.execute(
            select(func.count(QuoteRequest.id)).where(QuoteRequest.deleted_at.is_(None))
        ).scalar()

        # Get paginated results
        quotes = db.execute(
            query.order_by(desc(QuoteRequest.requested_at))
            .offset(skip)
            .limit(limit)
        ).scalars().all()

        return list(quotes), total_count

    @staticmethod
    def update_quote_request(
        db: Session,
        quote_id: str,
        quote_data: QuoteRequestUpdate,
    ) -> QuoteRequest:
        """Update a quote request."""
        quote = db.execute(
            select(QuoteRequest).where(
                and_(QuoteRequest.id == quote_id, QuoteRequest.deleted_at.is_(None))
            )
        ).first()

        if not quote:
            raise NotFoundException(f"Quote request {quote_id} not found")

        quote = quote[0]

        # Update fields
        for field, value in quote_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field == "status" and value == QuoteStatus.QUOTED:
                    quote.quoted_at = datetime.now(timezone.utc)
                elif field == "status" and value == QuoteStatus.ACCEPTED:
                    quote.accepted_at = datetime.now(timezone.utc)
                elif field == "status" and value == QuoteStatus.REVIEWED:
                    quote.reviewed_at = datetime.now(timezone.utc)

                setattr(quote, field, value)

        db.commit()
        db.refresh(quote)

        logger.info(f"Quote request updated: {quote.id}")
        return quote

    @staticmethod
    def delete_quote_request(db: Session, quote_id: str) -> None:
        """Soft delete a quote request."""
        quote = db.execute(
            select(QuoteRequest).where(
                and_(QuoteRequest.id == quote_id, QuoteRequest.deleted_at.is_(None))
            )
        ).first()

        if not quote:
            raise NotFoundException(f"Quote request {quote_id} not found")

        quote = quote[0]
        quote.deleted_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"Quote request deleted: {quote.id}")

    @staticmethod
    def get_expired_quotes(db: Session) -> list[QuoteRequest]:
        """Get expired quote requests."""
        now = datetime.now(timezone.utc)
        quotes = db.execute(
            select(QuoteRequest).where(
                and_(
                    QuoteRequest.expires_at.isnot(None),
                    QuoteRequest.expires_at < now,
                    QuoteRequest.status == QuoteStatus.PENDING,
                    QuoteRequest.deleted_at.is_(None),
                )
            )
        ).scalars().all()

        return list(quotes)


class ServiceRequestService:
    """Service for managing service requests."""

    @staticmethod
    def create_service_request(
        db: Session,
        service_data: ServiceRequestCreate,
        customer_id: Optional[str] = None,
    ) -> ServiceRequest:
        """Create a new service request."""
        service = ServiceRequest(
            id=str(uuid4()),
            customer_id=customer_id,
            service_type=service_data.service_type,
            description=service_data.description,
            customer_name=service_data.customer_name,
            customer_email=service_data.customer_email,
            customer_phone=service_data.customer_phone,
            company_name=service_data.company_name,
            requested_date=service_data.requested_date,
            preferred_time=service_data.preferred_time,
            duration_hours=service_data.duration_hours,
            customer_notes=service_data.customer_notes,
            priority=service_data.priority,
            status=QuoteStatus.PENDING,
        )

        db.add(service)
        db.commit()
        db.refresh(service)

        logger.info(f"Service request created: {service.id}")
        return service

    @staticmethod
    def get_service_request(db: Session, service_id: str) -> ServiceRequest:
        """Get a service request by ID."""
        service = db.execute(
            select(ServiceRequest).where(
                and_(ServiceRequest.id == service_id, ServiceRequest.deleted_at.is_(None))
            )
        ).first()

        if not service:
            raise NotFoundException(f"Service request {service_id} not found")

        return service[0]

    @staticmethod
    def list_service_requests(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        customer_id: Optional[str] = None,
        status: Optional[QuoteStatus] = None,
        service_type: Optional[str] = None,
    ) -> Tuple[list[ServiceRequest], int]:
        """List service requests with optional filtering."""
        query = select(ServiceRequest).where(ServiceRequest.deleted_at.is_(None))

        if customer_id:
            query = query.where(ServiceRequest.customer_id == customer_id)

        if status:
            query = query.where(ServiceRequest.status == status)

        if service_type:
            query = query.where(ServiceRequest.service_type == service_type)

        # Get total count
        total_count = db.execute(
            select(func.count(ServiceRequest.id)).where(ServiceRequest.deleted_at.is_(None))
        ).scalar()

        # Get paginated results
        services = db.execute(
            query.order_by(desc(ServiceRequest.created_at))
            .offset(skip)
            .limit(limit)
        ).scalars().all()

        return list(services), total_count

    @staticmethod
    def update_service_request(
        db: Session,
        service_id: str,
        service_data: ServiceRequestUpdate,
    ) -> ServiceRequest:
        """Update a service request."""
        service = db.execute(
            select(ServiceRequest).where(
                and_(ServiceRequest.id == service_id, ServiceRequest.deleted_at.is_(None))
            )
        ).first()

        if not service:
            raise NotFoundException(f"Service request {service_id} not found")

        service = service[0]

        # Update fields
        for field, value in service_data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(service, field, value)

        db.commit()
        db.refresh(service)

        logger.info(f"Service request updated: {service.id}")
        return service

    @staticmethod
    def delete_service_request(db: Session, service_id: str) -> None:
        """Soft delete a service request."""
        service = db.execute(
            select(ServiceRequest).where(
                and_(ServiceRequest.id == service_id, ServiceRequest.deleted_at.is_(None))
            )
        ).first()

        if not service:
            raise NotFoundException(f"Service request {service_id} not found")

        service = service[0]
        service.deleted_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"Service request deleted: {service.id}")

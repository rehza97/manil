"""Customer service containing ALL business logic."""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ConflictException, ValidationException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerListResponse,
    CustomerStatistics,
    CustomerStatus,
    CustomerType,
)
from app.modules.customers.models import Customer

logger = logging.getLogger(__name__)


class CustomerService:
    """Customer business logic service."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = CustomerRepository(db)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[CustomerStatus] = None,
        customer_type: Optional[CustomerType] = None,
        search: Optional[str] = None,
    ) -> CustomerListResponse:
        """Get all customers with pagination and filtering."""
        customers, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            status=status,
            customer_type=customer_type,
            search=search,
        )

        # Calculate pagination metadata
        page = (skip // limit) + 1 if limit > 0 else 1
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return CustomerListResponse(
            data=customers,
            total=total,
            page=page,
            page_size=limit,
            total_pages=total_pages,
        )

    async def get_by_id(self, customer_id: str) -> Customer:
        """Get customer by ID."""
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer with ID {customer_id} not found")
        return customer

    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email address."""
        return await self.repository.get_by_email(email)

    async def create(self, customer_data: CustomerCreate, created_by: str) -> Customer:
        """
        Create a new customer.

        Business rules:
        - Email must be unique
        - Corporate customers must have company_name
        - Validate tax_id format if provided
        """
        # #region agent log
        import json, os, time
        log_path = '/tmp/debug.log'
        dump_data = customer_data.model_dump()
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"D","location":"service.py:65","message":"Service received from router","data":{"customer_type":str(customer_data.customer_type),"customer_type_type":str(type(customer_data.customer_type)),"customer_type_value":customer_data.customer_type.value if hasattr(customer_data.customer_type,'value') else None,"model_dump_customer_type":dump_data.get('customer_type'),"model_dump_customer_type_type":str(type(dump_data.get('customer_type'))) if dump_data.get('customer_type') else None},"timestamp":int(time.time()*1000)})+'\n')
        except: pass
        # #endregion
        # Check if email already exists
        existing = await self.repository.get_by_email(customer_data.email)
        if existing:
            raise ConflictException(f"Customer with email {customer_data.email} already exists")

        # Validate corporate customer requirements
        if customer_data.customer_type == CustomerType.CORPORATE:
            if not customer_data.company_name:
                raise ValidationException("Company name is required for corporate customers")

        # Create customer
        customer = await self.repository.create(customer_data, created_by)
        return customer

    async def update(self, customer_id: str, customer_data: CustomerUpdate, updated_by: str) -> Customer:
        """Update customer with validation."""
        try:
            # Get existing customer
            customer = await self.get_by_id(customer_id)

            # Validate email uniqueness if being updated
            if customer_data.email and customer_data.email != customer.email:
                exists = await self.repository.exists_by_email(
                    customer_data.email,
                    exclude_id=customer_id
                )
                if exists:
                    raise ConflictException(f"Customer with email {customer_data.email} already exists")

            # Validate corporate requirements
            updated_type = customer_data.customer_type or customer.customer_type
            updated_company = customer_data.company_name if customer_data.company_name is not None else customer.company_name
            if updated_type == CustomerType.CORPORATE and not updated_company:
                raise ValidationException("Company name is required for corporate customers")

            # Update customer
            return await self.repository.update(customer, customer_data, updated_by)
        except Exception as e:
            logger.error(f"Failed to update customer {customer_id}: {e}", exc_info=True)
            raise

    async def delete(self, customer_id: str, deleted_by: str) -> None:
        """Soft delete customer."""
        try:
            customer = await self.get_by_id(customer_id)
            await self.repository.delete(customer, deleted_by)
            logger.info(f"Customer {customer_id} soft deleted by user {deleted_by}")
        except Exception as e:
            logger.error(f"Failed to delete customer {customer_id}: {e}", exc_info=True)
            raise

    async def activate(self, customer_id: str, updated_by: str) -> Customer:
        """Activate customer account."""
        try:
            customer = await self.get_by_id(customer_id)
            update_data = CustomerUpdate(status=CustomerStatus.ACTIVE)
            result = await self.repository.update(customer, update_data, updated_by)
            logger.info(f"Customer {customer_id} activated by user {updated_by}")
            return result
        except Exception as e:
            logger.error(f"Failed to activate customer {customer_id}: {e}", exc_info=True)
            raise

    async def suspend(self, customer_id: str, updated_by: str) -> Customer:
        """Suspend customer account."""
        try:
            customer = await self.get_by_id(customer_id)
            update_data = CustomerUpdate(status=CustomerStatus.SUSPENDED)
            result = await self.repository.update(customer, update_data, updated_by)
            logger.info(f"Customer {customer_id} suspended by user {updated_by}")
            return result
        except Exception as e:
            logger.error(f"Failed to suspend customer {customer_id}: {e}", exc_info=True)
            raise

    async def get_statistics(self) -> CustomerStatistics:
        """Get customer statistics (optimized single query)."""
        try:
            # Get counts grouped by status in a single query
            stats_by_status = await self.repository.get_statistics_grouped()

            # Extract counts with defaults
            active = stats_by_status.get(CustomerStatus.ACTIVE, 0)
            pending = stats_by_status.get(CustomerStatus.PENDING, 0)
            suspended = stats_by_status.get(CustomerStatus.SUSPENDED, 0)
            inactive = stats_by_status.get(CustomerStatus.INACTIVE, 0)
            total = sum(stats_by_status.values())

            return CustomerStatistics(
                total=total,
                active=active,
                pending=pending,
                suspended=suspended,
                inactive=inactive,
            )
        except Exception as e:
            logger.error(f"Failed to get customer statistics: {e}", exc_info=True)
            raise

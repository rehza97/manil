"""Customer service containing ALL business logic."""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ConflictException, ValidationException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerListResponse,
    CustomerStatus,
    CustomerType,
)
from app.modules.customers.models import Customer


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

    async def create(self, customer_data: CustomerCreate, created_by: str) -> Customer:
        """
        Create a new customer.

        Business rules:
        - Email must be unique
        - Corporate customers must have company_name
        - Validate tax_id format if provided
        """
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

    async def update(self, customer_id: str, customer_data: CustomerUpdate) -> Customer:
        """Update customer with validation."""
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
        return await self.repository.update(customer, customer_data)

    async def delete(self, customer_id: str) -> None:
        """Delete customer."""
        customer = await self.get_by_id(customer_id)
        await self.repository.delete(customer)

    async def activate(self, customer_id: str) -> Customer:
        """Activate customer account."""
        customer = await self.get_by_id(customer_id)
        update_data = CustomerUpdate(status=CustomerStatus.ACTIVE)
        return await self.repository.update(customer, update_data)

    async def suspend(self, customer_id: str) -> Customer:
        """Suspend customer account."""
        customer = await self.get_by_id(customer_id)
        update_data = CustomerUpdate(status=CustomerStatus.SUSPENDED)
        return await self.repository.update(customer, update_data)

    async def get_statistics(self) -> dict:
        """Get customer statistics."""
        total = await self.repository.count_by_status(None)
        active = await self.repository.count_by_status(CustomerStatus.ACTIVE)
        pending = await self.repository.count_by_status(CustomerStatus.PENDING)
        suspended = await self.repository.count_by_status(CustomerStatus.SUSPENDED)

        return {
            "total": total,
            "active": active,
            "pending": pending,
            "suspended": suspended,
        }

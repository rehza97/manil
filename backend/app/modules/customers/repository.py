"""Customer repository for data access layer."""

from typing import Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerStatus,
    CustomerType,
)


class CustomerRepository:
    """Customer data access layer - ONLY database operations."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[CustomerStatus] = None,
        customer_type: Optional[CustomerType] = None,
        search: Optional[str] = None,
    ) -> tuple[list[Customer], int]:
        """
        Get all customers with optional filtering and pagination.

        Returns tuple of (customers_list, total_count).
        """
        # Exclude soft-deleted records
        query = select(Customer).where(Customer.deleted_at.is_(None))

        # Apply filters
        if status:
            query = query.where(Customer.status == status)
        if customer_type:
            query = query.where(Customer.customer_type == customer_type)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Customer.name.ilike(search_term),
                    Customer.email.ilike(search_term),
                    Customer.company_name.ilike(search_term),
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination
        query = query.offset(skip).limit(
            limit).order_by(Customer.created_at.desc())

        # Execute query
        result = await self.db.execute(query)
        customers = list(result.scalars().all())

        return customers, total

    async def get_by_id(self, customer_id: str) -> Optional[Customer]:
        """Get customer by ID (excluding soft-deleted)."""
        query = select(Customer).where(
            Customer.id == customer_id,
            Customer.deleted_at.is_(None)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email address (excluding soft-deleted)."""
        query = select(Customer).where(
            Customer.email == email,
            Customer.deleted_at.is_(None)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, customer_data: CustomerCreate, created_by: str) -> Customer:
        """Create a new customer."""
        customer = Customer(
            **customer_data.model_dump(),
            created_by=created_by,
        )
        self.db.add(customer)
        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def update(self, customer: Customer, customer_data: CustomerUpdate, updated_by: str) -> Customer:
        """Update existing customer."""
        update_data = customer_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)

        # Track who made the update
        customer.updated_by = updated_by

        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def delete(self, customer: Customer, deleted_by: str) -> None:
        """Soft delete customer (sets deleted_at and deleted_by)."""
        from datetime import datetime, timezone

        customer.deleted_at = datetime.utcnow()
        customer.deleted_by = deleted_by

        await self.db.commit()

    async def count_all(self) -> int:
        """Count all customers (excluding soft-deleted)."""
        query = select(func.count()).select_from(
            Customer).where(Customer.deleted_at.is_(None))
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def count_by_status(self, status: Optional[CustomerStatus] = None) -> int:
        """Count customers by status (excluding soft-deleted)."""
        query = select(func.count()).select_from(
            Customer).where(Customer.deleted_at.is_(None))
        if status:
            query = query.where(Customer.status == status)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_statistics_grouped(self) -> dict[CustomerStatus, int]:
        """Get customer counts grouped by status (optimized single query)."""
        query = (
            select(Customer.status, func.count(Customer.id).label('count'))
            .where(Customer.deleted_at.is_(None))
            .group_by(Customer.status)
        )
        result = await self.db.execute(query)
        return {row.status: row.count for row in result}

    async def exists_by_email(self, email: str, exclude_id: Optional[str] = None) -> bool:
        """Check if customer exists with given email (excluding soft-deleted)."""
        query = select(func.count()).where(
            Customer.email == email,
            Customer.deleted_at.is_(None)
        )
        if exclude_id:
            query = query.where(Customer.id != exclude_id)
        result = await self.db.execute(query)
        count = result.scalar() or 0
        return count > 0

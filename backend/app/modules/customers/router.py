"""Customer API router with all endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerStatus,
    CustomerType,
)
from app.modules.customers.service import CustomerService


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
async def get_customers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    status: Optional[CustomerStatus] = Query(None, description="Filter by status"),
    customer_type: Optional[CustomerType] = Query(None, description="Filter by type"),
    search: Optional[str] = Query(None, description="Search in name, email, or company"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all customers with pagination and optional filtering."""
    service = CustomerService(db)
    return await service.get_all(
        skip=skip,
        limit=limit,
        status=status,
        customer_type=customer_type,
        search=search,
    )


@router.get("/statistics")
async def get_customer_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get customer statistics (counts by status)."""
    service = CustomerService(db)
    return await service.get_statistics()


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get customer by ID."""
    service = CustomerService(db)
    return await service.get_by_id(customer_id)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new customer."""
    service = CustomerService(db)
    return await service.create(customer_data, created_by=current_user.id)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing customer."""
    service = CustomerService(db)
    return await service.update(customer_id, customer_data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a customer."""
    service = CustomerService(db)
    await service.delete(customer_id)


@router.post("/{customer_id}/activate", response_model=CustomerResponse)
async def activate_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Activate a customer account."""
    service = CustomerService(db)
    return await service.activate(customer_id)


@router.post("/{customer_id}/suspend", response_model=CustomerResponse)
async def suspend_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suspend a customer account."""
    service = CustomerService(db)
    return await service.suspend(customer_id)

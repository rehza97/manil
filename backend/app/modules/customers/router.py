"""Customer API router with all endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.core.exceptions import NotFoundException, ForbiddenException
from app.modules.auth.models import User
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerStatistics,
    CustomerStatus,
    CustomerType,
)
from app.modules.customers.service import CustomerService

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
async def get_customers(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    status: Optional[CustomerStatus] = Query(None, description="Filter by status"),
    customer_type: Optional[CustomerType] = Query(None, description="Filter by type"),
    search: Optional[str] = Query(None, description="Search in name, email, or company"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
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


@router.get("/me", response_model=CustomerResponse)
async def get_my_customer(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's own customer profile (for clients)."""
    if not current_user.email:
        raise NotFoundException("User email not found")
    
    service = CustomerService(db)
    customer = await service.get_by_email(current_user.email)
    
    if not customer:
        raise NotFoundException("Customer profile not found for this user")
    
    # Verify ownership - clients can only access their own customer data
    if current_user.role == "client" and customer.email != current_user.email:
        raise ForbiddenException("You can only access your own customer profile")
    
    return customer


@router.get("/statistics", response_model=CustomerStatistics)
async def get_customer_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Get customer statistics (counts by status)."""
    service = CustomerService(db)
    return await service.get_statistics()


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Get customer by ID."""
    service = CustomerService(db)
    return await service.get_by_id(customer_id)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_CREATE)),
):
    """Create a new customer."""
    # #region agent log
    import json, os, time
    log_path = '/tmp/debug.log'
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"D","location":"router.py:69","message":"Pydantic received data","data":{"customer_type":str(customer_data.customer_type),"customer_type_type":str(type(customer_data.customer_type)),"has_value":hasattr(customer_data.customer_type,'value'),"customer_type_value":customer_data.customer_type.value if hasattr(customer_data.customer_type,'value') else None,"model_dump":customer_data.model_dump()},"timestamp":int(time.time()*1000)})+'\n')
    except: pass
    # #endregion
    service = CustomerService(db)
    result = await service.create(customer_data, created_by=current_user.id)
    return result


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_EDIT)),
):
    """Update an existing customer."""
    service = CustomerService(db)
    return await service.update(customer_id, customer_data, updated_by=current_user.id)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_DELETE)),
):
    """Soft delete a customer."""
    service = CustomerService(db)
    await service.delete(customer_id, deleted_by=current_user.id)


@router.post("/{customer_id}/activate", response_model=CustomerResponse)
async def activate_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_ACTIVATE)),
):
    """Activate a customer account."""
    service = CustomerService(db)
    return await service.activate(customer_id, updated_by=current_user.id)


@router.post("/{customer_id}/suspend", response_model=CustomerResponse)
async def suspend_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_SUSPEND)),
):
    """Suspend a customer account."""
    service = CustomerService(db)
    return await service.suspend(customer_id, updated_by=current_user.id)

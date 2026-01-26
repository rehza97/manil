"""Customer repository for data access layer."""

import logging
from typing import Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerStatus,
    CustomerType,
    ApprovalStatus,
)

logger = logging.getLogger(__name__)


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

    async def get_by_email(self, email: str) -> Optional[Customer]:
        """Get customer by email address."""
        from sqlalchemy import select
        result = await self.db.execute(
            select(Customer).where(
                Customer.email == email,
                Customer.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

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
        # #region agent log
        import json, os, time
        log_path = '/tmp/debug.log'
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"C","location":"repository.py:90","message":"Repository entry","data":{"customer_data_type":str(type(customer_data))},"timestamp":int(time.time()*1000)})+'\n')
        except: pass
        # #endregion
        
        # Get data dict - Pydantic returns enum objects
        customer_dict = customer_data.model_dump()
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"D","location":"repository.py:96","message":"After model_dump","data":{"customer_type_in_dict":customer_dict.get('customer_type'),"customer_type_type":str(type(customer_dict.get('customer_type'))) if customer_dict.get('customer_type') else None,"customer_type_str":str(customer_dict.get('customer_type')) if customer_dict.get('customer_type') else None,"customer_type_has_value":hasattr(customer_dict.get('customer_type'),'value') if customer_dict.get('customer_type') else False,"customer_type_value":customer_dict.get('customer_type').value if customer_dict.get('customer_type') and hasattr(customer_dict.get('customer_type'),'value') else None},"timestamp":int(time.time()*1000)})+'\n')
        except: pass
        # #endregion
        
        # Extract enum values as lowercase strings to avoid SQLAlchemy enum name serialization issues
        customer_type_str = None
        status_str = None
        
        if 'customer_type' in customer_dict:
            customer_type = customer_dict['customer_type']
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"repository.py:105","message":"Before normalization","data":{"customer_type":str(customer_type),"customer_type_type":str(type(customer_type)),"is_str":isinstance(customer_type,str),"is_enum":isinstance(customer_type,CustomerType),"has_value":hasattr(customer_type,'value') if not isinstance(customer_type,str) else False,"value":customer_type.value if hasattr(customer_type,'value') else None},"timestamp":int(time.time()*1000)})+'\n')
            except: pass
            # #endregion
            if isinstance(customer_type, str):
                customer_type_str = customer_type.lower()
            elif isinstance(customer_type, CustomerType):
                customer_type_str = customer_type.value.lower()
            else:
                customer_type_str = str(customer_type).lower()
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"repository.py:115","message":"After normalization","data":{"customer_type_str":customer_type_str},"timestamp":int(time.time()*1000)})+'\n')
            except: pass
            # #endregion
            customer_dict.pop('customer_type')
        
        if 'status' in customer_dict:
            status = customer_dict['status']
            if isinstance(status, str):
                status_str = status.lower()
            elif isinstance(status, CustomerStatus):
                status_str = status.value.lower()
            else:
                status_str = str(status).lower()
            customer_dict.pop('status')
        
        # Create customer instance with non-enum fields first
        customer = Customer(
            **customer_dict,
            created_by=created_by,
        )
        
        # Set enum fields using enum objects created from lowercase strings
        if customer_type_str:
            enum_obj = CustomerType(customer_type_str)
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"repository.py:140","message":"Created enum object","data":{"customer_type_str":customer_type_str,"enum_obj":str(enum_obj),"enum_obj_name":enum_obj.name if hasattr(enum_obj,'name') else None,"enum_obj_value":enum_obj.value,"enum_obj_type":str(type(enum_obj))},"timestamp":int(time.time()*1000)})+'\n')
            except: pass
            # #endregion
            customer.customer_type = enum_obj
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"repository.py:144","message":"After setting enum on customer","data":{"customer_customer_type":str(customer.customer_type),"customer_customer_type_name":customer.customer_type.name if hasattr(customer.customer_type,'name') else None,"customer_customer_type_value":customer.customer_type.value,"str_customer_type":str(customer.customer_type)},"timestamp":int(time.time()*1000)})+'\n')
            except: pass
            # #endregion
        
        if status_str:
            customer.status = CustomerStatus(status_str)
        
        # approval_status defaults to NOT_REQUIRED in model, so no need to set it explicitly
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"E","location":"repository.py:152","message":"Before SQLAlchemy commit","data":{"customer_customer_type":str(customer.customer_type),"customer_customer_type_value":customer.customer_type.value,"repr_customer_type":repr(customer.customer_type)},"timestamp":int(time.time()*1000)})+'\n')
        except: pass
        # #endregion
        
        self.db.add(customer)
        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def update(self, customer: Customer, customer_data: CustomerUpdate, updated_by: str) -> Customer:
        """Update existing customer."""
        # Get data dict
        update_data = customer_data.model_dump(exclude_unset=True)
        
        # Convert enum fields to proper enum objects, ensuring lowercase values are used
        if 'customer_type' in update_data:
            customer_type = update_data['customer_type']
            if isinstance(customer_type, str):
                customer_type_lower = customer_type.lower()
                update_data['customer_type'] = CustomerType(customer_type_lower)
            elif isinstance(customer_type, CustomerType):
                update_data['customer_type'] = CustomerType(customer_type.value)
        
        if 'status' in update_data:
            status = update_data['status']
            if isinstance(status, str):
                status_lower = status.lower()
                update_data['status'] = CustomerStatus(status_lower)
            elif isinstance(status, CustomerStatus):
                update_data['status'] = CustomerStatus(status.value)
        
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

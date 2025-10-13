"""Customer Pydantic schemas for validation and serialization."""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class CustomerStatus(str, Enum):
    """Customer account status enumeration."""

    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class CustomerType(str, Enum):
    """Customer type enumeration."""

    INDIVIDUAL = "individual"
    CORPORATE = "corporate"


class CustomerBase(BaseModel):
    """Base customer schema with common fields."""

    name: str = Field(..., min_length=2, max_length=255, description="Customer full name")
    email: EmailStr = Field(..., description="Customer email address")
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$", description="Customer phone number (E.164 format)")
    customer_type: CustomerType = Field(default=CustomerType.INDIVIDUAL, description="Type of customer")
    company_name: Optional[str] = Field(None, max_length=255, description="Company name for corporate customers")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax identification number")
    address: Optional[str] = Field(None, max_length=500, description="Customer address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""

    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer."""

    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    customer_type: Optional[CustomerType] = None
    company_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    status: Optional[CustomerStatus] = None


class CustomerResponse(CustomerBase):
    """Schema for customer response."""

    id: str = Field(..., description="Customer unique identifier")
    status: CustomerStatus = Field(..., description="Customer account status")
    created_at: datetime = Field(..., description="Timestamp when customer was created")
    updated_at: datetime = Field(..., description="Timestamp when customer was last updated")
    created_by: str = Field(..., description="ID of user who created the customer")

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    """Schema for paginated customer list response."""

    data: list[CustomerResponse] = Field(..., description="List of customers")
    total: int = Field(..., description="Total number of customers")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class CustomerSearchParams(BaseModel):
    """Schema for customer search parameters."""

    search: Optional[str] = Field(None, description="Search term for name or email")
    status: Optional[CustomerStatus] = Field(None, description="Filter by status")
    customer_type: Optional[CustomerType] = Field(None, description="Filter by type")
    skip: int = Field(0, ge=0, description="Number of records to skip")
    limit: int = Field(100, ge=1, le=1000, description="Maximum number of records to return")

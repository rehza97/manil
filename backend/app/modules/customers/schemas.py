"""Customer Pydantic schemas for validation and serialization."""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator


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


class ApprovalStatus(str, Enum):
    """Customer approval status enumeration."""

    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CustomerBase(BaseModel):
    """Base customer schema with common fields."""

    name: str = Field(..., min_length=2, max_length=255, description="Customer full name")
    email: EmailStr = Field(..., description="Customer email address")
    phone: str = Field(
        ...,
        pattern=r"^\+?[\d\s\-\(\)]{7,20}$",
        description="Customer phone number (international format, 7-20 characters)"
    )
    customer_type: CustomerType = Field(default=CustomerType.INDIVIDUAL, description="Type of customer")
    company_name: Optional[str] = Field(None, max_length=255, description="Company name for corporate customers")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax identification number")
    address: Optional[str] = Field(None, max_length=500, description="Customer address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Validate email format using advanced validator."""
        from app.modules.customers.validators import validate_email_format
        try:
            validate_email_format(v)
        except Exception as e:
            raise ValueError(str(e))
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str, info) -> str:
        """Validate phone number format."""
        from app.modules.customers.validators import validate_phone_number
        country = info.data.get('country') if hasattr(info, 'data') else None
        try:
            validate_phone_number(v, country)
        except Exception as e:
            raise ValueError(str(e))
        return v
    
    @field_validator('tax_id')
    @classmethod
    def validate_tax_id(cls, v: Optional[str], info) -> Optional[str]:
        """Validate tax ID format if provided."""
        if not v:
            return v
        from app.modules.customers.validators import validate_tax_id
        country = info.data.get('country') if hasattr(info, 'data') else None
        try:
            validate_tax_id(v, country)
        except Exception as e:
            raise ValueError(str(e))
        return v
    
    @model_validator(mode='after')
    def validate_corporate_requirements(self):
        """Validate corporate customer requirements."""
        if self.customer_type == CustomerType.CORPORATE:
            from app.modules.customers.validators import validate_company_data
            try:
                validate_company_data(
                    self.company_name or "",
                    self.tax_id,
                    self.country
                )
            except Exception as e:
                raise ValueError(str(e))
        return self


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer."""

    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer."""

    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[\d\s\-\(\)]{7,20}$")
    customer_type: Optional[CustomerType] = None
    company_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    status: Optional[CustomerStatus] = None


class CustomerResponse(CustomerBase):
    """Schema for customer response."""

    id: str = Field(..., description="Customer unique identifier")
    status: CustomerStatus = Field(..., description="Customer account status")
    approval_status: ApprovalStatus = Field(..., description="Customer approval status")
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


class CustomerStatistics(BaseModel):
    """Schema for customer statistics."""

    total: int = Field(..., description="Total number of customers")
    active: int = Field(..., description="Number of active customers")
    pending: int = Field(..., description="Number of pending customers")
    suspended: int = Field(..., description="Number of suspended customers")
    inactive: int = Field(0, description="Number of inactive customers")

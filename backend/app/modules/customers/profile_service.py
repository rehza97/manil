"""Customer profile service for completeness tracking."""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerType
from app.modules.customers.kyc_service import KYCService
from pydantic import BaseModel, Field


class ProfileCompleteness(BaseModel):
    """Profile completeness information."""
    customer_id: str
    completeness_percentage: float = Field(..., ge=0, le=100)
    base_info_score: float = Field(..., ge=0, le=30)
    address_score: float = Field(..., ge=0, le=30)
    corporate_score: float = Field(..., ge=0, le=20)
    kyc_score: float = Field(..., ge=0, le=20)
    missing_fields: list[str] = Field(default_factory=list)


class CustomerProfileService:
    """Service for managing customer profile completeness."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db
        self.repository = CustomerRepository(db)
        self.kyc_service = KYCService(db)

    async def get_profile_completeness(self, customer_id: str) -> ProfileCompleteness:
        """
        Calculate profile completeness percentage.
        
        Scoring:
        - Base info (30%): name (10%), email (10%), phone (10%)
        - Address (30%): address (5%), city (5%), state (5%), country (10%), postal_code (5%)
        - Corporate (20%): company_name (10%), tax_id (10%) - only if corporate
        - KYC (20%): documents uploaded (10%), documents approved (10%)
        
        Args:
            customer_id: Customer ID
            
        Returns:
            ProfileCompleteness with percentage and breakdown
        """
        customer = await self.repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")
        
        missing_fields = []
        
        # Base information (30%)
        base_score = 0.0
        if customer.name:
            base_score += 10.0
        else:
            missing_fields.append("name")
        
        if customer.email:
            base_score += 10.0
        else:
            missing_fields.append("email")
        
        if customer.phone:
            base_score += 10.0
        else:
            missing_fields.append("phone")
        
        # Address information (30%)
        address_score = 0.0
        if customer.address:
            address_score += 5.0
        else:
            missing_fields.append("address")
        
        if customer.city:
            address_score += 5.0
        else:
            missing_fields.append("city")
        
        if customer.state:
            address_score += 5.0
        else:
            missing_fields.append("state")
        
        if customer.country:
            address_score += 10.0
        else:
            missing_fields.append("country")
        
        if customer.postal_code:
            address_score += 5.0
        else:
            missing_fields.append("postal_code")
        
        # Corporate information (20%) - only for corporate customers
        corporate_score = 0.0
        if customer.customer_type == CustomerType.CORPORATE:
            if customer.company_name:
                corporate_score += 10.0
            else:
                missing_fields.append("company_name")
            
            if customer.tax_id:
                corporate_score += 10.0
            else:
                missing_fields.append("tax_id")
        else:
            # Individual customers get full corporate score (not applicable)
            corporate_score = 20.0
        
        # KYC Documents (20%)
        kyc_score = 0.0
        try:
            kyc_status = await self.kyc_service.get_customer_kyc_status(customer_id)
            required_docs = len(kyc_status.required_documents)
            uploaded_docs = len([d for d in kyc_status.documents if d.status.value in ["pending", "approved", "under_review"]])
            approved_docs = len([d for d in kyc_status.documents if d.status.value == "approved"])
            
            if required_docs > 0:
                # 10% for uploading required documents
                upload_progress = min(uploaded_docs / required_docs, 1.0)
                kyc_score += 10.0 * upload_progress
                
                # 10% for approving required documents
                approval_progress = min(approved_docs / required_docs, 1.0)
                kyc_score += 10.0 * approval_progress
                
                # Add missing documents to missing_fields
                for missing_doc in kyc_status.missing_documents:
                    missing_fields.append(f"kyc_document_{missing_doc.value}")
        except Exception:
            # If KYC service fails, KYC score remains 0
            pass
        
        # Calculate total completeness
        total_score = base_score + address_score + corporate_score + kyc_score
        
        return ProfileCompleteness(
            customer_id=customer_id,
            completeness_percentage=round(total_score, 2),
            base_info_score=round(base_score, 2),
            address_score=round(address_score, 2),
            corporate_score=round(corporate_score, 2),
            kyc_score=round(kyc_score, 2),
            missing_fields=missing_fields,
        )

    async def get_missing_fields(self, customer_id: str) -> list[str]:
        """
        Get list of missing required fields for customer profile.
        
        Args:
            customer_id: Customer ID
            
        Returns:
            List of missing field names
        """
        completeness = await self.get_profile_completeness(customer_id)
        return completeness.missing_fields

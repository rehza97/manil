"""KYC Pydantic schemas for validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.modules.customers.kyc_models import KYCDocumentType, KYCStatus


class KYCDocumentUpload(BaseModel):
    """Schema for uploading KYC document."""

    document_type: KYCDocumentType = Field(
        ..., description="Type of KYC document"
    )
    document_number: Optional[str] = Field(
        None, max_length=100, description="Document number (optional)"
    )
    expires_at: Optional[datetime] = Field(
        None, description="Document expiration date (optional)"
    )
    notes: Optional[str] = Field(
        None, max_length=1000, description="Optional notes"
    )


class KYCDocumentUpdate(BaseModel):
    """Schema for updating KYC document metadata."""

    document_number: Optional[str] = Field(None, max_length=100)
    expires_at: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=1000)


class KYCVerificationAction(BaseModel):
    """Schema for verifying or rejecting KYC document."""

    status: KYCStatus = Field(
        ..., description="New status (approved/rejected)"
    )
    rejection_reason: Optional[str] = Field(
        None, max_length=500, description="Required if status is rejected"
    )
    notes: Optional[str] = Field(
        None, max_length=1000, description="Internal notes"
    )

    @field_validator("rejection_reason")
    @classmethod
    def validate_rejection_reason(cls, v, info):
        """Ensure rejection_reason is provided when status is REJECTED."""
        status = info.data.get("status")
        if status == KYCStatus.REJECTED and not v:
            raise ValueError("Rejection reason is required when rejecting a document")
        return v


class KYCDocumentResponse(BaseModel):
    """Schema for KYC document response."""

    id: str
    customer_id: str
    document_type: KYCDocumentType
    document_number: Optional[str]
    file_name: str
    file_size: int
    mime_type: str
    status: KYCStatus
    verified_at: Optional[datetime]
    verified_by: Optional[str]
    rejection_reason: Optional[str]
    notes: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: str

    model_config = ConfigDict(from_attributes=True)


class KYCDocumentListResponse(BaseModel):
    """Schema for paginated KYC document list."""

    data: list[KYCDocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class KYCStatusSummary(BaseModel):
    """Schema for KYC status summary of a customer."""

    customer_id: str
    total_documents: int
    pending_documents: int
    approved_documents: int
    rejected_documents: int
    under_review_documents: int
    expired_documents: int
    overall_status: str  # "complete", "incomplete", "pending_review"
    can_activate: bool  # Whether customer can be activated


class CustomerKYCStatus(BaseModel):
    """Schema for customer's complete KYC status."""

    customer_id: str
    kyc_status: str  # "not_submitted", "pending", "approved", "rejected"
    documents: list[KYCDocumentResponse]
    summary: KYCStatusSummary
    required_documents: list[KYCDocumentType]
    missing_documents: list[KYCDocumentType]

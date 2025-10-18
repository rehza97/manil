"""KYC API router for document upload and verification endpoints."""

from fastapi import APIRouter, Depends, File, UploadFile, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.customers.kyc_service import KYCService
from app.modules.customers.kyc_schemas import (
    KYCDocumentUpload,
    KYCDocumentUpdate,
    KYCVerificationAction,
    KYCDocumentResponse,
    KYCStatusSummary,
    CustomerKYCStatus,
)
from app.modules.customers.kyc_models import KYCDocumentType, KYCStatus

router = APIRouter(prefix="/customers", tags=["KYC"])


@router.post(
    "/{customer_id}/kyc/documents",
    response_model=KYCDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_kyc_document(
    customer_id: str,
    file: UploadFile = File(..., description="KYC document file (PDF, JPEG, PNG)"),
    document_type: KYCDocumentType = Form(...),
    document_number: str | None = Form(None),
    notes: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_UPLOAD)),
):
    """Upload a new KYC document for a customer."""
    service = KYCService(db)

    # Create document upload data
    document_data = KYCDocumentUpload(
        document_type=document_type,
        document_number=document_number,
        notes=notes,
    )

    return await service.upload_document(
        customer_id=customer_id,
        file=file,
        document_data=document_data,
        uploaded_by=current_user.id,
    )


@router.get(
    "/{customer_id}/kyc/documents",
    response_model=list[KYCDocumentResponse],
)
async def get_customer_kyc_documents(
    customer_id: str,
    status_filter: KYCStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_VIEW)),
):
    """Get all KYC documents for a customer."""
    service = KYCService(db)
    return await service.get_customer_documents(customer_id, status_filter)


@router.get(
    "/{customer_id}/kyc/documents/{document_id}",
    response_model=KYCDocumentResponse,
)
async def get_kyc_document(
    customer_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_VIEW)),
):
    """Get specific KYC document by ID."""
    service = KYCService(db)
    return await service.get_document(document_id)


@router.get(
    "/{customer_id}/kyc/documents/{document_id}/download",
    response_class=FileResponse,
)
async def download_kyc_document(
    customer_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_DOWNLOAD)),
):
    """Download a KYC document file."""
    service = KYCService(db)
    file_path, file_name, mime_type = await service.get_document_file_path(document_id)

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type=mime_type,
    )


@router.put(
    "/{customer_id}/kyc/documents/{document_id}",
    response_model=KYCDocumentResponse,
)
async def update_kyc_document(
    customer_id: str,
    document_id: str,
    document_data: KYCDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_EDIT)),
):
    """Update KYC document metadata."""
    service = KYCService(db)
    return await service.update_document(
        document_id=document_id,
        document_data=document_data,
        updated_by=current_user.id,
    )


@router.post(
    "/{customer_id}/kyc/documents/{document_id}/verify",
    response_model=KYCDocumentResponse,
)
async def verify_kyc_document(
    customer_id: str,
    document_id: str,
    verification: KYCVerificationAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_VERIFY)),
):
    """Verify or reject a KYC document (admin/corporate only)."""
    service = KYCService(db)
    return await service.verify_document(
        document_id=document_id,
        verification=verification,
        verified_by=current_user.id,
    )


@router.delete(
    "/{customer_id}/kyc/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_kyc_document(
    customer_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_DELETE)),
):
    """Delete a KYC document."""
    service = KYCService(db)
    await service.delete_document(
        document_id=document_id,
        deleted_by=current_user.id,
    )


@router.get(
    "/{customer_id}/kyc/summary",
    response_model=KYCStatusSummary,
)
async def get_kyc_summary(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_VIEW)),
):
    """Get KYC status summary for a customer."""
    service = KYCService(db)
    return await service.get_kyc_summary(customer_id)


@router.get(
    "/{customer_id}/kyc/status",
    response_model=CustomerKYCStatus,
)
async def get_customer_kyc_status(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.KYC_VIEW)),
):
    """Get complete KYC status for a customer including missing documents."""
    service = KYCService(db)
    return await service.get_customer_kyc_status(customer_id)

"""KYC service containing ALL business logic for document verification."""

import os
from typing import Optional
from datetime import datetime, timezone
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ForbiddenException,
)
from app.modules.customers.kyc_repository import KYCRepository
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.kyc_models import KYCDocument, KYCStatus, KYCDocumentType
from app.modules.customers.kyc_schemas import (
    KYCDocumentUpload,
    KYCDocumentUpdate,
    KYCVerificationAction,
    KYCStatusSummary,
    CustomerKYCStatus,
)
from app.infrastructure.storage.service import StorageService
from app.config.settings import get_settings

settings = get_settings()


class KYCService:
    """KYC business logic service."""

    # Required documents for corporate customers
    REQUIRED_CORPORATE_DOCS = {
        KYCDocumentType.BUSINESS_REGISTRATION,
        KYCDocumentType.TAX_CERTIFICATE,
    }

    # Required documents for individual customers
    REQUIRED_INDIVIDUAL_DOCS = {
        KYCDocumentType.NATIONAL_ID,
        KYCDocumentType.PROOF_OF_ADDRESS,
    }

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = KYCRepository(db)
        self.customer_repository = CustomerRepository(db)
        self.storage = StorageService()
        self.settings = settings

    async def upload_document(
        self,
        customer_id: str,
        file: UploadFile,
        document_data: KYCDocumentUpload,
        uploaded_by: str,
    ) -> KYCDocument:
        """
        Upload and store KYC document.

        Business rules:
        - File type must be allowed (PDF, JPEG, PNG)
        - File size must not exceed 10MB
        - Customer must exist
        - Transaction safety: File is deleted if database operation fails
        """
        # Verify customer exists
        customer = await self.customer_repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        # Check for duplicate document
        has_existing = await self.repository.has_existing_document(
            customer_id=customer_id,
            document_type=document_data.document_type,
        )
        if has_existing:
            raise ValidationException(
                f"Customer already has an active {document_data.document_type.value} document. "
                "Please delete or replace the existing document first."
            )

        # Validate file extension
        if file.filename:
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in self.settings.KYC_ALLOWED_EXTENSIONS:
                raise ValidationException(
                    f"Invalid file extension. Allowed extensions: {', '.join(self.settings.KYC_ALLOWED_EXTENSIONS)}"
                )

        # Validate file type (MIME type)
        if file.content_type not in self.settings.KYC_ALLOWED_MIME_TYPES:
            raise ValidationException(
                f"Invalid file type. Allowed types: {', '.join(self.settings.KYC_ALLOWED_MIME_TYPES)}"
            )

        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)
        if file_size > self.settings.KYC_MAX_FILE_SIZE:
            raise ValidationException(
                f"File size exceeds maximum allowed size of {self.settings.KYC_MAX_FILE_SIZE / 1024 / 1024}MB"
            )

        # Validate expiry date if provided
        if document_data.expires_at:
            if document_data.expires_at <= datetime.now(timezone.utc):
                raise ValidationException(
                    "Document expiry date must be in the future"
                )

        file_path = None
        try:
            # Store file
            file_path = self.storage.save_kyc_document(
                customer_id=customer_id,
                file_content=file_content,
                filename=file.filename or "document",
                content_type=file.content_type,
            )

            # Create database record
            document = await self.repository.create(
                customer_id=customer_id,
                document_data=document_data,
                file_path=file_path,
                file_name=file.filename or "document",
                file_size=file_size,
                mime_type=file.content_type,
                created_by=uploaded_by,
            )

            return document

        except Exception as e:
            # If database operation fails, delete the uploaded file
            if file_path:
                try:
                    self.storage.delete_file(file_path)
                except Exception:
                    # Log but don't fail if file deletion fails
                    pass
            raise e

    async def get_document(self, document_id: str) -> KYCDocument:
        """Get KYC document by ID."""
        document = await self.repository.get_by_id(document_id)
        if not document:
            raise NotFoundException(f"KYC document {document_id} not found")
        return document

    async def get_customer_documents(
        self,
        customer_id: str,
        status: Optional[KYCStatus] = None,
    ) -> list[KYCDocument]:
        """Get all KYC documents for a customer."""
        return await self.repository.get_by_customer(customer_id, status)

    async def update_document(
        self,
        document_id: str,
        document_data: KYCDocumentUpdate,
        updated_by: str,
    ) -> KYCDocument:
        """Update KYC document metadata."""
        document = await self.get_document(document_id)
        return await self.repository.update(document, document_data, updated_by)

    async def verify_document(
        self,
        document_id: str,
        verification: KYCVerificationAction,
        verified_by: str,
    ) -> KYCDocument:
        """
        Verify or reject a KYC document.

        Business rules:
        - Only pending or under_review documents can be verified
        - Rejection must include a reason
        """
        document = await self.get_document(document_id)

        # Check if document can be verified
        if document.status not in [KYCStatus.PENDING, KYCStatus.UNDER_REVIEW]:
            raise ValidationException(
                f"Cannot verify document with status {document.status}"
            )

        return await self.repository.verify(
            document=document,
            status=verification.status,
            verified_by=verified_by,
            rejection_reason=verification.rejection_reason,
            notes=verification.notes,
        )

    async def delete_document(
        self,
        document_id: str,
        deleted_by: str,
    ) -> None:
        """Delete a KYC document."""
        document = await self.get_document(document_id)
        await self.repository.delete(document, deleted_by)

        # Optionally delete file from storage
        try:
            self.storage.delete_file(document.file_path)
        except Exception:
            # Log but don't fail if file deletion fails
            pass

    async def get_kyc_summary(self, customer_id: str) -> KYCStatusSummary:
        """Get KYC status summary for a customer."""
        total = await self.repository.count_by_status(customer_id)
        pending = await self.repository.count_by_status(customer_id, KYCStatus.PENDING)
        approved = await self.repository.count_by_status(customer_id, KYCStatus.APPROVED)
        rejected = await self.repository.count_by_status(customer_id, KYCStatus.REJECTED)
        under_review = await self.repository.count_by_status(customer_id, KYCStatus.UNDER_REVIEW)
        expired = await self.repository.count_by_status(customer_id, KYCStatus.EXPIRED)

        # Determine overall status
        if total == 0:
            overall_status = "incomplete"
        elif pending > 0 or under_review > 0:
            overall_status = "pending_review"
        elif approved >= 2:  # At least 2 documents approved
            overall_status = "complete"
        else:
            overall_status = "incomplete"

        # Customer can be activated if they have at least 2 approved documents
        can_activate = approved >= 2

        return KYCStatusSummary(
            customer_id=customer_id,
            total_documents=total,
            pending_documents=pending,
            approved_documents=approved,
            rejected_documents=rejected,
            under_review_documents=under_review,
            expired_documents=expired,
            overall_status=overall_status,
            can_activate=can_activate,
        )

    async def get_document_file_path(self, document_id: str) -> tuple[str, str, str]:
        """
        Get file path for downloading a KYC document.

        Returns:
            Tuple of (file_path, file_name, mime_type)
        """
        document = await self.get_document(document_id)

        # Get absolute file path
        file_path = self.storage.get_file_path(document.file_path)

        if not file_path.exists():
            raise NotFoundException(f"Document file not found: {document.file_path}")

        return str(file_path), document.file_name, document.mime_type

    async def check_and_mark_expired_documents(self) -> int:
        """
        Check for expired documents and mark them as expired.

        This method should be called periodically (e.g., via cron job or scheduler).

        Returns:
            Number of documents marked as expired
        """
        expired_docs = await self.repository.get_expired_documents()
        count = 0

        for doc in expired_docs:
            await self.repository.mark_as_expired(doc)
            count += 1

        return count

    async def get_customer_kyc_status(self, customer_id: str) -> CustomerKYCStatus:
        """Get complete KYC status for a customer including missing documents."""
        customer = await self.customer_repository.get_by_id(customer_id)
        if not customer:
            raise NotFoundException(f"Customer {customer_id} not found")

        documents = await self.get_customer_documents(customer_id)
        summary = await self.get_kyc_summary(customer_id)

        # Determine required documents based on customer type
        from app.modules.customers.schemas import CustomerType
        if customer.customer_type == CustomerType.CORPORATE:
            required_docs = list(self.REQUIRED_CORPORATE_DOCS)
        else:
            required_docs = list(self.REQUIRED_INDIVIDUAL_DOCS)

        # Find missing documents
        uploaded_types = {doc.document_type for doc in documents}
        missing_docs = [doc_type for doc_type in required_docs if doc_type not in uploaded_types]

        # Determine overall KYC status
        if not documents:
            kyc_status = "not_submitted"
        elif summary.pending_documents > 0 or summary.under_review_documents > 0:
            kyc_status = "pending"
        elif summary.approved_documents >= len(required_docs):
            kyc_status = "approved"
        elif summary.rejected_documents > 0:
            kyc_status = "rejected"
        else:
            kyc_status = "not_submitted"

        return CustomerKYCStatus(
            customer_id=customer_id,
            kyc_status=kyc_status,
            documents=[doc for doc in documents],
            summary=summary,
            required_documents=required_docs,
            missing_documents=missing_docs,
        )

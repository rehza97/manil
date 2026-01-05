"""KYC repository for data access layer - ONLY database operations."""

from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select, func, and_, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.kyc_models import KYCDocument, KYCStatus, KYCDocumentType
from app.modules.customers.kyc_schemas import KYCDocumentUpload, KYCDocumentUpdate


class KYCRepository:
    """KYC data access layer."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        customer_id: str,
        document_data: KYCDocumentUpload,
        file_path: str,
        file_name: str,
        file_size: int,
        mime_type: str,
        created_by: str,
    ) -> KYCDocument:
        """Create a new KYC document record."""
        document = KYCDocument(
            customer_id=customer_id,
            document_type=document_data.document_type,
            document_number=document_data.document_number,
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            expires_at=document_data.expires_at,
            notes=document_data.notes,
            created_by=created_by,
            status=KYCStatus.PENDING,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def get_by_id(self, document_id: str) -> Optional[KYCDocument]:
        """Get KYC document by ID."""
        query = select(KYCDocument).where(
            and_(
                KYCDocument.id == document_id,
                KYCDocument.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_customer(
        self,
        customer_id: str,
        status: Optional[KYCStatus] = None,
    ) -> list[KYCDocument]:
        """Get all KYC documents for a customer."""
        query = select(KYCDocument).where(
            and_(
                KYCDocument.customer_id == customer_id,
                KYCDocument.deleted_at.is_(None)
            )
        )

        if status:
            # Cast enum to string and compare with enum value to bypass SQLAlchemy's enum binding issue
            query = query.where(cast(KYCDocument.status, String) == status.value)

        query = query.order_by(KYCDocument.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(
        self,
        document: KYCDocument,
        document_data: KYCDocumentUpdate,
        updated_by: str,
    ) -> KYCDocument:
        """Update KYC document metadata."""
        update_data = document_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(document, field, value)

        document.updated_by = updated_by
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def verify(
        self,
        document: KYCDocument,
        status: KYCStatus,
        verified_by: str,
        rejection_reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> KYCDocument:
        """Verify or reject a KYC document."""
        document.status = status
        document.verified_by = verified_by
        document.verified_at = datetime.utcnow()
        document.rejection_reason = rejection_reason
        if notes:
            document.notes = notes
        document.updated_by = verified_by

        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def delete(self, document: KYCDocument, deleted_by: str) -> None:
        """Soft delete KYC document."""
        document.deleted_at = datetime.utcnow()
        document.deleted_by = deleted_by
        await self.db.commit()

    async def count_by_status(
        self,
        customer_id: str,
        status: Optional[KYCStatus] = None,
    ) -> int:
        """Count documents by status for a customer."""
        query = select(func.count()).where(
            and_(
                KYCDocument.customer_id == customer_id,
                KYCDocument.deleted_at.is_(None)
            )
        )

        if status:
            # Cast enum to string and compare with enum value to bypass SQLAlchemy's enum binding issue
            query = query.where(cast(KYCDocument.status, String) == status.value)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_expired_documents(self) -> list[KYCDocument]:
        """Get all expired documents that need status update."""
        now = datetime.utcnow()
        query = select(KYCDocument).where(
            and_(
                KYCDocument.expires_at < now,
                cast(KYCDocument.status, String) == KYCStatus.APPROVED.value,
                KYCDocument.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_as_expired(self, document: KYCDocument) -> KYCDocument:
        """Mark document as expired."""
        document.status = KYCStatus.EXPIRED
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def has_existing_document(
        self,
        customer_id: str,
        document_type: KYCDocumentType,
    ) -> bool:
        """
        Check if customer already has an active document of this type.

        Active means: PENDING, UNDER_REVIEW, or APPROVED status.
        """
        query = select(func.count()).where(
            and_(
                KYCDocument.customer_id == customer_id,
                KYCDocument.document_type == document_type,
                or_(
                    cast(KYCDocument.status, String) == KYCStatus.PENDING.value,
                    cast(KYCDocument.status, String) == KYCStatus.UNDER_REVIEW.value,
                    cast(KYCDocument.status, String) == KYCStatus.APPROVED.value
                ),
                KYCDocument.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(query)
        count = result.scalar() or 0
        return count > 0

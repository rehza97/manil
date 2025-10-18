"""Repository for customer notes and documents data access."""

from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.notes_models import CustomerNote, CustomerDocument, NoteType, DocumentCategory
from app.modules.customers.notes_schemas import (
    CustomerNoteCreate,
    CustomerNoteUpdate,
    CustomerDocumentUpload,
    CustomerDocumentUpdate,
)


class CustomerNoteRepository:
    """Data access layer for customer notes."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        customer_id: str,
        note_data: CustomerNoteCreate,
        created_by: str,
    ) -> CustomerNote:
        """Create a new customer note."""
        note = CustomerNote(
            customer_id=customer_id,
            note_type=note_data.note_type,
            title=note_data.title,
            content=note_data.content,
            is_pinned=note_data.is_pinned,
            created_by=created_by,
        )
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def get_by_id(self, note_id: str) -> Optional[CustomerNote]:
        """Get note by ID (excluding soft-deleted)."""
        query = select(CustomerNote).where(
            and_(
                CustomerNote.id == note_id,
                CustomerNote.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_customer(
        self,
        customer_id: str,
        note_type: Optional[NoteType] = None,
    ) -> list[CustomerNote]:
        """Get all notes for a customer."""
        query = select(CustomerNote).where(
            and_(
                CustomerNote.customer_id == customer_id,
                CustomerNote.deleted_at.is_(None)
            )
        )

        if note_type:
            query = query.where(CustomerNote.note_type == note_type)

        # Pinned notes first, then by creation date descending
        query = query.order_by(
            CustomerNote.is_pinned.desc(),
            CustomerNote.created_at.desc()
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(
        self,
        note: CustomerNote,
        note_data: CustomerNoteUpdate,
        updated_by: str,
    ) -> CustomerNote:
        """Update note."""
        update_data = note_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(note, field, value)

        note.updated_by = updated_by
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def delete(self, note: CustomerNote, deleted_by: str) -> None:
        """Soft delete note."""
        note.deleted_at = datetime.now(timezone.utc)
        note.deleted_by = deleted_by
        await self.db.commit()


class CustomerDocumentRepository:
    """Data access layer for customer documents."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        self.db = db

    async def create(
        self,
        customer_id: str,
        document_data: CustomerDocumentUpload,
        file_path: str,
        file_name: str,
        file_size: int,
        mime_type: str,
        created_by: str,
    ) -> CustomerDocument:
        """Create a new customer document."""
        document = CustomerDocument(
            customer_id=customer_id,
            category=document_data.category,
            title=document_data.title,
            description=document_data.description,
            file_path=file_path,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            created_by=created_by,
        )
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def get_by_id(self, document_id: str) -> Optional[CustomerDocument]:
        """Get document by ID (excluding soft-deleted)."""
        query = select(CustomerDocument).where(
            and_(
                CustomerDocument.id == document_id,
                CustomerDocument.deleted_at.is_(None)
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_customer(
        self,
        customer_id: str,
        category: Optional[DocumentCategory] = None,
    ) -> list[CustomerDocument]:
        """Get all documents for a customer."""
        query = select(CustomerDocument).where(
            and_(
                CustomerDocument.customer_id == customer_id,
                CustomerDocument.deleted_at.is_(None)
            )
        )

        if category:
            query = query.where(CustomerDocument.category == category)

        query = query.order_by(CustomerDocument.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(
        self,
        document: CustomerDocument,
        document_data: CustomerDocumentUpdate,
        updated_by: str,
    ) -> CustomerDocument:
        """Update document metadata."""
        update_data = document_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(document, field, value)

        document.updated_by = updated_by
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def delete(self, document: CustomerDocument, deleted_by: str) -> None:
        """Soft delete document."""
        document.deleted_at = datetime.now(timezone.utc)
        document.deleted_by = deleted_by
        await self.db.commit()

"""Service layer for customer notes and documents with business logic."""

import logging
from typing import Optional
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.modules.customers.notes_repository import CustomerNoteRepository, CustomerDocumentRepository
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.notes_models import CustomerNote, CustomerDocument, NoteType, DocumentCategory
from app.modules.customers.notes_schemas import (
    CustomerNoteCreate,
    CustomerNoteUpdate,
    CustomerDocumentUpload,
    CustomerDocumentUpdate,
)
from app.infrastructure.storage.service import StorageService
from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CustomerNoteService:
    """Business logic for customer notes."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = CustomerNoteRepository(db)
        self.customer_repository = CustomerRepository(db)

    async def create_note(
        self,
        customer_id: str,
        note_data: CustomerNoteCreate,
        created_by: str,
    ) -> CustomerNote:
        """Create a new customer note."""
        try:
            # Verify customer exists
            customer = await self.customer_repository.get_by_id(customer_id)
            if not customer:
                raise NotFoundException(f"Customer {customer_id} not found")

            note = await self.repository.create(customer_id, note_data, created_by)
            logger.info(f"Created note {note.id} for customer {customer_id} by user {created_by}")
            return note
        except Exception as e:
            logger.error(f"Failed to create note for customer {customer_id}: {e}", exc_info=True)
            raise

    async def get_note(self, note_id: str) -> CustomerNote:
        """Get note by ID."""
        note = await self.repository.get_by_id(note_id)
        if not note:
            raise NotFoundException(f"Note {note_id} not found")
        return note

    async def get_customer_notes(
        self,
        customer_id: str,
        note_type: Optional[NoteType] = None,
    ) -> list[CustomerNote]:
        """Get all notes for a customer."""
        try:
            return await self.repository.get_by_customer(customer_id, note_type)
        except Exception as e:
            logger.error(f"Failed to get notes for customer {customer_id}: {e}", exc_info=True)
            raise

    async def update_note(
        self,
        note_id: str,
        note_data: CustomerNoteUpdate,
        updated_by: str,
    ) -> CustomerNote:
        """Update note."""
        try:
            note = await self.get_note(note_id)
            result = await self.repository.update(note, note_data, updated_by)
            logger.info(f"Updated note {note_id} by user {updated_by}")
            return result
        except Exception as e:
            logger.error(f"Failed to update note {note_id}: {e}", exc_info=True)
            raise

    async def delete_note(
        self,
        note_id: str,
        deleted_by: str,
    ) -> None:
        """Delete note."""
        try:
            note = await self.get_note(note_id)
            await self.repository.delete(note, deleted_by)
            logger.info(f"Deleted note {note_id} by user {deleted_by}")
        except Exception as e:
            logger.error(f"Failed to delete note {note_id}: {e}", exc_info=True)
            raise


class CustomerDocumentService:
    """Business logic for customer documents."""

    # Allowed file types for documents
    ALLOWED_MIME_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "text/plain",
    ]

    # Maximum file size: 20MB
    MAX_FILE_SIZE = 20 * 1024 * 1024

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.repository = CustomerDocumentRepository(db)
        self.customer_repository = CustomerRepository(db)
        self.storage = StorageService()

    async def upload_document(
        self,
        customer_id: str,
        file: UploadFile,
        document_data: CustomerDocumentUpload,
        uploaded_by: str,
    ) -> CustomerDocument:
        """Upload a customer document."""
        try:
            # Verify customer exists
            customer = await self.customer_repository.get_by_id(customer_id)
            if not customer:
                raise NotFoundException(f"Customer {customer_id} not found")

            # Validate file type
            if file.content_type not in self.ALLOWED_MIME_TYPES:
                raise ValidationException(
                    f"Invalid file type. Allowed types: {', '.join(self.ALLOWED_MIME_TYPES)}"
                )

            # Validate file size
            file_content = await file.read()
            file_size = len(file_content)
            if file_size > self.MAX_FILE_SIZE:
                raise ValidationException(
                    f"File size exceeds maximum allowed size of {self.MAX_FILE_SIZE / 1024 / 1024}MB"
                )

            file_path = None
            try:
                # Store file in documents category
                from io import BytesIO
                file_obj = BytesIO(file_content)
                file_path = self.storage.save_file(
                    file_obj,
                    file.filename or "document",
                    category="documents"
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

                logger.info(f"Uploaded document {document.id} for customer {customer_id} by user {uploaded_by}")
                return document

            except Exception as e:
                # Rollback: delete file if DB failed
                if file_path:
                    try:
                        self.storage.delete_file(file_path)
                    except:
                        pass
                raise e

        except Exception as e:
            logger.error(f"Failed to upload document for customer {customer_id}: {e}", exc_info=True)
            raise

    async def get_document(self, document_id: str) -> CustomerDocument:
        """Get document by ID."""
        document = await self.repository.get_by_id(document_id)
        if not document:
            raise NotFoundException(f"Document {document_id} not found")
        return document

    async def get_customer_documents(
        self,
        customer_id: str,
        category: Optional[DocumentCategory] = None,
    ) -> list[CustomerDocument]:
        """Get all documents for a customer."""
        try:
            return await self.repository.get_by_customer(customer_id, category)
        except Exception as e:
            logger.error(f"Failed to get documents for customer {customer_id}: {e}", exc_info=True)
            raise

    async def get_document_file_path(self, document_id: str) -> tuple[str, str, str]:
        """Get file path for downloading a document."""
        document = await self.get_document(document_id)

        # Get absolute file path
        file_path = self.storage.get_file_path(document.file_path)

        if not file_path.exists():
            raise NotFoundException(f"Document file not found: {document.file_path}")

        return str(file_path), document.file_name, document.mime_type

    async def update_document(
        self,
        document_id: str,
        document_data: CustomerDocumentUpdate,
        updated_by: str,
    ) -> CustomerDocument:
        """Update document metadata."""
        try:
            document = await self.get_document(document_id)
            result = await self.repository.update(document, document_data, updated_by)
            logger.info(f"Updated document {document_id} by user {updated_by}")
            return result
        except Exception as e:
            logger.error(f"Failed to update document {document_id}: {e}", exc_info=True)
            raise

    async def delete_document(
        self,
        document_id: str,
        deleted_by: str,
    ) -> None:
        """Delete document."""
        try:
            document = await self.get_document(document_id)
            await self.repository.delete(document, deleted_by)

            # Optionally delete file from storage
            try:
                self.storage.delete_file(document.file_path)
            except Exception:
                # Log but don't fail if file deletion fails
                pass

            logger.info(f"Deleted document {document_id} by user {deleted_by}")
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}", exc_info=True)
            raise

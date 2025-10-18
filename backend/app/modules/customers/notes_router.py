"""API router for customer notes and documents."""

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.customers.notes_service import CustomerNoteService, CustomerDocumentService
from app.modules.customers.notes_schemas import (
    CustomerNoteCreate,
    CustomerNoteUpdate,
    CustomerNoteResponse,
    CustomerDocumentUpload,
    CustomerDocumentUpdate,
    CustomerDocumentResponse,
)
from app.modules.customers.notes_models import NoteType, DocumentCategory

router = APIRouter(prefix="/customers", tags=["Customer Notes & Documents"])


# ============================================================================
# Customer Notes Endpoints
# ============================================================================

@router.post(
    "/{customer_id}/notes",
    response_model=CustomerNoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_customer_note(
    customer_id: str,
    note_data: CustomerNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_EDIT)),
):
    """Create a new note for a customer."""
    service = CustomerNoteService(db)
    return await service.create_note(
        customer_id=customer_id,
        note_data=note_data,
        created_by=current_user.id,
    )


@router.get(
    "/{customer_id}/notes",
    response_model=list[CustomerNoteResponse],
)
async def get_customer_notes(
    customer_id: str,
    note_type: NoteType | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Get all notes for a customer."""
    service = CustomerNoteService(db)
    return await service.get_customer_notes(customer_id, note_type)


@router.get(
    "/{customer_id}/notes/{note_id}",
    response_model=CustomerNoteResponse,
)
async def get_customer_note(
    customer_id: str,
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Get a specific note by ID."""
    service = CustomerNoteService(db)
    return await service.get_note(note_id)


@router.put(
    "/{customer_id}/notes/{note_id}",
    response_model=CustomerNoteResponse,
)
async def update_customer_note(
    customer_id: str,
    note_id: str,
    note_data: CustomerNoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_EDIT)),
):
    """Update a customer note."""
    service = CustomerNoteService(db)
    return await service.update_note(
        note_id=note_id,
        note_data=note_data,
        updated_by=current_user.id,
    )


@router.delete(
    "/{customer_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_customer_note(
    customer_id: str,
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_DELETE)),
):
    """Delete a customer note."""
    service = CustomerNoteService(db)
    await service.delete_note(
        note_id=note_id,
        deleted_by=current_user.id,
    )


# ============================================================================
# Customer Documents Endpoints
# ============================================================================

@router.post(
    "/{customer_id}/documents",
    response_model=CustomerDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_customer_document(
    customer_id: str,
    file: UploadFile = File(..., description="Document file to upload"),
    category: DocumentCategory = DocumentCategory.OTHER,
    title: str = "Untitled Document",
    description: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_EDIT)),
):
    """Upload a new document for a customer."""
    service = CustomerDocumentService(db)

    # Create document metadata
    document_data = CustomerDocumentUpload(
        category=category,
        title=title,
        description=description,
    )

    return await service.upload_document(
        customer_id=customer_id,
        file=file,
        document_data=document_data,
        uploaded_by=current_user.id,
    )


@router.get(
    "/{customer_id}/documents",
    response_model=list[CustomerDocumentResponse],
)
async def get_customer_documents(
    customer_id: str,
    category: DocumentCategory | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Get all documents for a customer."""
    service = CustomerDocumentService(db)
    return await service.get_customer_documents(customer_id, category)


@router.get(
    "/{customer_id}/documents/{document_id}",
    response_model=CustomerDocumentResponse,
)
async def get_customer_document(
    customer_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Get a specific document by ID."""
    service = CustomerDocumentService(db)
    return await service.get_document(document_id)


@router.get(
    "/{customer_id}/documents/{document_id}/download",
    response_class=FileResponse,
)
async def download_customer_document(
    customer_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_VIEW)),
):
    """Download a customer document file."""
    service = CustomerDocumentService(db)
    file_path, file_name, mime_type = await service.get_document_file_path(document_id)

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type=mime_type,
    )


@router.put(
    "/{customer_id}/documents/{document_id}",
    response_model=CustomerDocumentResponse,
)
async def update_customer_document(
    customer_id: str,
    document_id: str,
    document_data: CustomerDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_EDIT)),
):
    """Update document metadata."""
    service = CustomerDocumentService(db)
    return await service.update_document(
        document_id=document_id,
        document_data=document_data,
        updated_by=current_user.id,
    )


@router.delete(
    "/{customer_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_customer_document(
    customer_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.CUSTOMERS_DELETE)),
):
    """Delete a customer document."""
    service = CustomerDocumentService(db)
    await service.delete_document(
        document_id=document_id,
        deleted_by=current_user.id,
    )

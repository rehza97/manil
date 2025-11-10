"""Ticket attachment API endpoints."""
from fastapi import APIRouter, Depends, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.exceptions import NotFoundException
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.tickets.attachments import AttachmentResponse
from app.modules.tickets.attachment_service import TicketAttachmentService

router = APIRouter(prefix="/tickets", tags=["ticket-attachments"])


@router.post(
    "/{ticket_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload ticket attachment",
)
async def upload_ticket_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    reply_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_REPLY")),
):
    """
    Upload file attachment to ticket or reply.

    Args:
        ticket_id: Ticket ID
        file: File to upload
        reply_id: Optional reply ID to attach file to
    """
    try:
        service = TicketAttachmentService(db)

        # Read file content
        file_content = await file.read()

        # Upload attachment
        attachment = await service.upload_attachment(
            ticket_id=ticket_id,
            reply_id=reply_id,
            file_content=file_content,
            filename=file.filename,
            mime_type=file.content_type or "application/octet-stream",
            uploaded_by=current_user.id,
        )

        return attachment

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise NotFoundException(str(e))
    except Exception as e:
        logger.error(f"Failed to upload attachment: {str(e)}")
        raise


@router.get(
    "/{ticket_id}/attachments",
    response_model=list[AttachmentResponse],
    summary="List ticket attachments",
)
async def list_ticket_attachments(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """List all attachments for a ticket."""
    service = TicketAttachmentService(db)
    attachments = await service.list_ticket_attachments(ticket_id)
    return attachments


@router.get(
    "/{ticket_id}/attachments/{attachment_id}",
    response_model=AttachmentResponse,
    summary="Get attachment details",
)
async def get_attachment_details(
    ticket_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get attachment details."""
    service = TicketAttachmentService(db)
    attachment = await service.get_attachment(attachment_id)

    if not attachment or attachment.ticket_id != ticket_id:
        raise NotFoundException(f"Attachment {attachment_id} not found")

    return attachment


@router.get(
    "/{ticket_id}/attachments/{attachment_id}/download",
    summary="Download attachment file",
)
async def download_attachment(
    ticket_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Download attachment file."""
    service = TicketAttachmentService(db)
    attachment = await service.get_attachment(attachment_id)

    if not attachment or attachment.ticket_id != ticket_id:
        raise NotFoundException(f"Attachment {attachment_id} not found")

    # Download file
    file_content, mime_type = await service.download_attachment(
        attachment_id, current_user.id
    )

    return FileResponse(
        content=file_content,
        media_type=mime_type,
        filename=attachment.original_filename,
    )


@router.delete(
    "/{ticket_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete attachment",
)
async def delete_attachment(
    ticket_id: str,
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_REPLY")),
):
    """Delete (soft delete) attachment."""
    service = TicketAttachmentService(db)
    attachment = await service.get_attachment(attachment_id)

    if not attachment or attachment.ticket_id != ticket_id:
        raise NotFoundException(f"Attachment {attachment_id} not found")

    await service.delete_attachment(attachment_id, current_user.id)
    return None


@router.get(
    "/{ticket_id}/attachments/statistics",
    summary="Get attachment statistics",
)
async def get_attachment_statistics(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get attachment statistics for ticket."""
    service = TicketAttachmentService(db)
    stats = await service.get_attachment_statistics(ticket_id)
    return stats


@router.get(
    "/replies/{reply_id}/attachments",
    response_model=list[AttachmentResponse],
    summary="List reply attachments",
)
async def list_reply_attachments(
    reply_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """List all attachments for a reply."""
    service = TicketAttachmentService(db)
    attachments = await service.list_reply_attachments(reply_id)
    return attachments

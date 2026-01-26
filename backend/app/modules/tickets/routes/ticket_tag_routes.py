"""API routes for assigning tags to tickets."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permission
from app.core.exceptions import NotFoundException, ConflictException
from app.core.permissions import Permission
from app.modules.tickets.services.tag_service import TagService
from app.modules.tickets.schemas import TagResponse, TicketTagAssignment

router = APIRouter(prefix="/tickets/{ticket_id}/tags", tags=["ticket-tags"])


@router.post("", status_code=204)
def assign_tag(
    ticket_id: str,
    tag_data: TicketTagAssignment,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_REPLY)),
):
    """Assign tags to a ticket.

    Requires: TICKETS_REPLY permission
    """
    try:
        for tag_id in tag_data.tag_ids:
            TagService.assign_tag_to_ticket(db, ticket_id, tag_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{tag_id}", status_code=204)
def remove_tag(
    ticket_id: str,
    tag_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_REPLY)),
):
    """Remove a tag from a ticket.

    Requires: TICKETS_REPLY permission
    """
    try:
        TagService.remove_tag_from_ticket(db, ticket_id, tag_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=list[TagResponse])
def get_ticket_tags(
    ticket_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get all tags for a ticket.

    Requires: TICKETS_VIEW permission
    """
    return TagService.get_ticket_tags(db, ticket_id)

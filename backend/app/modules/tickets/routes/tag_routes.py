"""API routes for ticket tag management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permission, get_current_user
from app.core.exceptions import NotFoundException, ConflictException, ValidationException
from app.core.permissions import Permission
from app.modules.tickets.services.tag_service import TagService
from app.modules.tickets.schemas import TagCreate, TagUpdate, TagResponse, TicketTagAssignment

router = APIRouter(prefix="/tags", tags=["tags"])


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission(Permission.TICKETS_MANAGE)),
):
    """Create a new tag.

    Requires: TICKETS_MANAGE permission
    """
    try:
        return TagService.create_tag(db, tag_data, current_user["id"])
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(
    tag_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get a tag by ID.

    Requires: TICKETS_VIEW permission
    """
    try:
        return TagService.get_tag(db, tag_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=dict)
def list_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: str = Query(None, min_length=1),
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """List all tags with pagination and search.

    Requires: TICKETS_VIEW permission
    """
    tags, total_count = TagService.list_tags(db, skip, limit, search)
    return {
        "data": tags,
        "total": total_count,
        "skip": skip,
        "limit": limit,
    }


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: str,
    tag_data: TagUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_MANAGE)),
):
    """Update a tag.

    Requires: TICKETS_MANAGE permission
    """
    try:
        return TagService.update_tag(db, tag_id, tag_data)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_MANAGE)),
):
    """Delete a tag.

    Requires: TICKETS_MANAGE permission
    """
    try:
        TagService.delete_tag(db, tag_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{tag_id}/statistics", response_model=dict)
def get_tag_statistics(
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get tag statistics.

    Requires: TICKETS_VIEW permission
    """
    return TagService.get_tag_statistics(db)

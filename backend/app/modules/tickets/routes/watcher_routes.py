"""API routes for ticket watcher management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permission, get_current_user
from app.core.exceptions import NotFoundException, ConflictException
from app.modules.tickets.services.watcher_service import WatcherService
from app.modules.tickets.schemas import (
    WatcherCreate,
    WatcherResponse,
    WatcherNotificationPreferences,
    TicketWatcherList,
)

router = APIRouter(prefix="/tickets/{ticket_id}/watchers", tags=["watchers"])


@router.post("", response_model=WatcherResponse, status_code=201)
def add_watcher(
    ticket_id: str,
    watcher_data: WatcherCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("TICKETS_MANAGE")),
):
    """Add a watcher to a ticket.

    Requires: TICKETS_MANAGE permission
    """
    try:
        return WatcherService.add_watcher(db, ticket_id, watcher_data)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("", response_model=TicketWatcherList)
def get_ticket_watchers(
    ticket_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("TICKETS_VIEW")),
):
    """Get all watchers for a ticket.

    Requires: TICKETS_VIEW permission
    """
    return WatcherService.get_ticket_watchers(db, ticket_id, skip, limit)


@router.delete("/{user_id}", status_code=204)
def remove_watcher(
    ticket_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("TICKETS_MANAGE")),
):
    """Remove a watcher from a ticket.

    Requires: TICKETS_MANAGE permission
    """
    try:
        WatcherService.remove_watcher(db, ticket_id, user_id)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{user_id}/preferences", response_model=WatcherResponse)
def update_watcher_preferences(
    ticket_id: str,
    user_id: str,
    preferences: WatcherNotificationPreferences,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update watcher notification preferences.

    Note: Users can only update their own preferences, admins can update any
    """
    # Check if user is updating their own preferences or is an admin
    if current_user["id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        return WatcherService.update_watcher_preferences(
            db, ticket_id, user_id, preferences
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{user_id}/is-watching", response_model=dict)
def is_user_watching(
    ticket_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Check if a user is watching a ticket.

    Note: Users can only check themselves, admins can check any user
    """
    if current_user["id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    is_watching = WatcherService.is_watching(db, ticket_id, user_id)
    return {"is_watching": is_watching}


@router.get("/statistics", response_model=dict)
def get_watcher_statistics(
    ticket_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("TICKETS_VIEW")),
):
    """Get watcher statistics for a ticket.

    Requires: TICKETS_VIEW permission
    """
    return WatcherService.get_watcher_statistics(db, ticket_id)

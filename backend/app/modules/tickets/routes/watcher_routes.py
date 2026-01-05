"""API routes for ticket watcher management."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.config.database import get_db
from app.core.exceptions import ConflictException, NotFoundException
from app.modules.auth.models import User
from app.modules.tickets.models import Ticket, TicketWatcher
from app.modules.tickets.schemas import (
    TicketWatcherList,
    WatcherCreate,
    WatcherNotificationPreferences,
    WatcherResponse,
)

# NOTE:
# This router is included inside `app.modules.tickets.router` which already has prefix `/tickets`.
# So this router prefix MUST be relative to that, otherwise we end up with `/tickets/tickets/...` and 404s.
router = APIRouter(prefix="/{ticket_id}/watchers", tags=["watchers"])


@router.post("", response_model=WatcherResponse, status_code=201)
async def add_watcher(
    ticket_id: str,
    watcher_data: WatcherCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_ASSIGN)),
):
    """Add a watcher to a ticket.

    Requires: TICKETS_MANAGE permission
    """
    try:
        # Verify ticket exists
        ticket_res = await db.execute(
            select(Ticket).where(and_(Ticket.id == ticket_id, Ticket.deleted_at.is_(None)))
        )
        ticket = ticket_res.scalar_one_or_none()
        if not ticket:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        # Check if already watching
        existing_res = await db.execute(
            select(TicketWatcher).where(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == watcher_data.user_id,
                )
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            raise ConflictException("User is already watching this ticket")

        preferences = watcher_data.preferences or WatcherNotificationPreferences()
        watcher = TicketWatcher(
            id=str(uuid4()),
            ticket_id=ticket_id,
            user_id=watcher_data.user_id,
            notify_on_reply=preferences.notify_on_reply,
            notify_on_status_change=preferences.notify_on_status_change,
            notify_on_assignment=preferences.notify_on_assignment,
        )

        db.add(watcher)
        await db.commit()
        await db.refresh(watcher)
        return WatcherResponse.model_validate(watcher)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("", response_model=TicketWatcherList)
async def get_ticket_watchers(
    ticket_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get all watchers for a ticket.

    Requires: TICKETS_VIEW permission
    """
    total_res = await db.execute(
        select(func.count()).select_from(TicketWatcher).where(TicketWatcher.ticket_id == ticket_id)
    )
    total_count = int(total_res.scalar() or 0)

    watchers_res = await db.execute(
        select(TicketWatcher)
        .where(TicketWatcher.ticket_id == ticket_id)
        .order_by(TicketWatcher.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    watchers = watchers_res.scalars().all()

    return TicketWatcherList(
        data=[WatcherResponse.model_validate(w) for w in watchers],
        total_count=total_count,
    )


@router.delete("/{user_id}", status_code=204)
async def remove_watcher(
    ticket_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_ASSIGN)),
):
    """Remove a watcher from a ticket.

    Requires: TICKETS_MANAGE permission
    """
    try:
        watcher_res = await db.execute(
            select(TicketWatcher).where(
                and_(TicketWatcher.ticket_id == ticket_id, TicketWatcher.user_id == user_id)
            )
        )
        watcher = watcher_res.scalar_one_or_none()
        if not watcher:
            raise NotFoundException("User is not watching this ticket")

        await db.delete(watcher)
        await db.commit()
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{user_id}/preferences", response_model=WatcherResponse)
async def update_watcher_preferences(
    ticket_id: str,
    user_id: str,
    preferences: WatcherNotificationPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update watcher notification preferences.

    Note: Users can only update their own preferences, admins can update any
    """
    role = getattr(current_user.role, "value", current_user.role)
    if current_user.id != user_id and role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        watcher_res = await db.execute(
            select(TicketWatcher).where(
                and_(TicketWatcher.ticket_id == ticket_id, TicketWatcher.user_id == user_id)
            )
        )
        watcher = watcher_res.scalar_one_or_none()
        if not watcher:
            raise NotFoundException("User is not watching this ticket")

        watcher.notify_on_reply = preferences.notify_on_reply
        watcher.notify_on_status_change = preferences.notify_on_status_change
        watcher.notify_on_assignment = preferences.notify_on_assignment
        await db.commit()
        await db.refresh(watcher)
        return WatcherResponse.model_validate(watcher)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{user_id}/is-watching", response_model=dict)
async def is_user_watching(
    ticket_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if a user is watching a ticket.

    Note: Users can only check themselves, admins can check any user
    """
    role = getattr(current_user.role, "value", current_user.role)
    if current_user.id != user_id and role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    watcher_res = await db.execute(
        select(TicketWatcher.id).where(
            and_(TicketWatcher.ticket_id == ticket_id, TicketWatcher.user_id == user_id)
        )
    )
    return {"is_watching": watcher_res.scalar_one_or_none() is not None}


@router.get("/statistics", response_model=dict)
async def get_watcher_statistics(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get watcher statistics for a ticket.

    Requires: TICKETS_VIEW permission
    """
    total_res = await db.execute(
        select(func.count()).select_from(TicketWatcher).where(TicketWatcher.ticket_id == ticket_id)
    )
    return {"ticket_id": ticket_id, "watchers": int(total_res.scalar() or 0)}

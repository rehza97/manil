"""
Email bounce management API routes.

Provides endpoints for viewing and managing email bounces.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_sync_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.notifications.services.bounce_service import BounceService
from app.modules.tickets.models import EmailBounce
from pydantic import BaseModel

router = APIRouter(prefix="/notifications/bounces", tags=["Email Bounces"])


class BounceResponse(BaseModel):
    """Email bounce response schema."""
    id: str
    email_address: str
    bounce_type: str
    bounce_reason: str
    bounce_timestamp: str
    is_invalid: bool
    retry_count: int
    last_retry_at: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class BounceListResponse(BaseModel):
    """Bounce list response schema."""
    items: list[BounceResponse]
    total: int


class BounceStatsResponse(BaseModel):
    """Bounce statistics response schema."""
    total: int
    permanent: int
    temporary: int
    invalid_count: int


@router.get("", response_model=BounceListResponse)
async def get_bounces(
    bounce_type: Optional[str] = None,
    is_invalid: Optional[bool] = None,
    limit: int = 100,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_BOUNCES)),
):
    """
    Get email bounce records with filtering.

    Requires EMAIL_BOUNCES permission.
    """
    bounces = BounceService.get_bounces(
        db=db,
        bounce_type=bounce_type,
        is_invalid=is_invalid,
        limit=limit,
    )
    
    return BounceListResponse(
        items=[BounceResponse.model_validate(bounce) for bounce in bounces],
        total=len(bounces),
    )


@router.post("/{bounce_id}/mark-valid")
async def mark_email_valid(
    bounce_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_BOUNCES)),
):
    """
    Mark an email address as valid (remove invalid flag).

    Requires EMAIL_BOUNCES permission.
    """
    from sqlalchemy import select
    from app.modules.tickets.models import EmailBounce
    
    bounce = db.execute(
        select(EmailBounce).where(EmailBounce.id == bounce_id)
    ).scalar_one_or_none()
    
    if not bounce:
        raise HTTPException(status_code=404, detail="Bounce record not found")
    
    success = BounceService.mark_email_valid(db, bounce.email_address)
    
    if success:
        return {"status": "success", "message": f"Email {bounce.email_address} marked as valid"}
    else:
        raise HTTPException(status_code=404, detail="Bounce record not found")


@router.delete("/{bounce_id}")
async def delete_bounce(
    bounce_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_BOUNCES)),
):
    """
    Delete a bounce record.

    Requires EMAIL_BOUNCES permission.
    """
    from sqlalchemy import select
    from app.modules.tickets.models import EmailBounce
    
    bounce = db.execute(
        select(EmailBounce).where(EmailBounce.id == bounce_id)
    ).scalar_one_or_none()
    
    if not bounce:
        raise HTTPException(status_code=404, detail="Bounce record not found")
    
    email_address = bounce.email_address
    db.delete(bounce)
    db.commit()
    
    return {"status": "success", "message": f"Bounce record for {email_address} deleted"}


@router.get("/stats", response_model=BounceStatsResponse)
async def get_bounce_stats(
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_BOUNCES)),
):
    """
    Get bounce statistics.

    Requires EMAIL_BOUNCES permission.
    """
    from sqlalchemy import select, func
    from app.modules.tickets.models import EmailBounce, EmailBounceType
    
    # Total bounces
    total_result = db.execute(select(func.count(EmailBounce.id)))
    total = total_result.scalar() or 0
    
    # Permanent bounces
    permanent_result = db.execute(
        select(func.count(EmailBounce.id)).where(
            EmailBounce.bounce_type == EmailBounceType.PERMANENT.value
        )
    )
    permanent = permanent_result.scalar() or 0
    
    # Temporary bounces
    temporary_result = db.execute(
        select(func.count(EmailBounce.id)).where(
            EmailBounce.bounce_type == EmailBounceType.TEMPORARY.value
        )
    )
    temporary = temporary_result.scalar() or 0
    
    # Invalid emails
    invalid_result = db.execute(
        select(func.count(EmailBounce.id)).where(EmailBounce.is_invalid.is_(True))
    )
    invalid_count = invalid_result.scalar() or 0
    
    return BounceStatsResponse(
        total=total,
        permanent=permanent,
        temporary=temporary,
        invalid_count=invalid_count,
    )

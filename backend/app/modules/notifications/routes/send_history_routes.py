"""
Email send history API routes.

Provides endpoints for viewing email send history and statistics.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.notifications.services.send_history_service import SendHistoryService
from app.modules.notifications.schemas import (
    EmailSendHistoryResponse,
    EmailSendHistoryListResponse,
    EmailSendHistoryFilter,
    TemplateStatsResponse,
)

router = APIRouter(prefix="/notifications/send-history", tags=["Email Send History"])


@router.get("", response_model=EmailSendHistoryListResponse)
async def get_send_history(
    recipient_email: Optional[str] = Query(None, description="Filter by recipient email"),
    template_name: Optional[str] = Query(None, description="Filter by template name"),
    status: Optional[str] = Query(None, description="Filter by status (pending, sent, failed)"),
    from_date: Optional[datetime] = Query(None, description="Filter by start date"),
    to_date: Optional[datetime] = Query(None, description="Filter by end date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SETTINGS_VIEW)),
):
    """
    Get email send history with filtering and pagination.

    Requires SETTINGS_VIEW permission.
    """
    service = SendHistoryService(db)
    result = await service.get_history(
        recipient_email=recipient_email,
        template_name=template_name,
        status=status,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size,
    )

    return EmailSendHistoryListResponse(
        items=[EmailSendHistoryResponse.model_validate(item) for item in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.get("/templates/{template_name}/stats", response_model=TemplateStatsResponse)
async def get_template_stats(
    template_name: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.EMAIL_HISTORY)),
):
    """
    Get statistics for a specific email template.

    Requires EMAIL_HISTORY permission.
    """
    service = SendHistoryService(db)
    stats = await service.get_template_stats(template_name=template_name, days=days)
    return TemplateStatsResponse(**stats)

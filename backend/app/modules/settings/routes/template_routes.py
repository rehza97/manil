"""
Email template management and preview API routes.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.settings.services.template_preview_service import TemplatePreviewService
from pydantic import BaseModel

router = APIRouter(prefix="/settings/templates", tags=["Email Templates"])


class TemplatePreviewRequest(BaseModel):
    """Template preview request schema."""
    template_name: str
    context: Optional[Dict[str, Any]] = None
    format: str = "html"


class TemplatePreviewResponse(BaseModel):
    """Template preview response schema."""
    html: str
    text: str
    variables: list[str]
    is_valid: bool
    context_used: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class TemplateListResponse(BaseModel):
    """Template list response schema."""
    templates: list[str]


@router.post("/preview", response_model=TemplatePreviewResponse)
async def preview_template(
    request: TemplatePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SETTINGS_VIEW)),
):
    """
    Preview an email template with provided or sample context.

    Requires SETTINGS_VIEW permission.
    """
    service = TemplatePreviewService()
    result = service.preview_template(
        template_name=request.template_name,
        context=request.context,
        format=request.format,
    )
    
    return TemplatePreviewResponse(**result)


@router.get("/list", response_model=TemplateListResponse)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.SETTINGS_VIEW)),
):
    """
    List all available email templates.

    Requires SETTINGS_VIEW permission.
    """
    service = TemplatePreviewService()
    templates = service.list_available_templates()
    
    return TemplateListResponse(templates=templates)

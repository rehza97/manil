"""Canned replies and template variables API endpoints."""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.exceptions import NotFoundException
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.tickets.canned_replies import (
    CannedReplyService,
    TemplateVariable,
    TemplateVariableInfo,
    CannedReplyQuickInsert,
    TemplateRenderRequest,
    TemplateRenderResponse,
)
from app.modules.tickets.response_templates import ResponseTemplateResponse

router = APIRouter(prefix="/tickets", tags=["canned-replies"])


# ========== TEMPLATE VARIABLES ==========


@router.get(
    "/templates/variables/available",
    summary="Get available template variables",
)
async def get_available_variables(
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get list of available template variables for substitution."""
    service = CannedReplyService(None)  # No DB needed for this
    variables = service.get_available_variables()

    # Format response
    system_vars = [
        {"name": k, "description": v, "category": "system"}
        for k, v in variables["system_variables"].items()
    ]

    custom_vars = [
        {"name": k, "description": v, "category": "custom"}
        for k, v in variables["custom_variables"].items()
    ]

    return {
        "system_variables": system_vars,
        "custom_variables": custom_vars,
        "total_variables": len(variables["all_variables"]),
    }


@router.post(
    "/templates/validate",
    summary="Validate template syntax",
)
async def validate_template(
    request: TemplateRenderRequest,
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Validate template syntax and variables."""
    service = CannedReplyService(None)
    validation = service.validate_template(request.template_content)

    return {
        "is_valid": validation["is_valid"],
        "variables_found": validation["variables_found"],
        "issues": validation["issues"],
    }


@router.post(
    "/templates/preview",
    response_model=TemplateRenderResponse,
    summary="Preview rendered template",
)
async def preview_template(
    request: TemplateRenderRequest,
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Preview template with variables substituted."""
    service = CannedReplyService(None)

    # Validate template
    validation = service.validate_template(request.template_content)

    if not validation["is_valid"]:
        return TemplateRenderResponse(
            rendered_content=request.template_content,
            variables_used=validation["variables_found"],
            is_valid=False,
        )

    # Render template (sync version)
    rendered = request.template_content
    for var_key, var_value in request.context.items():
        placeholder = f"{{{{{var_key}}}}}"
        rendered = rendered.replace(placeholder, var_value)

    return TemplateRenderResponse(
        rendered_content=rendered,
        variables_used=validation["variables_found"],
        is_valid=True,
    )


# ========== QUICK INSERT ==========


@router.post(
    "/{ticket_id}/quick-reply",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Insert canned reply to ticket",
)
async def insert_canned_reply(
    ticket_id: str,
    request: CannedReplyQuickInsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_REPLY")),
):
    """
    Get rendered canned reply ready for posting to ticket.

    Returns the template content with variables substituted.
    """
    try:
        service = CannedReplyService(db)

        # Generate rendered content
        rendered_content = await service.insert_template_quick_reply(
            template_id=request.template_id,
            ticket_id=ticket_id,
            customer_id="unknown",  # Would be fetched from ticket
            agent_id=current_user.id,
        )

        logger.info(f"Canned reply inserted: template {request.template_id} in ticket {ticket_id}")

        return {
            "ticket_id": ticket_id,
            "template_id": request.template_id,
            "rendered_content": rendered_content,
            "ready_to_post": True,
        }

    except ValueError as e:
        logger.error(f"Error: {str(e)}")
        raise NotFoundException(str(e))
    except Exception as e:
        logger.error(f"Failed to insert canned reply: {str(e)}")
        raise


# ========== TEMPLATE SUGGESTIONS ==========


@router.get(
    "/templates/popular",
    response_model=list[ResponseTemplateResponse],
    summary="Get popular canned replies",
)
async def get_popular_templates(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get most-used canned reply templates."""
    service = CannedReplyService(db)
    templates = await service.get_popular_templates(limit=limit)
    return templates


@router.get(
    "/templates/by-category/{category}",
    response_model=list[ResponseTemplateResponse],
    summary="Get templates by category",
)
async def get_templates_by_category(
    category: str,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get canned reply templates for a category."""
    service = CannedReplyService(db)
    templates = await service.list_templates_for_category(category=category, limit=limit)
    return templates


# ========== QUICK REPLY SUGGESTIONS ==========


@router.get(
    "/{ticket_id}/suggest-replies",
    response_model=list[ResponseTemplateResponse],
    summary="Get suggested canned replies for ticket",
)
async def suggest_replies_for_ticket(
    ticket_id: str,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """
    Get suggested canned replies based on ticket category/priority.

    Returns most relevant templates for quick insertion.
    """
    service = CannedReplyService(db)

    # Get popular templates as default suggestions
    # In a real scenario, this would analyze ticket category/priority
    templates = await service.get_popular_templates(limit=limit)

    return templates

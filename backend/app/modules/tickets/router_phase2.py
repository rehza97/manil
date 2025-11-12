"""Phase 2 ticket features router - category, template, and filtering endpoints."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.logging import logger
from app.modules.auth.models import User
from app.modules.tickets.models import Ticket, TicketPriority
from app.modules.tickets.schemas import TicketResponse, TicketListResponse, PaginationMetadata
from app.modules.tickets.response_templates import (
    ResponseTemplate,
    TicketCategory,
    ResponseTemplateCreate,
    ResponseTemplateUpdate,
    ResponseTemplateResponse,
    TicketCategoryCreate,
    TicketCategoryUpdate,
    TicketCategoryResponse,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


# ========== TICKET CATEGORIES ==========


@router.post(
    "/categories",
    response_model=TicketCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create ticket category",
)
async def create_ticket_category(
    category_data: TicketCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Create a new ticket category."""
    try:
        category = TicketCategory(
            id=str(uuid.uuid4()),
            **category_data.model_dump(),
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        logger.info(f"Category created: {category.id}")
        return category
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create category: {str(e)}")
        raise


@router.get(
    "/categories",
    response_model=list[TicketCategoryResponse],
    summary="List ticket categories",
)
async def list_ticket_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """List all active ticket categories."""
    query = select(TicketCategory).where(TicketCategory.is_active == True)
    result = await db.execute(query)
    categories = result.scalars().all()
    return categories


@router.get(
    "/categories/{category_id}",
    response_model=TicketCategoryResponse,
    summary="Get ticket category",
)
async def get_ticket_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get ticket category by ID."""
    query = select(TicketCategory).where(TicketCategory.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    if not category:
        raise ValueError(f"Category {category_id} not found")
    return category


@router.put(
    "/categories/{category_id}",
    response_model=TicketCategoryResponse,
    summary="Update ticket category",
)
async def update_ticket_category(
    category_id: str,
    category_data: TicketCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Update ticket category."""
    try:
        query = select(TicketCategory).where(TicketCategory.id == category_id)
        result = await db.execute(query)
        category = result.scalar_one_or_none()
        if not category:
            raise ValueError(f"Category {category_id} not found")

        for key, value in category_data.model_dump(exclude_unset=True).items():
            setattr(category, key, value)

        await db.commit()
        await db.refresh(category)
        logger.info(f"Category updated: {category_id}")
        return category
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update category: {str(e)}")
        raise


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete ticket category",
)
async def delete_ticket_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Soft delete ticket category."""
    try:
        query = select(TicketCategory).where(TicketCategory.id == category_id)
        result = await db.execute(query)
        category = result.scalar_one_or_none()
        if not category:
            raise ValueError(f"Category {category_id} not found")

        category.is_active = False
        await db.commit()
        logger.info(f"Category deleted: {category_id}")
        return None
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete category: {str(e)}")
        raise


# ========== RESPONSE TEMPLATES ==========


@router.post(
    "/templates",
    response_model=ResponseTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create response template",
)
async def create_response_template(
    template_data: ResponseTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Create a new response template (canned reply)."""
    try:
        template = ResponseTemplate(
            id=str(uuid.uuid4()),
            **template_data.model_dump(),
            created_by=current_user.id,
        )
        db.add(template)
        await db.commit()
        await db.refresh(template)
        logger.info(f"Response template created: {template.id}")
        return template
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create response template: {str(e)}")
        raise


@router.get(
    "/templates",
    response_model=list[ResponseTemplateResponse],
    summary="List response templates",
)
async def list_response_templates(
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """List response templates, optionally filtered by category."""
    conditions = [ResponseTemplate.deleted_at.is_(None)]
    if category:
        conditions.append(ResponseTemplate.category == category)

    query = select(ResponseTemplate).where(*conditions).order_by(ResponseTemplate.created_at.desc())
    result = await db.execute(query)
    templates = result.scalars().all()
    return templates


@router.get(
    "/templates/{template_id}",
    response_model=ResponseTemplateResponse,
    summary="Get response template",
)
async def get_response_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Get response template by ID."""
    query = select(ResponseTemplate).where(
        and_(ResponseTemplate.id == template_id, ResponseTemplate.deleted_at.is_(None))
    )
    result = await db.execute(query)
    template = result.scalar_one_or_none()
    if not template:
        raise ValueError(f"Template {template_id} not found")
    return template


@router.put(
    "/templates/{template_id}",
    response_model=ResponseTemplateResponse,
    summary="Update response template",
)
async def update_response_template(
    template_id: str,
    template_data: ResponseTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Update response template."""
    try:
        query = select(ResponseTemplate).where(
            and_(ResponseTemplate.id == template_id, ResponseTemplate.deleted_at.is_(None))
        )
        result = await db.execute(query)
        template = result.scalar_one_or_none()
        if not template:
            raise ValueError(f"Template {template_id} not found")

        for key, value in template_data.model_dump(exclude_unset=True).items():
            setattr(template, key, value)
        template.updated_by = current_user.id

        await db.commit()
        await db.refresh(template)
        logger.info(f"Response template updated: {template_id}")
        return template
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update response template: {str(e)}")
        raise


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete response template",
)
async def delete_response_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_MANAGE")),
):
    """Soft delete response template."""
    try:
        query = select(ResponseTemplate).where(
            and_(ResponseTemplate.id == template_id, ResponseTemplate.deleted_at.is_(None))
        )
        result = await db.execute(query)
        template = result.scalar_one_or_none()
        if not template:
            raise ValueError(f"Template {template_id} not found")

        template.deleted_at = datetime.now(timezone.utc)
        template.deleted_by = current_user.id
        await db.commit()
        logger.info(f"Response template deleted: {template_id}")
        return None
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete response template: {str(e)}")
        raise


# ========== ADVANCED FILTERING ==========


@router.get(
    "/filter/by-priority",
    response_model=TicketListResponse,
    summary="Filter tickets by priority",
)
async def filter_tickets_by_priority(
    priority: str = Query(..., pattern="^(low|medium|high|urgent)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Filter tickets by priority level."""
    conditions = [
        Ticket.priority == priority,
        Ticket.deleted_at.is_(None),
    ]

    skip = (page - 1) * page_size

    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Ticket).where(and_(*conditions))
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated results
    query = (
        select(Ticket)
        .where(and_(*conditions))
        .order_by(Ticket.created_at.desc())
        .offset(skip)
        .limit(page_size)
    )
    result = await db.execute(query)
    tickets = result.scalars().all()

    pagination = PaginationMetadata(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

    return TicketListResponse(
        data=[TicketResponse.model_validate(t) for t in tickets],
        pagination=pagination,
    )


@router.get(
    "/filter/by-category",
    response_model=TicketListResponse,
    summary="Filter tickets by category",
)
async def filter_tickets_by_category(
    category_id: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("TICKETS_VIEW")),
):
    """Filter tickets by category."""
    conditions = [
        Ticket.category_id == category_id,
        Ticket.deleted_at.is_(None),
    ]

    skip = (page - 1) * page_size

    # Count total
    from sqlalchemy import func
    count_query = select(func.count()).select_from(Ticket).where(and_(*conditions))
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated results
    query = (
        select(Ticket)
        .where(and_(*conditions))
        .order_by(Ticket.created_at.desc())
        .offset(skip)
        .limit(page_size)
    )
    result = await db.execute(query)
    tickets = result.scalars().all()

    pagination = PaginationMetadata(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

    return TicketListResponse(
        data=[TicketResponse.model_validate(t) for t in tickets],
        pagination=pagination,
    )

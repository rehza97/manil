"""
Notification group management API routes.

Provides endpoints for creating, updating, and managing notification groups.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.config.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.notifications.services.group_service import NotificationGroupService
from app.modules.notifications.schemas import (
    NotificationGroupCreate,
    NotificationGroupUpdate,
    NotificationGroupResponse,
    NotificationGroupListResponse,
    NotificationGroupTestResponse,
)

router = APIRouter(prefix="/notifications/groups", tags=["Notification Groups"])


@router.get("", response_model=NotificationGroupListResponse)
async def list_groups(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    List notification groups with filtering and pagination.

    Requires NOTIFICATIONS_MANAGE permission.
    """
    service = NotificationGroupService(db)
    skip = (page - 1) * page_size
    groups, total = await service.list_groups(
        is_active=is_active,
        target_type=target_type,
        skip=skip,
        limit=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return NotificationGroupListResponse(
        items=[NotificationGroupResponse.model_validate(group) for group in groups],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=NotificationGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: NotificationGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    Create a new notification group.

    Requires NOTIFICATIONS_MANAGE permission.
    """
    service = NotificationGroupService(db)
    try:
        group = await service.create_group(
            name=group_data.name,
            description=group_data.description,
            target_type=group_data.target_type,
            target_criteria=group_data.target_criteria,
        )
        return NotificationGroupResponse.model_validate(group)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{group_id}", response_model=NotificationGroupResponse)
async def get_group(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    Get notification group by ID.

    Requires NOTIFICATIONS_MANAGE permission.
    """
    service = NotificationGroupService(db)
    group = await service.get_by_id(group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification group {group_id} not found"
        )
    return NotificationGroupResponse.model_validate(group)


@router.put("/{group_id}", response_model=NotificationGroupResponse)
async def update_group(
    group_id: str,
    group_data: NotificationGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    Update a notification group.

    Requires NOTIFICATIONS_MANAGE permission.
    """
    service = NotificationGroupService(db)
    try:
        group = await service.update_group(
            group_id=group_id,
            name=group_data.name,
            description=group_data.description,
            target_type=group_data.target_type,
            target_criteria=group_data.target_criteria,
            is_active=group_data.is_active,
        )
        return NotificationGroupResponse.model_validate(group)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    Delete a notification group.

    Requires NOTIFICATIONS_MANAGE permission.
    """
    service = NotificationGroupService(db)
    try:
        await service.delete_group(group_id)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{group_id}/test", response_model=NotificationGroupTestResponse)
async def test_targeting(
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    Test notification group targeting without creating notifications.

    Returns the count of users that would receive notifications.

    Requires NOTIFICATIONS_MANAGE permission.
    """
    service = NotificationGroupService(db)
    try:
        result = await service.test_targeting(group_id)
        return NotificationGroupTestResponse(**result)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


class SendGroupNotificationRequest(BaseModel):
    """Request schema for sending group notification."""
    group_id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None


@router.post("/send", status_code=status.HTTP_200_OK)
async def send_group_notification(
    request: SendGroupNotificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.NOTIFICATIONS_MANAGE)),
):
    """
    Send a notification to all members of a notification group.

    Requires NOTIFICATIONS_SEND permission.
    """
    from app.modules.notifications.service import create_group_notification

    try:
        await create_group_notification(
            db=db,
            group_id=request.group_id,
            type=request.type,
            title=request.title,
            body=request.body,
            link=request.link,
        )
        return {"success": True, "message": "Notification sent to group members"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

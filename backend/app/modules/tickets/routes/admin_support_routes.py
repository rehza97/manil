"""
Admin Support Management API routes.
Admin-only endpoints for managing support groups, categories, and automation rules.
"""
import uuid
from typing import Annotated, Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from pydantic import BaseModel, Field

from app.config.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.tickets.models import (
    SupportGroup,
    SupportGroupMember,
    AutomationRule,
    Ticket,
)
from app.modules.tickets.response_templates import (
    TicketCategory,
    TicketCategoryResponse,
    TicketCategoryCreate,
    TicketCategoryUpdate,
)

router = APIRouter(prefix="/admin/support", tags=["admin-support"])


# ============================================================================
# Support Group Schemas
# ============================================================================

class SupportGroupCreate(BaseModel):
    """Schema for creating support group."""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class SupportGroupUpdate(BaseModel):
    """Schema for updating support group."""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class SupportGroupMemberAdd(BaseModel):
    """Schema for adding member to group."""
    user_id: str = Field(..., min_length=1)


class SupportGroupResponse(BaseModel):
    """Schema for support group response."""
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    member_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupportGroupDetailResponse(SupportGroupResponse):
    """Schema for support group with members."""
    members: List[dict] = []  # List of {user_id, user_email, user_name, created_at}


# ============================================================================
# Automation Rule Schemas
# ============================================================================

class AutomationRuleCreate(BaseModel):
    """Schema for creating automation rule."""
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    trigger_type: str = Field(..., description="ticket_created, ticket_updated, ticket_replied")
    conditions: dict = Field(..., description="Rule conditions as JSON")
    actions: dict = Field(..., description="Actions to execute as JSON")
    is_active: bool = True
    priority: int = Field(0, ge=0, description="Rule priority (higher = executed first)")


class AutomationRuleUpdate(BaseModel):
    """Schema for updating automation rule."""
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    conditions: Optional[dict] = None
    actions: Optional[dict] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0)


class AutomationRuleResponse(BaseModel):
    """Schema for automation rule response."""
    id: str
    name: str
    description: Optional[str]
    trigger_type: str
    conditions: dict
    actions: dict
    is_active: bool
    priority: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Support Statistics Schema
# ============================================================================

class SupportStatsResponse(BaseModel):
    """Support statistics response."""
    total_tickets: int
    open_tickets: int
    assigned_tickets: int
    unassigned_tickets: int
    total_categories: int
    total_groups: int
    total_automation_rules: int
    active_automation_rules: int


# ============================================================================
# Support Dashboard
# ============================================================================

@router.get("/stats", response_model=SupportStatsResponse)
async def get_support_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Get support management statistics.
    
    Returns:
        Support statistics including tickets, categories, groups, and rules.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access support statistics"
        )

    # Count tickets
    total_tickets_result = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.deleted_at.is_(None))
    )
    total_tickets = total_tickets_result.scalar() or 0

    open_tickets_result = await db.execute(
        select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.status.in_(["open", "answered", "in_progress", "waiting_for_response"])
            )
        )
    )
    open_tickets = open_tickets_result.scalar() or 0

    assigned_tickets_result = await db.execute(
        select(func.count(Ticket.id)).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.assigned_to.isnot(None)
            )
        )
    )
    assigned_tickets = assigned_tickets_result.scalar() or 0

    unassigned_tickets = open_tickets - assigned_tickets

    # Count categories
    categories_result = await db.execute(
        select(func.count(TicketCategory.id)).where(TicketCategory.is_active == True)
    )
    total_categories = categories_result.scalar() or 0

    # Count groups
    groups_result = await db.execute(
        select(func.count(SupportGroup.id)).where(SupportGroup.is_active == True)
    )
    total_groups = groups_result.scalar() or 0

    # Count automation rules
    rules_result = await db.execute(select(func.count(AutomationRule.id)))
    total_automation_rules = rules_result.scalar() or 0

    active_rules_result = await db.execute(
        select(func.count(AutomationRule.id)).where(AutomationRule.is_active == True)
    )
    active_automation_rules = active_rules_result.scalar() or 0

    return SupportStatsResponse(
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        assigned_tickets=assigned_tickets,
        unassigned_tickets=unassigned_tickets,
        total_categories=total_categories,
        total_groups=total_groups,
        total_automation_rules=total_automation_rules,
        active_automation_rules=active_automation_rules,
    )


# ============================================================================
# Support Groups Endpoints
# ============================================================================

@router.get("/groups", response_model=List[SupportGroupResponse])
async def list_support_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
):
    """
    List all support groups.
    
    Returns:
        List of support groups with member counts.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access support groups"
        )

    query = select(SupportGroup)
    if is_active is not None:
        query = query.where(SupportGroup.is_active == is_active)
    query = query.order_by(SupportGroup.name)

    result = await db.execute(query)
    groups = result.scalars().all()

    # Get member counts for each group
    groups_with_counts = []
    for group in groups:
        member_count_result = await db.execute(
            select(func.count(SupportGroupMember.user_id)).where(
                SupportGroupMember.group_id == group.id
            )
        )
        member_count = member_count_result.scalar() or 0

        groups_with_counts.append({
            **SupportGroupResponse.model_validate(group).model_dump(),
            "member_count": member_count
        })

    return groups_with_counts


@router.post("/groups", response_model=SupportGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_support_group(
    group_data: SupportGroupCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Create a new support group.
    
    Returns:
        Created support group.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create support groups"
        )

    # Check if name already exists
    existing = await db.execute(
        select(SupportGroup).where(SupportGroup.name == group_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Support group with this name already exists"
        )

    group = SupportGroup(
        id=str(uuid.uuid4()),
        **group_data.model_dump()
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)

    return SupportGroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        is_active=group.is_active,
        member_count=0,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.get("/groups/{group_id}", response_model=SupportGroupDetailResponse)
async def get_support_group(
    group_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Get support group details with members.
    
    Returns:
        Support group with member list.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access support groups"
        )

    group_result = await db.execute(
        select(SupportGroup).where(SupportGroup.id == group_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support group not found"
        )

    # Get members with user details
    members_result = await db.execute(
        select(SupportGroupMember, User.email, User.full_name)
        .join(User, SupportGroupMember.user_id == User.id)
        .where(SupportGroupMember.group_id == group_id)
    )
    members_data = members_result.all()

    members = [
        {
            "user_id": member.SupportGroupMember.user_id,
            "user_email": member.email,
            "user_name": member.full_name,
            "created_at": member.SupportGroupMember.created_at.isoformat(),
        }
        for member in members_data
    ]

    return SupportGroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        is_active=group.is_active,
        member_count=len(members),
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=members,
    )


@router.put("/groups/{group_id}", response_model=SupportGroupResponse)
async def update_support_group(
    group_id: str,
    group_data: SupportGroupUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Update support group.
    
    Returns:
        Updated support group.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update support groups"
        )

    group_result = await db.execute(
        select(SupportGroup).where(SupportGroup.id == group_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support group not found"
        )

    # Check name uniqueness if updating name
    if group_data.name and group_data.name != group.name:
        existing = await db.execute(
            select(SupportGroup).where(SupportGroup.name == group_data.name)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Support group with this name already exists"
            )

    # Update fields
    for key, value in group_data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    group.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(group)

    # Get member count
    member_count_result = await db.execute(
        select(func.count(SupportGroupMember.user_id)).where(
            SupportGroupMember.group_id == group.id
        )
    )
    member_count = member_count_result.scalar() or 0

    return SupportGroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        is_active=group.is_active,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_support_group(
    group_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Delete support group (soft delete).
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete support groups"
        )

    group_result = await db.execute(
        select(SupportGroup).where(SupportGroup.id == group_id)
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support group not found"
        )

    group.is_active = False
    group.updated_at = datetime.utcnow()
    await db.commit()


@router.post("/groups/{group_id}/members", status_code=status.HTTP_204_NO_CONTENT)
async def add_group_member(
    group_id: str,
    member_data: SupportGroupMemberAdd,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Add user to support group.
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage group members"
        )

    # Verify group exists
    group_result = await db.execute(
        select(SupportGroup).where(SupportGroup.id == group_id)
    )
    if not group_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support group not found"
        )

    # Verify user exists
    from app.modules.auth.models import User
    user_result = await db.execute(
        select(User).where(User.id == member_data.user_id)
    )
    if not user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already a member
    existing = await db.execute(
        select(SupportGroupMember).where(
            and_(
                SupportGroupMember.group_id == group_id,
                SupportGroupMember.user_id == member_data.user_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )

    member = SupportGroupMember(
        group_id=group_id,
        user_id=member_data.user_id,
        created_at=datetime.utcnow()
    )
    db.add(member)
    await db.commit()


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(
    group_id: str,
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Remove user from support group.
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage group members"
        )

    member_result = await db.execute(
        select(SupportGroupMember).where(
            and_(
                SupportGroupMember.group_id == group_id,
                SupportGroupMember.user_id == user_id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this group"
        )

    await db.delete(member)
    await db.commit()


# ============================================================================
# Ticket Categories Endpoints (Admin wrapper)
# ============================================================================

@router.get("/categories", response_model=List[TicketCategoryResponse])
async def list_ticket_categories_admin(
    db: Annotated[AsyncSession, Depends(get_db)],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
):
    """
    List all ticket categories (admin view).
    
    Returns:
        List of ticket categories.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access ticket categories"
        )

    query = select(TicketCategory)
    if is_active is not None:
        query = query.where(TicketCategory.is_active == is_active)
    query = query.order_by(TicketCategory.name)

    result = await db.execute(query)
    categories = result.scalars().all()
    return [TicketCategoryResponse.model_validate(cat) for cat in categories]


# ============================================================================
# Automation Rules Endpoints
# ============================================================================

@router.get("/automation", response_model=List[AutomationRuleResponse])
async def list_automation_rules(
    db: Annotated[AsyncSession, Depends(get_db)],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    trigger_type: Optional[str] = Query(None, description="Filter by trigger type"),
    current_user: User = Depends(get_current_user),
):
    """
    List all automation rules.
    
    Returns:
        List of automation rules.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access automation rules"
        )

    query = select(AutomationRule)
    if is_active is not None:
        query = query.where(AutomationRule.is_active == is_active)
    if trigger_type:
        query = query.where(AutomationRule.trigger_type == trigger_type)
    query = query.order_by(AutomationRule.priority.desc(), AutomationRule.name)

    result = await db.execute(query)
    rules = result.scalars().all()
    return [AutomationRuleResponse.model_validate(rule) for rule in rules]


@router.post("/automation", response_model=AutomationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_automation_rule(
    rule_data: AutomationRuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Create a new automation rule.
    
    Returns:
        Created automation rule.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create automation rules"
        )

    # Validate trigger type
    valid_triggers = ["ticket_created", "ticket_updated", "ticket_replied"]
    if rule_data.trigger_type not in valid_triggers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid trigger_type. Must be one of: {', '.join(valid_triggers)}"
        )

    rule = AutomationRule(
        id=str(uuid.uuid4()),
        **rule_data.model_dump()
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)


@router.get("/automation/{rule_id}", response_model=AutomationRuleResponse)
async def get_automation_rule(
    rule_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Get automation rule by ID.
    
    Returns:
        Automation rule details.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access automation rules"
        )

    rule_result = await db.execute(
        select(AutomationRule).where(AutomationRule.id == rule_id)
    )
    rule = rule_result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    return AutomationRuleResponse.model_validate(rule)


@router.put("/automation/{rule_id}", response_model=AutomationRuleResponse)
async def update_automation_rule(
    rule_id: str,
    rule_data: AutomationRuleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Update automation rule.
    
    Returns:
        Updated automation rule.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update automation rules"
        )

    rule_result = await db.execute(
        select(AutomationRule).where(AutomationRule.id == rule_id)
    )
    rule = rule_result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    # Validate trigger type if updating
    if rule_data.trigger_type:
        valid_triggers = ["ticket_created", "ticket_updated", "ticket_replied"]
        if rule_data.trigger_type not in valid_triggers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid trigger_type. Must be one of: {', '.join(valid_triggers)}"
            )

    # Update fields
    for key, value in rule_data.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)

    rule.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)


@router.delete("/automation/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation_rule(
    rule_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Delete automation rule.
    
    Returns:
        No content.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete automation rules"
        )

    rule_result = await db.execute(
        select(AutomationRule).where(AutomationRule.id == rule_id)
    )
    rule = rule_result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    await db.delete(rule)
    await db.commit()


@router.patch("/automation/{rule_id}/toggle", response_model=AutomationRuleResponse)
async def toggle_automation_rule(
    rule_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: User = Depends(get_current_user),
):
    """
    Toggle automation rule active status.
    
    Returns:
        Updated automation rule.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can toggle automation rules"
        )

    rule_result = await db.execute(
        select(AutomationRule).where(AutomationRule.id == rule_id)
    )
    rule = rule_result.scalar_one_or_none()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation rule not found"
        )

    rule.is_active = not rule.is_active
    rule.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(rule)

    return AutomationRuleResponse.model_validate(rule)












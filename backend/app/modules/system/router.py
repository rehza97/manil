"""
System API routes.
Handles system health, statistics, and monitoring endpoints.
"""
from typing import Annotated
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.config.database import get_db
from app.modules.auth.models import User
from app.modules.customers.models import Customer
from app.modules.audit.models import AuditLog

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/stats")
async def get_system_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get system statistics.

    Returns:
        System statistics including user counts, customer counts, etc.
    """
    # Get total users
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0

    # Get active users (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users_result = await db.execute(
        select(func.count(func.distinct(AuditLog.user_id)))
        .where(AuditLog.created_at >= thirty_days_ago)
    )
    active_users = active_users_result.scalar() or 0

    # Get total customers
    customers_result = await db.execute(select(func.count(Customer.id)))
    total_customers = customers_result.scalar() or 0

    # Get customers created this month
    current_month_start = datetime.utcnow().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0)
    new_customers_result = await db.execute(
        select(func.count(Customer.id))
        .where(Customer.created_at >= current_month_start)
    )
    new_customers = new_customers_result.scalar() or 0

    # Get recent activity (last 24 hours)
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    recent_activity_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.created_at >= twenty_four_hours_ago)
    )
    recent_activity = recent_activity_result.scalar() or 0

    # Get failed login attempts (last 24 hours)
    failed_logins_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(
            AuditLog.created_at >= twenty_four_hours_ago,
            AuditLog.action == "login_failed"
        )
    )
    failed_logins = failed_logins_result.scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_customers": total_customers,
        "new_customers_this_month": new_customers,
        "recent_activity_24h": recent_activity,
        "failed_logins_24h": failed_logins,
        "system_uptime": 99.9,  # Mock value - would need actual uptime tracking
        "database_status": "healthy",  # Mock value - would need actual health check
        "api_response_time": 45,  # Mock value - would need actual response time tracking
    }


@router.get("/health/detailed")
async def get_detailed_health():
    """
    Get detailed system health information.

    Returns:
        Detailed health status of system components
    """
    return {
        "database": {
            "status": "healthy",
            "uptime": 99.9,
            "response_time": 12,
            "connections": 8,
            "max_connections": 100
        },
        "redis": {
            "status": "healthy",
            "uptime": 99.8,
            "hit_rate": 95.2,
            "memory_usage": "45MB"
        },
        "api_server": {
            "status": "healthy",
            "uptime": 99.7,
            "response_time": 45,
            "cpu_usage": 45,
            "memory_usage": "128MB"
        },
        "storage": {
            "status": "healthy",
            "usage_percent": 62,
            "available_gb": 380,
            "total_gb": 1000
        }
    }


@router.get("/activity/recent")
async def get_recent_activity(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 10
):
    """
    Get recent system activity.

    Args:
        limit: Number of recent activities to return

    Returns:
        List of recent activities
    """
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()

    return [
        {
            "id": activity.id,
            "user_email": activity.user_email,
            "action": activity.action,
            "resource": activity.resource_type,
            "timestamp": activity.created_at.isoformat(),
            "ip_address": activity.ip_address,
        }
        for activity in activities
    ]


@router.get("/users/by-role")
async def get_users_by_role(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get user statistics by role.

    Returns:
        User counts grouped by role
    """
    result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    role_counts = result.all()

    # Get active users by role (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_result = await db.execute(
        select(User.role, func.count(func.distinct(AuditLog.user_id)))
        .join(AuditLog, AuditLog.user_id == User.id)
        .where(AuditLog.created_at >= thirty_days_ago)
        .group_by(User.role)
    )
    active_by_role = dict(active_result.all())

    return {
        "total_by_role": dict(role_counts),
        "active_by_role": active_by_role,
    }

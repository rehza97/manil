"""
Admin Logs Routes
Maps /admin/logs/* endpoints to the existing system/audit log endpoints.
Export endpoints return file_name; frontend downloads via /reports/export/download/{file_name}.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from datetime import datetime
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import require_permission
from app.core.permissions import Permission
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog, AuditAction
from app.modules.audit.service import AuditService
from app.modules.audit.repository import AuditRepository
from app.modules.audit.schemas import AuditLogFilter
from app.modules.reports.export_service import ExportService
from app.modules.system.log_export_service import (
    audit_logs_to_rows,
    system_logs_to_rows,
    get_security_actions,
    AUDIT_EXPORT_HEADERS,
    SYSTEM_EXPORT_HEADERS,
)
from .router import get_system_logs

router = APIRouter(prefix="/admin/logs", tags=["admin-logs"])
EXPORT_LIMIT = 5000


@router.get("/system")
async def admin_get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level"),
    component: Optional[str] = Query(None, description="Filter by component"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_permission(Permission.SYSTEM_LOGS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint for system logs - maps to /system/logs."""
    return await get_system_logs(
        db=db,
        level=level,
        component=component,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
        current_user=current_user,
    )


@router.get("/audit/export")
async def export_audit_logs(
    format: str = Query("csv", description="csv or excel"),
    page_size: int = Query(5000, ge=1, le=10000),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    success: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission(Permission.AUDIT_EXPORT)),
    db: AsyncSession = Depends(get_db),
):
    """Export audit logs as CSV or Excel. Returns file_name for download."""
    action_enum = None
    if action:
        try:
            action_enum = AuditAction(action)
        except ValueError:
            pass
    filters = AuditLogFilter(
        action=action_enum,
        resource_type=resource_type,
        user_email=user_email,
        success=success,
    )
    from app.core.permissions import has_permission
    if not has_permission(current_user.role_slug, Permission.AUDIT_ADMIN):
        filters.user_id = current_user.id
    service = AuditService(db)
    result = await service.get_logs(page=1, page_size=page_size, filters=filters)
    rows = audit_logs_to_rows(result.data)
    if not rows:
        raise HTTPException(status_code=404, detail="No audit logs to export")
    export_svc = ExportService()
    fmt = format.lower()
    if fmt == "excel":
        out = export_svc.export_to_excel(
            rows, "audit_logs", "Audit Logs", AUDIT_EXPORT_HEADERS)
    else:
        out = export_svc.export_to_csv(
            rows, "audit_logs", AUDIT_EXPORT_HEADERS)
    return {"file_name": out["file_name"], "format": out["format"]}


@router.get("/security/export")
async def export_security_logs(
    format: str = Query("csv", description="csv or excel"),
    page_size: int = Query(5000, ge=1, le=10000),
    current_user: User = Depends(require_permission(Permission.AUDIT_EXPORT)),
    db: AsyncSession = Depends(get_db),
):
    """Export security-related audit logs as CSV or Excel."""
    security_actions = get_security_actions()
    query = (
        select(AuditLog)
        .where(AuditLog.action.in_(security_actions))
        .order_by(AuditLog.created_at.desc())
        .limit(page_size)
    )
    result = await db.execute(query)
    logs = list(result.scalars().all())
    rows = audit_logs_to_rows(logs)
    if not rows:
        raise HTTPException(
            status_code=404, detail="No security logs to export")
    export_svc = ExportService()
    fmt = format.lower()
    if fmt == "excel":
        out = export_svc.export_to_excel(
            rows, "security_logs", "Security Logs", AUDIT_EXPORT_HEADERS)
    else:
        out = export_svc.export_to_csv(
            rows, "security_logs", AUDIT_EXPORT_HEADERS)
    return {"file_name": out["file_name"], "format": out["format"]}


@router.get("/system/export")
async def export_system_logs(
    format: str = Query("csv", description="csv or excel"),
    page_size: int = Query(5000, ge=1, le=10000),
    current_user: User = Depends(require_permission(Permission.SYSTEM_LOGS)),
    db: AsyncSession = Depends(get_db),
):
    """Export system logs as CSV or Excel."""
    system_actions = [AuditAction.SYSTEM_ERROR,
                      AuditAction.CONFIG_CHANGE, AuditAction.SECURITY_ALERT]
    query = select(AuditLog).where(
        or_(
            AuditLog.action.in_(system_actions),
            AuditLog.resource_type.in_(
                ["system", "database", "cache", "email", "api"]),
            AuditLog.description.like("%system%"),
            AuditLog.description.like("%error%"),
            AuditLog.description.like("%warning%"),
        )
    ).order_by(AuditLog.created_at.desc()).limit(page_size)
    result = await db.execute(query)
    audit_logs = result.scalars().all()
    log_entries = []
    for log in audit_logs:
        extra = log.extra_data or {}
        level = "info"
        if log.action == AuditAction.SYSTEM_ERROR:
            level = "error"
        elif "error" in (log.description or "").lower() or "failed" in (log.description or "").lower():
            level = "error"
        elif "warning" in (log.description or "").lower():
            level = "warning"
        component = extra.get("component") or log.resource_type or "system"
        ts = log.created_at.isoformat() if log.created_at else ""
        log_entries.append({
            "id": log.id,
            "level": level,
            "component": component,
            "message": log.description or "No message",
            "timestamp": ts,
            "stack_trace": extra.get("stack_trace"),
        })
    rows = system_logs_to_rows(log_entries)
    if not rows:
        raise HTTPException(status_code=404, detail="No system logs to export")
    export_svc = ExportService()
    fmt = format.lower()
    if fmt == "excel":
        out = export_svc.export_to_excel(
            rows, "system_logs", "System Logs", SYSTEM_EXPORT_HEADERS)
    else:
        out = export_svc.export_to_csv(
            rows, "system_logs", SYSTEM_EXPORT_HEADERS)
    return {"file_name": out["file_name"], "format": out["format"]}


@router.get("/users/{user_id}/export")
async def export_user_activity_logs(
    user_id: str,
    format: str = Query("csv", description="csv or excel"),
    page_size: int = Query(5000, ge=1, le=10000),
    current_user: User = Depends(require_permission(Permission.AUDIT_EXPORT)),
    db: AsyncSession = Depends(get_db),
):
    """Export user activity logs as CSV or Excel."""
    from app.core.permissions import has_permission
    if not has_permission(current_user.role_slug, Permission.AUDIT_ADMIN) and current_user.id != user_id:
        raise HTTPException(
            status_code=403, detail="You can only export your own logs")
    repo = AuditRepository(db)
    logs = await repo.get_by_user(user_id, skip=0, limit=page_size)
    rows = audit_logs_to_rows(list(logs))
    if not rows:
        raise HTTPException(
            status_code=404, detail="No user activity logs to export")
    export_svc = ExportService()
    fmt = format.lower()
    if fmt == "excel":
        out = export_svc.export_to_excel(
            rows, f"user_activity_{user_id}", "User Activity", AUDIT_EXPORT_HEADERS)
    else:
        out = export_svc.export_to_csv(
            rows, f"user_activity_{user_id}", AUDIT_EXPORT_HEADERS)
    return {"file_name": out["file_name"], "format": out["format"]}
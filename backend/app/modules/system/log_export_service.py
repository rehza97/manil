"""
Log export helpers.
Builds flat rows from audit/system logs for CSV/Excel export.
"""
from typing import Any, Dict, List
from datetime import datetime, timezone

from app.modules.audit.models import AuditAction


AUDIT_EXPORT_HEADERS = [
    "timestamp", "user_email", "user_id", "action", "resource_type",
    "resource_id", "ip_address", "success", "description",
    "request_method", "request_path",
]

SYSTEM_EXPORT_HEADERS = ["id", "level", "component",
                         "message", "timestamp", "stack_trace"]

SECURITY_ACTIONS = [
    AuditAction.LOGIN_SUCCESS,
    AuditAction.LOGIN_FAILED,
    AuditAction.LOGOUT,
    AuditAction.PASSWORD_CHANGE,
    AuditAction.PASSWORD_RESET,
    AuditAction.TWO_FA_ENABLED,
    AuditAction.TWO_FA_DISABLED,
    AuditAction.SECURITY_ALERT,
]


def _serialize_dt(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def audit_logs_to_rows(logs: List[Any]) -> List[Dict[str, Any]]:
    """Convert audit log entries (ORM or Pydantic) to export rows."""
    rows = []
    for log in logs:
        if hasattr(log, "model_dump") and callable(log.model_dump):
            d = log.model_dump()
        else:
            d = {
                "action": getattr(log, "action", None),
                "resource_type": getattr(log, "resource_type", ""),
                "resource_id": getattr(log, "resource_id", ""),
                "description": getattr(log, "description", ""),
                "user_id": getattr(log, "user_id", ""),
                "user_email": getattr(log, "user_email", ""),
                "ip_address": getattr(log, "ip_address", ""),
                "request_method": getattr(log, "request_method", ""),
                "request_path": getattr(log, "request_path", ""),
                "success": getattr(log, "success", True),
                "created_at": getattr(log, "created_at", None),
            }
        action = d.get("action")
        if hasattr(action, "value"):
            action = action.value
        rows.append({
            "timestamp": _serialize_dt(d.get("created_at")),
            "user_email": d.get("user_email") or "",
            "user_id": d.get("user_id") or "",
            "action": str(action) if action else "",
            "resource_type": d.get("resource_type") or "",
            "resource_id": d.get("resource_id") or "",
            "ip_address": d.get("ip_address") or "",
            "success": d.get("success", True),
            "description": d.get("description") or "",
            "request_method": d.get("request_method") or "",
            "request_path": d.get("request_path") or "",
        })
    return rows


def system_logs_to_rows(log_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert system log entries to export rows."""
    rows = []
    for log in log_entries:
        rows.append({
            "id": log.get("id", ""),
            "level": log.get("level", "info"),
            "component": log.get("component", ""),
            "message": log.get("message", ""),
            "timestamp": log.get("timestamp", ""),
            "stack_trace": log.get("stack_trace") or "",
        })
    return rows


def get_security_actions():
    """Return list of security-related audit actions for filtering."""
    return SECURITY_ACTIONS

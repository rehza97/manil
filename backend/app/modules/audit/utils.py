"""
Audit logging utility functions and decorators.
Provides helpers for automatic audit trail creation.
"""
from functools import wraps
from typing import Callable, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.modules.audit.models import AuditAction
from app.modules.audit.service import AuditService


def get_audit_action(operation: str) -> AuditAction:
    """Map CRUD operation to audit action."""
    operation_map = {
        "create": AuditAction.CREATE,
        "read": AuditAction.READ,
        "update": AuditAction.UPDATE,
        "delete": AuditAction.DELETE,
    }
    return operation_map.get(operation.lower(), AuditAction.CREATE)


async def log_crud_action(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    description: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    request: Optional[Request] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
):
    """
    Helper function to log CRUD actions.

    Args:
        db: Database session
        action: CRUD action (create, read, update, delete)
        resource_type: Type of resource
        resource_id: ID of resource
        description: Action description
        user_id: User ID
        user_email: User email
        user_role: User role
        request: FastAPI request
        old_values: Old values for updates
        new_values: New values for creates/updates
    """
    audit_service = AuditService(db)
    audit_action = get_audit_action(action)

    await audit_service.log_action(
        action=audit_action,
        resource_type=resource_type,
        resource_id=resource_id,
        description=description,
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        request=request,
        old_values=old_values,
        new_values=new_values,
    )


def audit_log(
    resource_type: str, action: str, description_template: str
) -> Callable:
    """
    Decorator for automatic audit logging of function calls.

    Args:
        resource_type: Type of resource being accessed
        action: Action being performed (create, read, update, delete)
        description_template: Template for log description

    Example:
        @audit_log("customer", "create", "Created customer {email}")
        async def create_customer(db, data, current_user):
            # Function implementation
            pass
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute the function
            result = await func(*args, **kwargs)

            # Try to extract common parameters
            db = kwargs.get("db") or (args[0] if len(args) > 0 else None)
            current_user = kwargs.get("current_user")
            request = kwargs.get("request")

            if db and current_user:
                # Format description with result data if available
                try:
                    description = description_template.format(
                        **result.model_dump() if hasattr(result, "model_dump") else {}
                    )
                except:
                    description = description_template

                # Log the action
                await log_crud_action(
                    db=db,
                    action=action,
                    resource_type=resource_type,
                    resource_id=getattr(result, "id", None),
                    description=description,
                    user_id=getattr(current_user, "id", None),
                    user_email=getattr(current_user, "email", None),
                    user_role=getattr(current_user, "role", None),
                    request=request,
                    new_values=(
                        result.model_dump() if hasattr(result, "model_dump") else None
                    ),
                )

            return result

        return wrapper

    return decorator

"""
Permission system for role-based access control (RBAC).
Defines permissions for different user roles.
"""
from enum import Enum
from typing import Set


class Permission(str, Enum):
    """Permission enumeration for fine-grained access control."""

    # Customer permissions
    CUSTOMERS_VIEW = "customers:view"
    CUSTOMERS_CREATE = "customers:create"
    CUSTOMERS_EDIT = "customers:edit"
    CUSTOMERS_DELETE = "customers:delete"

    # Ticket permissions
    TICKETS_VIEW = "tickets:view"
    TICKETS_CREATE = "tickets:create"
    TICKETS_REPLY = "tickets:reply"
    TICKETS_ASSIGN = "tickets:assign"
    TICKETS_CLOSE = "tickets:close"
    TICKETS_DELETE = "tickets:delete"

    # Product permissions
    PRODUCTS_VIEW = "products:view"
    PRODUCTS_CREATE = "products:create"
    PRODUCTS_EDIT = "products:edit"
    PRODUCTS_DELETE = "products:delete"

    # Order permissions
    ORDERS_VIEW = "orders:view"
    ORDERS_CREATE = "orders:create"
    ORDERS_EDIT = "orders:edit"
    ORDERS_APPROVE = "orders:approve"
    ORDERS_DELIVER = "orders:deliver"
    ORDERS_DELETE = "orders:delete"

    # Invoice permissions
    INVOICES_VIEW = "invoices:view"
    INVOICES_CREATE = "invoices:create"
    INVOICES_EDIT = "invoices:edit"
    INVOICES_APPROVE = "invoices:approve"
    INVOICES_SEND = "invoices:send"
    INVOICES_DELETE = "invoices:delete"

    # Report permissions
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"

    # Settings permissions
    SETTINGS_VIEW = "settings:view"
    SETTINGS_EDIT = "settings:edit"

    # User management permissions
    USERS_VIEW = "users:view"
    USERS_CREATE = "users:create"
    USERS_EDIT = "users:edit"
    USERS_DELETE = "users:delete"

    # Role management permissions
    ROLES_VIEW = "roles:view"
    ROLES_CREATE = "roles:create"
    ROLES_EDIT = "roles:edit"
    ROLES_DELETE = "roles:delete"


# Role-based permission mappings
ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    "admin": {
        # Admin has all permissions
        Permission.CUSTOMERS_VIEW,
        Permission.CUSTOMERS_CREATE,
        Permission.CUSTOMERS_EDIT,
        Permission.CUSTOMERS_DELETE,
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.TICKETS_ASSIGN,
        Permission.TICKETS_CLOSE,
        Permission.TICKETS_DELETE,
        Permission.PRODUCTS_VIEW,
        Permission.PRODUCTS_CREATE,
        Permission.PRODUCTS_EDIT,
        Permission.PRODUCTS_DELETE,
        Permission.ORDERS_VIEW,
        Permission.ORDERS_CREATE,
        Permission.ORDERS_EDIT,
        Permission.ORDERS_APPROVE,
        Permission.ORDERS_DELIVER,
        Permission.ORDERS_DELETE,
        Permission.INVOICES_VIEW,
        Permission.INVOICES_CREATE,
        Permission.INVOICES_EDIT,
        Permission.INVOICES_APPROVE,
        Permission.INVOICES_SEND,
        Permission.INVOICES_DELETE,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_EDIT,
        Permission.USERS_VIEW,
        Permission.USERS_CREATE,
        Permission.USERS_EDIT,
        Permission.USERS_DELETE,
        Permission.ROLES_VIEW,
        Permission.ROLES_CREATE,
        Permission.ROLES_EDIT,
        Permission.ROLES_DELETE,
    },
    "corporate": {
        # Corporate can manage customers, tickets, products, orders
        Permission.CUSTOMERS_VIEW,
        Permission.CUSTOMERS_CREATE,
        Permission.CUSTOMERS_EDIT,
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.TICKETS_ASSIGN,
        Permission.TICKETS_CLOSE,
        Permission.PRODUCTS_VIEW,
        Permission.PRODUCTS_CREATE,
        Permission.PRODUCTS_EDIT,
        Permission.ORDERS_VIEW,
        Permission.ORDERS_CREATE,
        Permission.ORDERS_EDIT,
        Permission.ORDERS_APPROVE,
        Permission.ORDERS_DELIVER,
        Permission.INVOICES_VIEW,
        Permission.INVOICES_CREATE,
        Permission.INVOICES_EDIT,
        Permission.INVOICES_APPROVE,
        Permission.INVOICES_SEND,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        Permission.SETTINGS_VIEW,
    },
    "client": {
        # Client can only view their own data and create tickets/orders
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.PRODUCTS_VIEW,
        Permission.ORDERS_VIEW,
        Permission.ORDERS_CREATE,
        Permission.INVOICES_VIEW,
    },
}


def get_role_permissions(role: str) -> Set[Permission]:
    """
    Get permissions for a role.

    Args:
        role: User role

    Returns:
        Set of permissions for the role
    """
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(user_role: str, permission: Permission) -> bool:
    """
    Check if a role has a specific permission.

    Args:
        user_role: User role
        permission: Permission to check

    Returns:
        True if role has permission
    """
    role_perms = get_role_permissions(user_role)
    return permission in role_perms


def has_any_permission(user_role: str, permissions: list[Permission]) -> bool:
    """
    Check if a role has any of the specified permissions.

    Args:
        user_role: User role
        permissions: List of permissions to check

    Returns:
        True if role has at least one permission
    """
    role_perms = get_role_permissions(user_role)
    return any(perm in role_perms for perm in permissions)


def has_all_permissions(user_role: str, permissions: list[Permission]) -> bool:
    """
    Check if a role has all specified permissions.

    Args:
        user_role: User role
        permissions: List of permissions to check

    Returns:
        True if role has all permissions
    """
    role_perms = get_role_permissions(user_role)
    return all(perm in role_perms for perm in permissions)

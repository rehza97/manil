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
    CUSTOMERS_ACTIVATE = "customers:activate"
    CUSTOMERS_SUSPEND = "customers:suspend"
    CUSTOMERS_APPROVE = "customers:approve"
    CUSTOMERS_REJECT = "customers:reject"

    # KYC permissions
    KYC_VIEW = "kyc:view"
    KYC_UPLOAD = "kyc:upload"
    KYC_EDIT = "kyc:edit"
    KYC_DELETE = "kyc:delete"
    KYC_VERIFY = "kyc:verify"
    KYC_DOWNLOAD = "kyc:download"

    # Ticket permissions
    TICKETS_VIEW = "tickets:view"
    TICKETS_CREATE = "tickets:create"
    TICKETS_REPLY = "tickets:reply"
    TICKETS_ASSIGN = "tickets:assign"
    TICKETS_CLOSE = "tickets:close"
    TICKETS_DELETE = "tickets:delete"
    TICKETS_MANAGE = "tickets:manage"

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

    # Quote permissions
    QUOTES_VIEW = "quotes:view"
    QUOTES_CREATE = "quotes:create"
    QUOTES_EDIT = "quotes:edit"
    QUOTES_DELETE = "quotes:delete"

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

    # VPS Hosting permissions
    HOSTING_VIEW = "hosting:view"
    HOSTING_REQUEST = "hosting:request"
    HOSTING_UPGRADE = "hosting:upgrade"
    HOSTING_MANAGE = "hosting:manage"
    HOSTING_APPROVE = "hosting:approve"
    HOSTING_ADMIN = "hosting:admin"
    HOSTING_MONITOR = "hosting:monitor"

    # DNS Management permissions
    DNS_VIEW = "dns:view"
    DNS_MANAGE = "dns:manage"
    DNS_ADMIN = "dns:admin"
    DNS_TEMPLATES = "dns:templates"
    DNS_SYNC = "dns:sync"
    DNS_EXPORT = "dns:export"

    # Audit & Logging permissions
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"
    AUDIT_ADMIN = "audit:admin"

    # Notification permissions
    NOTIFICATIONS_VIEW = "notifications:view"
    NOTIFICATIONS_MANAGE = "notifications:manage"
    NOTIFICATIONS_SEND = "notifications:send"
    NOTIFICATIONS_ADMIN = "notifications:admin"

    # Email Management permissions
    EMAIL_VIEW = "email:view"
    EMAIL_MANAGE = "email:manage"
    EMAIL_TEMPLATES = "email:templates"
    EMAIL_BOUNCES = "email:bounces"
    EMAIL_HISTORY = "email:history"
    EMAIL_SYNC = "email:sync"

    # SMS permissions
    SMS_VIEW = "sms:view"
    SMS_SEND = "sms:send"
    SMS_MANAGE = "sms:manage"
    SMS_ADMIN = "sms:admin"

    # System permissions
    SYSTEM_VIEW = "system:view"
    SYSTEM_LOGS = "system:logs"
    SYSTEM_ALERTS = "system:alerts"
    SYSTEM_MAINTENANCE = "system:maintenance"
    SYSTEM_PERFORMANCE = "system:performance"
    SYSTEM_HEALTH = "system:health"

    # Customer extended permissions
    CUSTOMERS_NOTES = "customers:notes"
    CUSTOMERS_DOCUMENTS = "customers:documents"
    CUSTOMERS_EXPORT = "customers:export"
    CUSTOMERS_IMPORT = "customers:import"

    # Product extended permissions
    PRODUCTS_CATEGORIES = "products:categories"
    PRODUCTS_VARIANTS = "products:variants"
    PRODUCTS_IMAGES = "products:images"
    PRODUCTS_FEATURES = "products:features"

    # Quote extended permissions
    QUOTES_APPROVE = "quotes:approve"
    QUOTES_ACCEPT = "quotes:accept"
    QUOTES_REJECT = "quotes:reject"
    QUOTES_SEND = "quotes:send"
    QUOTES_CONVERT = "quotes:convert"

    # Invoice extended permissions
    INVOICES_PAY = "invoices:pay"
    INVOICES_CANCEL = "invoices:cancel"
    INVOICES_REFUND = "invoices:refund"
    INVOICES_VOID = "invoices:void"
    INVOICES_EXPORT = "invoices:export"

    # Ticket extended permissions
    TICKETS_REOPEN = "tickets:reopen"
    TICKETS_MERGE = "tickets:merge"
    TICKETS_ESCALATE = "tickets:escalate"
    TICKETS_WATCHERS = "tickets:watchers"
    TICKETS_SLA = "tickets:sla"
    TICKETS_TAGS = "tickets:tags"
    TICKETS_TEMPLATES = "tickets:templates"
    TICKETS_EMAIL = "tickets:email"

    # Registration permissions
    REGISTRATIONS_VIEW = "registrations:view"
    REGISTRATIONS_APPROVE = "registrations:approve"
    REGISTRATIONS_REJECT = "registrations:reject"
    REGISTRATIONS_MANAGE = "registrations:manage"

    # User extended permissions
    USERS_UNLOCK = "users:unlock"
    USERS_RESET_PASSWORD = "users:reset_password"
    USERS_SESSIONS = "users:sessions"
    USERS_ACTIVITY = "users:activity"
    USERS_EXPORT = "users:export"

    # Hosting extended permissions
    HOSTING_PROVISION = "hosting:provision"
    HOSTING_DEPROVISION = "hosting:deprovision"
    HOSTING_BACKUP = "hosting:backup"
    HOSTING_RESTORE = "hosting:restore"
    HOSTING_SNAPSHOTS = "hosting:snapshots"
    HOSTING_IMAGES = "hosting:images"
    HOSTING_DOMAINS = "hosting:domains"

    # Reports extended permissions
    REPORTS_CUSTOM = "reports:custom"
    REPORTS_SCHEDULE = "reports:schedule"


# Role-based permission mappings
ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    "admin": {
        # Admin has all permissions
        Permission.CUSTOMERS_VIEW,
        Permission.CUSTOMERS_CREATE,
        Permission.CUSTOMERS_EDIT,
        Permission.CUSTOMERS_DELETE,
        Permission.CUSTOMERS_ACTIVATE,
        Permission.CUSTOMERS_SUSPEND,
        Permission.CUSTOMERS_APPROVE,
        Permission.CUSTOMERS_REJECT,
        Permission.KYC_VIEW,
        Permission.KYC_UPLOAD,
        Permission.KYC_EDIT,
        Permission.KYC_DELETE,
        Permission.KYC_VERIFY,
        Permission.KYC_DOWNLOAD,
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.TICKETS_ASSIGN,
        Permission.TICKETS_CLOSE,
        Permission.TICKETS_DELETE,
        Permission.TICKETS_MANAGE,
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
        Permission.QUOTES_VIEW,
        Permission.QUOTES_CREATE,
        Permission.QUOTES_EDIT,
        Permission.QUOTES_DELETE,
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

        # VPS Hosting - full access
        Permission.HOSTING_VIEW,
        Permission.HOSTING_REQUEST,
        Permission.HOSTING_UPGRADE,
        Permission.HOSTING_MANAGE,
        Permission.HOSTING_APPROVE,
        Permission.HOSTING_ADMIN,
        Permission.HOSTING_MONITOR,

        # DNS Management - full access
        Permission.DNS_VIEW,
        Permission.DNS_MANAGE,
        Permission.DNS_ADMIN,
        Permission.DNS_TEMPLATES,
        Permission.DNS_SYNC,
        Permission.DNS_EXPORT,

        # Audit & Logging - full access
        Permission.AUDIT_VIEW,
        Permission.AUDIT_EXPORT,
        Permission.AUDIT_ADMIN,

        # Notifications - full access
        Permission.NOTIFICATIONS_VIEW,
        Permission.NOTIFICATIONS_MANAGE,
        Permission.NOTIFICATIONS_SEND,
        Permission.NOTIFICATIONS_ADMIN,

        # Email Management - full access
        Permission.EMAIL_VIEW,
        Permission.EMAIL_MANAGE,
        Permission.EMAIL_TEMPLATES,
        Permission.EMAIL_BOUNCES,
        Permission.EMAIL_HISTORY,
        Permission.EMAIL_SYNC,

        # SMS - full access
        Permission.SMS_VIEW,
        Permission.SMS_SEND,
        Permission.SMS_MANAGE,
        Permission.SMS_ADMIN,

        # System - full access
        Permission.SYSTEM_VIEW,
        Permission.SYSTEM_LOGS,
        Permission.SYSTEM_ALERTS,
        Permission.SYSTEM_MAINTENANCE,
        Permission.SYSTEM_PERFORMANCE,
        Permission.SYSTEM_HEALTH,

        # Customer extended - full access
        Permission.CUSTOMERS_NOTES,
        Permission.CUSTOMERS_DOCUMENTS,
        Permission.CUSTOMERS_EXPORT,
        Permission.CUSTOMERS_IMPORT,

        # Product extended - full access
        Permission.PRODUCTS_CATEGORIES,
        Permission.PRODUCTS_VARIANTS,
        Permission.PRODUCTS_IMAGES,
        Permission.PRODUCTS_FEATURES,

        # Quote extended - full access
        Permission.QUOTES_APPROVE,
        Permission.QUOTES_ACCEPT,
        Permission.QUOTES_REJECT,
        Permission.QUOTES_SEND,
        Permission.QUOTES_CONVERT,

        # Invoice extended - full access
        Permission.INVOICES_PAY,
        Permission.INVOICES_CANCEL,
        Permission.INVOICES_REFUND,
        Permission.INVOICES_VOID,
        Permission.INVOICES_EXPORT,

        # Ticket extended - full access
        Permission.TICKETS_REOPEN,
        Permission.TICKETS_MERGE,
        Permission.TICKETS_ESCALATE,
        Permission.TICKETS_WATCHERS,
        Permission.TICKETS_SLA,
        Permission.TICKETS_TAGS,
        Permission.TICKETS_TEMPLATES,
        Permission.TICKETS_EMAIL,

        # Registration - full access
        Permission.REGISTRATIONS_VIEW,
        Permission.REGISTRATIONS_APPROVE,
        Permission.REGISTRATIONS_REJECT,
        Permission.REGISTRATIONS_MANAGE,

        # User extended - full access
        Permission.USERS_UNLOCK,
        Permission.USERS_RESET_PASSWORD,
        Permission.USERS_SESSIONS,
        Permission.USERS_ACTIVITY,
        Permission.USERS_EXPORT,

        # Hosting extended - full access
        Permission.HOSTING_PROVISION,
        Permission.HOSTING_DEPROVISION,
        Permission.HOSTING_BACKUP,
        Permission.HOSTING_RESTORE,
        Permission.HOSTING_SNAPSHOTS,
        Permission.HOSTING_IMAGES,
        Permission.HOSTING_DOMAINS,

        # Reports extended - full access
        Permission.REPORTS_CUSTOM,
        Permission.REPORTS_SCHEDULE,
    },
    "corporate": {
        # Corporate can manage customers, tickets, products, orders
        Permission.CUSTOMERS_VIEW,
        Permission.CUSTOMERS_CREATE,
        Permission.CUSTOMERS_EDIT,
        Permission.CUSTOMERS_ACTIVATE,
        Permission.CUSTOMERS_SUSPEND,
        Permission.CUSTOMERS_APPROVE,
        Permission.CUSTOMERS_REJECT,
        Permission.KYC_VIEW,
        Permission.KYC_UPLOAD,
        Permission.KYC_EDIT,
        Permission.KYC_DELETE,
        Permission.KYC_VERIFY,
        Permission.KYC_DOWNLOAD,
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.TICKETS_ASSIGN,
        Permission.TICKETS_CLOSE,
        Permission.TICKETS_MANAGE,
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
        Permission.QUOTES_VIEW,
        Permission.QUOTES_CREATE,
        Permission.QUOTES_EDIT,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        Permission.SETTINGS_VIEW,

        # VPS Hosting - staff access (admin operations)
        Permission.HOSTING_VIEW,
        Permission.HOSTING_APPROVE,
        Permission.HOSTING_ADMIN,
        Permission.HOSTING_MONITOR,

        # DNS Management - admin access
        Permission.DNS_VIEW,
        Permission.DNS_ADMIN,
        Permission.DNS_TEMPLATES,
        Permission.DNS_SYNC,
        Permission.DNS_EXPORT,

        # Audit & Logging - view access
        Permission.AUDIT_VIEW,
        Permission.AUDIT_EXPORT,

        # Notifications - manage access
        Permission.NOTIFICATIONS_VIEW,
        Permission.NOTIFICATIONS_MANAGE,
        Permission.NOTIFICATIONS_SEND,

        # Email Management - manage access
        Permission.EMAIL_VIEW,
        Permission.EMAIL_MANAGE,
        Permission.EMAIL_TEMPLATES,
        Permission.EMAIL_BOUNCES,
        Permission.EMAIL_HISTORY,
        Permission.EMAIL_SYNC,

        # SMS - manage access
        Permission.SMS_VIEW,
        Permission.SMS_SEND,
        Permission.SMS_MANAGE,

        # System - view access
        Permission.SYSTEM_VIEW,
        Permission.SYSTEM_LOGS,
        Permission.SYSTEM_PERFORMANCE,

        # Customer extended
        Permission.CUSTOMERS_NOTES,
        Permission.CUSTOMERS_DOCUMENTS,
        Permission.CUSTOMERS_EXPORT,

        # Product extended
        Permission.PRODUCTS_CATEGORIES,
        Permission.PRODUCTS_VARIANTS,
        Permission.PRODUCTS_IMAGES,
        Permission.PRODUCTS_FEATURES,

        # Quote extended
        Permission.QUOTES_APPROVE,
        Permission.QUOTES_REJECT,
        Permission.QUOTES_SEND,
        Permission.QUOTES_CONVERT,

        # Invoice extended
        Permission.INVOICES_PAY,
        Permission.INVOICES_CANCEL,
        Permission.INVOICES_EXPORT,

        # Ticket extended
        Permission.TICKETS_REOPEN,
        Permission.TICKETS_MERGE,
        Permission.TICKETS_ESCALATE,
        Permission.TICKETS_WATCHERS,
        Permission.TICKETS_SLA,
        Permission.TICKETS_TAGS,
        Permission.TICKETS_TEMPLATES,
        Permission.TICKETS_EMAIL,

        # Registration
        Permission.REGISTRATIONS_VIEW,
        Permission.REGISTRATIONS_APPROVE,
        Permission.REGISTRATIONS_REJECT,
        Permission.REGISTRATIONS_MANAGE,

        # User extended
        Permission.USERS_UNLOCK,
        Permission.USERS_RESET_PASSWORD,
        Permission.USERS_SESSIONS,
        Permission.USERS_ACTIVITY,

        # Hosting extended
        Permission.HOSTING_PROVISION,
        Permission.HOSTING_DEPROVISION,
        Permission.HOSTING_BACKUP,
        Permission.HOSTING_RESTORE,
        Permission.HOSTING_SNAPSHOTS,
        Permission.HOSTING_IMAGES,
        Permission.HOSTING_DOMAINS,

        # Reports extended
        Permission.REPORTS_CUSTOM,
        Permission.REPORTS_SCHEDULE,
    },
    "client": {
        # Client can only view their own data and create tickets/orders
        Permission.KYC_VIEW,
        Permission.KYC_UPLOAD,
        Permission.KYC_DOWNLOAD,
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.PRODUCTS_VIEW,
        Permission.ORDERS_VIEW,
        Permission.ORDERS_CREATE,
        Permission.INVOICES_VIEW,
        Permission.QUOTES_VIEW,

        # VPS Hosting - customer access (own resources only, enforced by route checks)
        Permission.HOSTING_VIEW,
        Permission.HOSTING_REQUEST,
        Permission.HOSTING_UPGRADE,
        Permission.HOSTING_MANAGE,

        # DNS Management - customer access (own zones only, enforced by route checks)
        Permission.DNS_VIEW,
        Permission.DNS_MANAGE,

        # Notifications - view own
        Permission.NOTIFICATIONS_VIEW,

        # Quote extended - client actions
        Permission.QUOTES_ACCEPT,
        Permission.QUOTES_REJECT,

        # Invoice extended - view own
        Permission.INVOICES_EXPORT,

        # Ticket extended - basic operations
        Permission.TICKETS_WATCHERS,

        # Hosting extended - own resources
        Permission.HOSTING_BACKUP,
        Permission.HOSTING_RESTORE,
        Permission.HOSTING_SNAPSHOTS,
    },
    "support_agent": {
        # Ticket management - core support functions
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.TICKETS_CLOSE,
        Permission.TICKETS_WATCHERS,
        Permission.TICKETS_SLA,

        # Customer access - view customer info to assist with tickets
        Permission.CUSTOMERS_VIEW,

        # KYC access - view KYC documents to verify customer identity
        Permission.KYC_VIEW,
        Permission.KYC_DOWNLOAD,

        # Product/Order/Invoice access - view to help customers with questions
        Permission.PRODUCTS_VIEW,
        Permission.ORDERS_VIEW,
        Permission.INVOICES_VIEW,

        # Notifications - view own
        Permission.NOTIFICATIONS_VIEW,
    },
    "support_supervisor": {
        # Ticket management - full ticket operations including assignment
        Permission.TICKETS_VIEW,
        Permission.TICKETS_CREATE,
        Permission.TICKETS_REPLY,
        Permission.TICKETS_ASSIGN,
        Permission.TICKETS_CLOSE,
        Permission.TICKETS_REOPEN,
        Permission.TICKETS_MERGE,
        Permission.TICKETS_ESCALATE,
        Permission.TICKETS_WATCHERS,
        Permission.TICKETS_SLA,
        Permission.TICKETS_TAGS,
        Permission.TICKETS_TEMPLATES,

        # Customer access - view and edit customer info for support
        Permission.CUSTOMERS_VIEW,
        Permission.CUSTOMERS_EDIT,
        Permission.CUSTOMERS_NOTES,

        # KYC access - view and download KYC documents
        Permission.KYC_VIEW,
        Permission.KYC_DOWNLOAD,

        # Product/Order/Invoice access - view to help customers
        Permission.PRODUCTS_VIEW,
        Permission.ORDERS_VIEW,
        Permission.INVOICES_VIEW,

        # Reports - view support reports and analytics
        Permission.REPORTS_VIEW,

        # Notifications - manage
        Permission.NOTIFICATIONS_VIEW,
        Permission.NOTIFICATIONS_MANAGE,
        Permission.NOTIFICATIONS_SEND,
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

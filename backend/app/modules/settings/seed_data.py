"""
Seed data for roles and permissions.

Initial system roles and permissions based on core/permissions.py
"""
from typing import List, Dict
import uuid


# System permissions based on core/permissions.py
SYSTEM_PERMISSIONS = [
    # Customer permissions
    {"name": "View Customers", "slug": "customers:view", "category": "Customers", "resource": "customers", "action": "view", "description": "View customer list and details"},
    {"name": "Create Customers", "slug": "customers:create", "category": "Customers", "resource": "customers", "action": "create", "description": "Create new customers"},
    {"name": "Edit Customers", "slug": "customers:edit", "category": "Customers", "resource": "customers", "action": "edit", "description": "Edit customer information"},
    {"name": "Delete Customers", "slug": "customers:delete", "category": "Customers", "resource": "customers", "action": "delete", "description": "Delete customers"},
    {"name": "Activate Customers", "slug": "customers:activate", "category": "Customers", "resource": "customers", "action": "activate", "description": "Activate customer accounts"},
    {"name": "Suspend Customers", "slug": "customers:suspend", "category": "Customers", "resource": "customers", "action": "suspend", "description": "Suspend customer accounts"},

    # KYC permissions
    {"name": "View KYC", "slug": "kyc:view", "category": "KYC", "resource": "kyc", "action": "view", "description": "View KYC documents"},
    {"name": "Upload KYC", "slug": "kyc:upload", "category": "KYC", "resource": "kyc", "action": "upload", "description": "Upload KYC documents"},
    {"name": "Edit KYC", "slug": "kyc:edit", "category": "KYC", "resource": "kyc", "action": "edit", "description": "Edit KYC information"},
    {"name": "Delete KYC", "slug": "kyc:delete", "category": "KYC", "resource": "kyc", "action": "delete", "description": "Delete KYC documents"},
    {"name": "Verify KYC", "slug": "kyc:verify", "category": "KYC", "resource": "kyc", "action": "verify", "description": "Verify KYC documents"},
    {"name": "Download KYC", "slug": "kyc:download", "category": "KYC", "resource": "kyc", "action": "download", "description": "Download KYC documents"},

    # Ticket permissions
    {"name": "View Tickets", "slug": "tickets:view", "category": "Tickets", "resource": "tickets", "action": "view", "description": "View ticket list and details"},
    {"name": "Create Tickets", "slug": "tickets:create", "category": "Tickets", "resource": "tickets", "action": "create", "description": "Create new tickets"},
    {"name": "Reply Tickets", "slug": "tickets:reply", "category": "Tickets", "resource": "tickets", "action": "reply", "description": "Reply to tickets"},
    {"name": "Assign Tickets", "slug": "tickets:assign", "category": "Tickets", "resource": "tickets", "action": "assign", "description": "Assign tickets to users"},
    {"name": "Close Tickets", "slug": "tickets:close", "category": "Tickets", "resource": "tickets", "action": "close", "description": "Close tickets"},
    {"name": "Delete Tickets", "slug": "tickets:delete", "category": "Tickets", "resource": "tickets", "action": "delete", "description": "Delete tickets"},

    # Product permissions
    {"name": "View Products", "slug": "products:view", "category": "Products", "resource": "products", "action": "view", "description": "View product catalog"},
    {"name": "Create Products", "slug": "products:create", "category": "Products", "resource": "products", "action": "create", "description": "Create new products"},
    {"name": "Edit Products", "slug": "products:edit", "category": "Products", "resource": "products", "action": "edit", "description": "Edit product information"},
    {"name": "Delete Products", "slug": "products:delete", "category": "Products", "resource": "products", "action": "delete", "description": "Delete products"},

    # Order permissions
    {"name": "View Orders", "slug": "orders:view", "category": "Orders", "resource": "orders", "action": "view", "description": "View order list and details"},
    {"name": "Create Orders", "slug": "orders:create", "category": "Orders", "resource": "orders", "action": "create", "description": "Create new orders"},
    {"name": "Edit Orders", "slug": "orders:edit", "category": "Orders", "resource": "orders", "action": "edit", "description": "Edit order information"},
    {"name": "Approve Orders", "slug": "orders:approve", "category": "Orders", "resource": "orders", "action": "approve", "description": "Approve orders"},
    {"name": "Deliver Orders", "slug": "orders:deliver", "category": "Orders", "resource": "orders", "action": "deliver", "description": "Mark orders as delivered"},
    {"name": "Delete Orders", "slug": "orders:delete", "category": "Orders", "resource": "orders", "action": "delete", "description": "Delete orders"},

    # Invoice permissions
    {"name": "View Invoices", "slug": "invoices:view", "category": "Invoices", "resource": "invoices", "action": "view", "description": "View invoice list and details"},
    {"name": "Create Invoices", "slug": "invoices:create", "category": "Invoices", "resource": "invoices", "action": "create", "description": "Create new invoices"},
    {"name": "Edit Invoices", "slug": "invoices:edit", "category": "Invoices", "resource": "invoices", "action": "edit", "description": "Edit invoice information"},
    {"name": "Approve Invoices", "slug": "invoices:approve", "category": "Invoices", "resource": "invoices", "action": "approve", "description": "Approve invoices"},
    {"name": "Send Invoices", "slug": "invoices:send", "category": "Invoices", "resource": "invoices", "action": "send", "description": "Send invoices to customers"},
    {"name": "Delete Invoices", "slug": "invoices:delete", "category": "Invoices", "resource": "invoices", "action": "delete", "description": "Delete invoices"},

    # Report permissions
    {"name": "View Reports", "slug": "reports:view", "category": "Reports", "resource": "reports", "action": "view", "description": "View reports and analytics"},
    {"name": "Export Reports", "slug": "reports:export", "category": "Reports", "resource": "reports", "action": "export", "description": "Export reports in various formats"},

    # Settings permissions
    {"name": "View Settings", "slug": "settings:view", "category": "Settings", "resource": "settings", "action": "view", "description": "View system settings"},
    {"name": "Edit Settings", "slug": "settings:edit", "category": "Settings", "resource": "settings", "action": "edit", "description": "Edit system settings"},

    # User management permissions
    {"name": "View Users", "slug": "users:view", "category": "Users", "resource": "users", "action": "view", "description": "View user list and details"},
    {"name": "Create Users", "slug": "users:create", "category": "Users", "resource": "users", "action": "create", "description": "Create new users"},
    {"name": "Edit Users", "slug": "users:edit", "category": "Users", "resource": "users", "action": "edit", "description": "Edit user information"},
    {"name": "Delete Users", "slug": "users:delete", "category": "Users", "resource": "users", "action": "delete", "description": "Delete users"},

    # Role management permissions
    {"name": "View Roles", "slug": "roles:view", "category": "Roles", "resource": "roles", "action": "view", "description": "View role list and permissions"},
    {"name": "Create Roles", "slug": "roles:create", "category": "Roles", "resource": "roles", "action": "create", "description": "Create new roles"},
    {"name": "Edit Roles", "slug": "roles:edit", "category": "Roles", "resource": "roles", "action": "edit", "description": "Edit role information and permissions"},
    {"name": "Delete Roles", "slug": "roles:delete", "category": "Roles", "resource": "roles", "action": "delete", "description": "Delete roles"},
]


# System roles with permission slugs
SYSTEM_ROLES = [
    {
        "name": "Administrator",
        "slug": "admin",
        "description": "Full system access with all permissions",
        "is_system": True,
        "hierarchy_level": 0,
        "permissions": [p["slug"] for p in SYSTEM_PERMISSIONS]  # All permissions
    },
    {
        "name": "Corporate User",
        "slug": "corporate",
        "description": "Corporate staff with access to customer management, tickets, products, and orders",
        "is_system": True,
        "hierarchy_level": 1,
        "permissions": [
            "customers:view", "customers:create", "customers:edit", "customers:activate", "customers:suspend",
            "kyc:view", "kyc:upload", "kyc:edit", "kyc:delete", "kyc:verify", "kyc:download",
            "tickets:view", "tickets:create", "tickets:reply", "tickets:assign", "tickets:close",
            "products:view", "products:create", "products:edit",
            "orders:view", "orders:create", "orders:edit", "orders:approve", "orders:deliver",
            "invoices:view", "invoices:create", "invoices:edit", "invoices:approve", "invoices:send",
            "reports:view", "reports:export",
            "settings:view",
        ]
    },
    {
        "name": "Client",
        "slug": "client",
        "description": "Customer/client with limited access to their own data",
        "is_system": True,
        "hierarchy_level": 2,
        "permissions": [
            "kyc:view", "kyc:upload", "kyc:download",
            "tickets:view", "tickets:create", "tickets:reply",
            "products:view",
            "orders:view", "orders:create",
            "invoices:view",
        ]
    },
]


def get_permissions() -> List[Dict]:
    """Get list of system permissions."""
    return SYSTEM_PERMISSIONS


def get_roles() -> List[Dict]:
    """Get list of system roles with permissions."""
    return SYSTEM_ROLES

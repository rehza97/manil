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

    # VPS Hosting permissions
    {"name": "View Hosting", "slug": "hosting:view", "category": "Hosting", "resource": "hosting", "action": "view", "description": "View VPS plans and subscription details"},
    {"name": "Request Hosting", "slug": "hosting:request", "category": "Hosting", "resource": "hosting", "action": "request", "description": "Request a new VPS subscription"},
    {"name": "Upgrade Hosting", "slug": "hosting:upgrade", "category": "Hosting", "resource": "hosting", "action": "upgrade", "description": "Upgrade a VPS subscription plan"},
    {"name": "Manage Hosting", "slug": "hosting:manage", "category": "Hosting", "resource": "hosting", "action": "manage", "description": "Manage VPS instances (start/stop/reboot/cancel)"},
    {"name": "Approve Hosting Requests", "slug": "hosting:approve", "category": "Hosting", "resource": "hosting", "action": "approve", "description": "Approve or reject VPS subscription requests"},
    {"name": "Admin Hosting", "slug": "hosting:admin", "category": "Hosting", "resource": "hosting", "action": "admin", "description": "Administer all VPS subscriptions across customers"},
    {"name": "Monitor Hosting", "slug": "hosting:monitor", "category": "Hosting", "resource": "hosting", "action": "monitor", "description": "View system-wide VPS monitoring and alerts"},

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

    # DNS Management permissions
    {"name": "View DNS", "slug": "dns:view", "category": "DNS", "resource": "dns", "action": "view", "description": "View DNS zones and records"},
    {"name": "Manage DNS", "slug": "dns:manage", "category": "DNS", "resource": "dns", "action": "manage", "description": "Manage DNS zones and records"},
    {"name": "Admin DNS", "slug": "dns:admin", "category": "DNS", "resource": "dns", "action": "admin", "description": "Administer all DNS zones (not just own)"},
    {"name": "DNS Templates", "slug": "dns:templates", "category": "DNS", "resource": "dns", "action": "templates", "description": "Manage DNS zone templates"},
    {"name": "DNS Sync", "slug": "dns:sync", "category": "DNS", "resource": "dns", "action": "sync", "description": "Sync DNS zones"},
    {"name": "DNS Export", "slug": "dns:export", "category": "DNS", "resource": "dns", "action": "export", "description": "Export DNS configurations"},

    # Audit & Logging permissions
    {"name": "View Audit Logs", "slug": "audit:view", "category": "Audit", "resource": "audit", "action": "view", "description": "View audit logs"},
    {"name": "Export Audit Logs", "slug": "audit:export", "category": "Audit", "resource": "audit", "action": "export", "description": "Export audit logs"},
    {"name": "Admin Audit Logs", "slug": "audit:admin", "category": "Audit", "resource": "audit", "action": "admin", "description": "View all users' audit logs (not just own)"},

    # Notification permissions
    {"name": "View Notifications", "slug": "notifications:view", "category": "Notifications", "resource": "notifications", "action": "view", "description": "View own notifications"},
    {"name": "Manage Notifications", "slug": "notifications:manage", "category": "Notifications", "resource": "notifications", "action": "manage", "description": "Manage notification groups"},
    {"name": "Send Notifications", "slug": "notifications:send", "category": "Notifications", "resource": "notifications", "action": "send", "description": "Send notifications to users/groups"},
    {"name": "Admin Notifications", "slug": "notifications:admin", "category": "Notifications", "resource": "notifications", "action": "admin", "description": "Admin notification system"},

    # Email Management permissions
    {"name": "View Email", "slug": "email:view", "category": "Email", "resource": "email", "action": "view", "description": "View email accounts"},
    {"name": "Manage Email", "slug": "email:manage", "category": "Email", "resource": "email", "action": "manage", "description": "Manage email accounts"},
    {"name": "Email Templates", "slug": "email:templates", "category": "Email", "resource": "email", "action": "templates", "description": "Manage email templates"},
    {"name": "Email Bounces", "slug": "email:bounces", "category": "Email", "resource": "email", "action": "bounces", "description": "View/manage email bounces"},
    {"name": "Email History", "slug": "email:history", "category": "Email", "resource": "email", "action": "history", "description": "View email send history"},
    {"name": "Email Sync", "slug": "email:sync", "category": "Email", "resource": "email", "action": "sync", "description": "Sync email accounts"},

    # SMS permissions
    {"name": "View SMS", "slug": "sms:view", "category": "SMS", "resource": "sms", "action": "view", "description": "View SMS messages"},
    {"name": "Send SMS", "slug": "sms:send", "category": "SMS", "resource": "sms", "action": "send", "description": "Send SMS messages"},
    {"name": "Manage SMS", "slug": "sms:manage", "category": "SMS", "resource": "sms", "action": "manage", "description": "Manage SMS configuration"},
    {"name": "Admin SMS", "slug": "sms:admin", "category": "SMS", "resource": "sms", "action": "admin", "description": "Admin SMS system"},

    # System permissions
    {"name": "View System", "slug": "system:view", "category": "System", "resource": "system", "action": "view", "description": "View system stats"},
    {"name": "System Logs", "slug": "system:logs", "category": "System", "resource": "system", "action": "logs", "description": "View system logs"},
    {"name": "System Alerts", "slug": "system:alerts", "category": "System", "resource": "system", "action": "alerts", "description": "View/manage system alerts"},
    {"name": "System Maintenance", "slug": "system:maintenance", "category": "System", "resource": "system", "action": "maintenance", "description": "Perform maintenance operations"},
    {"name": "System Performance", "slug": "system:performance", "category": "System", "resource": "system", "action": "performance", "description": "View performance metrics"},
    {"name": "System Health", "slug": "system:health", "category": "System", "resource": "system", "action": "health", "description": "View detailed health status"},

    # Customer extended permissions
    {"name": "Customer Notes", "slug": "customers:notes", "category": "Customers", "resource": "customers", "action": "notes", "description": "Manage customer notes"},
    {"name": "Customer Documents", "slug": "customers:documents", "category": "Customers", "resource": "customers", "action": "documents", "description": "Manage customer documents"},
    {"name": "Export Customers", "slug": "customers:export", "category": "Customers", "resource": "customers", "action": "export", "description": "Export customer data"},
    {"name": "Import Customers", "slug": "customers:import", "category": "Customers", "resource": "customers", "action": "import", "description": "Import customer data"},
    {"name": "Approve Customers", "slug": "customers:approve", "category": "Customers", "resource": "customers", "action": "approve", "description": "Approve customer registrations"},
    {"name": "Reject Customers", "slug": "customers:reject", "category": "Customers", "resource": "customers", "action": "reject", "description": "Reject customer registrations"},

    # Product extended permissions
    {"name": "Product Categories", "slug": "products:categories", "category": "Products", "resource": "products", "action": "categories", "description": "Manage product categories"},
    {"name": "Product Variants", "slug": "products:variants", "category": "Products", "resource": "products", "action": "variants", "description": "Manage product variants"},
    {"name": "Product Images", "slug": "products:images", "category": "Products", "resource": "products", "action": "images", "description": "Manage product images"},
    {"name": "Product Features", "slug": "products:features", "category": "Products", "resource": "products", "action": "features", "description": "Manage product features"},

    # Quote permissions
    {"name": "View Quotes", "slug": "quotes:view", "category": "Quotes", "resource": "quotes", "action": "view", "description": "View quote list and details"},
    {"name": "Create Quotes", "slug": "quotes:create", "category": "Quotes", "resource": "quotes", "action": "create", "description": "Create new quotes"},
    {"name": "Edit Quotes", "slug": "quotes:edit", "category": "Quotes", "resource": "quotes", "action": "edit", "description": "Edit quote information"},
    {"name": "Delete Quotes", "slug": "quotes:delete", "category": "Quotes", "resource": "quotes", "action": "delete", "description": "Delete quotes"},
    {"name": "Approve Quotes", "slug": "quotes:approve", "category": "Quotes", "resource": "quotes", "action": "approve", "description": "Approve quotes"},
    {"name": "Accept Quotes", "slug": "quotes:accept", "category": "Quotes", "resource": "quotes", "action": "accept", "description": "Accept quotes (client)"},
    {"name": "Reject Quotes", "slug": "quotes:reject", "category": "Quotes", "resource": "quotes", "action": "reject", "description": "Reject quotes"},
    {"name": "Send Quotes", "slug": "quotes:send", "category": "Quotes", "resource": "quotes", "action": "send", "description": "Send quotes to customers"},
    {"name": "Convert Quotes", "slug": "quotes:convert", "category": "Quotes", "resource": "quotes", "action": "convert", "description": "Convert quotes to invoices"},

    # Invoice extended permissions
    {"name": "Pay Invoices", "slug": "invoices:pay", "category": "Invoices", "resource": "invoices", "action": "pay", "description": "Record invoice payments"},
    {"name": "Cancel Invoices", "slug": "invoices:cancel", "category": "Invoices", "resource": "invoices", "action": "cancel", "description": "Cancel invoices"},
    {"name": "Refund Invoices", "slug": "invoices:refund", "category": "Invoices", "resource": "invoices", "action": "refund", "description": "Process refunds"},
    {"name": "Void Invoices", "slug": "invoices:void", "category": "Invoices", "resource": "invoices", "action": "void", "description": "Void invoices"},
    {"name": "Export Invoices", "slug": "invoices:export", "category": "Invoices", "resource": "invoices", "action": "export", "description": "Export invoices"},

    # Ticket extended permissions
    {"name": "Reopen Tickets", "slug": "tickets:reopen", "category": "Tickets", "resource": "tickets", "action": "reopen", "description": "Reopen closed tickets"},
    {"name": "Merge Tickets", "slug": "tickets:merge", "category": "Tickets", "resource": "tickets", "action": "merge", "description": "Merge tickets"},
    {"name": "Escalate Tickets", "slug": "tickets:escalate", "category": "Tickets", "resource": "tickets", "action": "escalate", "description": "Escalate tickets"},
    {"name": "Ticket Watchers", "slug": "tickets:watchers", "category": "Tickets", "resource": "tickets", "action": "watchers", "description": "Manage ticket watchers"},
    {"name": "Ticket SLA", "slug": "tickets:sla", "category": "Tickets", "resource": "tickets", "action": "sla", "description": "View/manage SLA metrics"},
    {"name": "Ticket Tags", "slug": "tickets:tags", "category": "Tickets", "resource": "tickets", "action": "tags", "description": "Manage ticket tags"},
    {"name": "Ticket Templates", "slug": "tickets:templates", "category": "Tickets", "resource": "tickets", "action": "templates", "description": "Manage canned replies/templates"},
    {"name": "Ticket Email", "slug": "tickets:email", "category": "Tickets", "resource": "tickets", "action": "email", "description": "Manage email-to-ticket integration"},
    {"name": "Manage Tickets", "slug": "tickets:manage", "category": "Tickets", "resource": "tickets", "action": "manage", "description": "Full ticket management access"},

    # Registration permissions
    {"name": "View Registrations", "slug": "registrations:view", "category": "Registrations", "resource": "registrations", "action": "view", "description": "View registration requests"},
    {"name": "Approve Registrations", "slug": "registrations:approve", "category": "Registrations", "resource": "registrations", "action": "approve", "description": "Approve registrations"},
    {"name": "Reject Registrations", "slug": "registrations:reject", "category": "Registrations", "resource": "registrations", "action": "reject", "description": "Reject registrations"},
    {"name": "Manage Registrations", "slug": "registrations:manage", "category": "Registrations", "resource": "registrations", "action": "manage", "description": "Manage registration workflow"},

    # User extended permissions
    {"name": "Unlock Users", "slug": "users:unlock", "category": "Users", "resource": "users", "action": "unlock", "description": "Unlock locked accounts"},
    {"name": "Reset User Password", "slug": "users:reset_password", "category": "Users", "resource": "users", "action": "reset_password", "description": "Reset user passwords (admin-initiated)"},
    {"name": "User Sessions", "slug": "users:sessions", "category": "Users", "resource": "users", "action": "sessions", "description": "View/manage user sessions"},
    {"name": "User Activity", "slug": "users:activity", "category": "Users", "resource": "users", "action": "activity", "description": "View user activity logs"},
    {"name": "Export Users", "slug": "users:export", "category": "Users", "resource": "users", "action": "export", "description": "Export user data"},

    # Hosting extended permissions
    {"name": "Provision Hosting", "slug": "hosting:provision", "category": "Hosting", "resource": "hosting", "action": "provision", "description": "Provision VPS instances"},
    {"name": "Deprovision Hosting", "slug": "hosting:deprovision", "category": "Hosting", "resource": "hosting", "action": "deprovision", "description": "Deprovision VPS instances"},
    {"name": "Hosting Backup", "slug": "hosting:backup", "category": "Hosting", "resource": "hosting", "action": "backup", "description": "Manage backups"},
    {"name": "Hosting Restore", "slug": "hosting:restore", "category": "Hosting", "resource": "hosting", "action": "restore", "description": "Restore from backups"},
    {"name": "Hosting Snapshots", "slug": "hosting:snapshots", "category": "Hosting", "resource": "hosting", "action": "snapshots", "description": "Manage snapshots"},
    {"name": "Hosting Images", "slug": "hosting:images", "category": "Hosting", "resource": "hosting", "action": "images", "description": "Manage custom images"},
    {"name": "Hosting Domains", "slug": "hosting:domains", "category": "Hosting", "resource": "hosting", "action": "domains", "description": "Manage service domains"},

    # Reports extended permissions
    {"name": "Custom Reports", "slug": "reports:custom", "category": "Reports", "resource": "reports", "action": "custom", "description": "Create custom reports"},
    {"name": "Schedule Reports", "slug": "reports:schedule", "category": "Reports", "resource": "reports", "action": "schedule", "description": "Schedule automated reports"},
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
            "customers:approve", "customers:reject", "customers:notes", "customers:documents", "customers:export",
            "kyc:view", "kyc:upload", "kyc:edit", "kyc:delete", "kyc:verify", "kyc:download",
            "tickets:view", "tickets:create", "tickets:reply", "tickets:assign", "tickets:close",
            "tickets:reopen", "tickets:merge", "tickets:escalate", "tickets:watchers", "tickets:sla",
            "tickets:tags", "tickets:templates", "tickets:email", "tickets:manage",
            "products:view", "products:create", "products:edit",
            "products:categories", "products:variants", "products:images", "products:features",
            "orders:view", "orders:create", "orders:edit", "orders:approve", "orders:deliver",
            "invoices:view", "invoices:create", "invoices:edit", "invoices:approve", "invoices:send",
            "invoices:pay", "invoices:cancel", "invoices:export",
            "quotes:view", "quotes:create", "quotes:edit",
            "quotes:approve", "quotes:reject", "quotes:send", "quotes:convert",
            # Hosting (staff/admin ops)
            "hosting:view", "hosting:approve", "hosting:admin", "hosting:monitor",
            "hosting:provision", "hosting:deprovision", "hosting:backup", "hosting:restore",
            "hosting:snapshots", "hosting:images", "hosting:domains",
            # DNS Management
            "dns:view", "dns:admin", "dns:templates", "dns:sync", "dns:export",
            # Audit & Logging
            "audit:view", "audit:export",
            # Notifications
            "notifications:view", "notifications:manage", "notifications:send",
            # Email Management
            "email:view", "email:manage", "email:templates", "email:bounces", "email:history", "email:sync",
            # SMS
            "sms:view", "sms:send", "sms:manage",
            # System
            "system:view", "system:logs", "system:performance",
            # Reports
            "reports:view", "reports:export", "reports:custom", "reports:schedule",
            # Settings
            "settings:view",
            # Registration
            "registrations:view", "registrations:approve", "registrations:reject", "registrations:manage",
            # User extended
            "users:unlock", "users:reset_password", "users:sessions", "users:activity",
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
            "tickets:view", "tickets:create", "tickets:reply", "tickets:watchers",
            "products:view",
            "orders:view", "orders:create",
            "invoices:view", "invoices:export",
            "quotes:view", "quotes:accept", "quotes:reject",
            # Hosting (own resources only; ownership checks enforced by routes)
            "hosting:view", "hosting:request", "hosting:upgrade", "hosting:manage",
            "hosting:backup", "hosting:restore", "hosting:snapshots",
            # DNS Management (own zones only)
            "dns:view", "dns:manage",
            # Notifications
            "notifications:view",
        ]
    },
    {
        "name": "Support Agent",
        "slug": "support_agent",
        "description": "Support team member with access to tickets and customer information for customer service",
        "is_system": True,
        "hierarchy_level": 1,
        "permissions": [
            # Ticket management - core support functions
            "tickets:view", "tickets:create", "tickets:reply", "tickets:close",
            "tickets:watchers", "tickets:sla",
            # Customer access - view customer info to assist with tickets
            "customers:view",
            # KYC access - view KYC documents to verify customer identity
            "kyc:view", "kyc:download",
            # Product/Order/Invoice access - view to help customers with questions
            "products:view",
            "orders:view",
            "invoices:view",
            # Notifications - view own
            "notifications:view",
        ]
    },
    {
        "name": "Support Supervisor",
        "slug": "support_supervisor",
        "description": "Support team supervisor with additional permissions to assign tickets and manage support operations",
        "is_system": True,
        "hierarchy_level": 1,
        "permissions": [
            # Ticket management - full ticket operations including assignment
            "tickets:view", "tickets:create", "tickets:reply", "tickets:assign", "tickets:close",
            "tickets:reopen", "tickets:merge", "tickets:escalate", "tickets:watchers", "tickets:sla",
            "tickets:tags", "tickets:templates",
            # Customer access - view and edit customer info for support
            "customers:view", "customers:edit", "customers:notes",
            # KYC access - view and download KYC documents
            "kyc:view", "kyc:download",
            # Product/Order/Invoice access - view to help customers
            "products:view",
            "orders:view",
            "invoices:view",
            # Reports - view support reports and analytics
            "reports:view",
            # Notifications
            "notifications:view", "notifications:manage", "notifications:send",
        ]
    },
]


def get_permissions() -> List[Dict]:
    """Get list of system permissions."""
    return SYSTEM_PERMISSIONS


def get_roles() -> List[Dict]:
    """Get list of system roles with permissions."""
    return SYSTEM_ROLES


# System settings with default values
SYSTEM_SETTINGS = [
    # General settings
    {
        "key": "application_name",
        "value": "CloudHost",
        "category": "general",
        "description": "Application name displayed throughout the system",
        "is_public": True,
    },
    {
        "key": "support_email",
        "value": "support@cloudhost.dz",
        "category": "general",
        "description": "Primary support email address",
        "is_public": True,
    },
    {
        "key": "support_phone",
        "value": "+213 (0) 21 XX XX XX",
        "category": "general",
        "description": "Support phone number",
        "is_public": True,
    },
    {
        "key": "timezone",
        "value": "Africa/Algiers",
        "category": "general",
        "description": "System default timezone",
        "is_public": False,
    },
    {
        "key": "date_format",
        "value": "DD/MM/YYYY",
        "category": "general",
        "description": "Default date format",
        "is_public": False,
    },
    {
        "key": "currency",
        "value": "DZD",
        "category": "general",
        "description": "System currency",
        "is_public": True,
    },
    {
        "key": "language",
        "value": "en",
        "category": "general",
        "description": "System default language",
        "is_public": False,
    },

    # Email settings
    {
        "key": "smtp_host",
        "value": "smtp.gmail.com",
        "category": "email",
        "description": "SMTP server hostname",
        "is_public": False,
    },
    {
        "key": "smtp_port",
        "value": 587,
        "category": "email",
        "description": "SMTP server port",
        "is_public": False,
    },
    {
        "key": "smtp_username",
        "value": "",
        "category": "email",
        "description": "SMTP authentication username",
        "is_public": False,
    },
    {
        "key": "smtp_password",
        "value": "",
        "category": "email",
        "description": "SMTP authentication password",
        "is_public": False,
    },
    {
        "key": "smtp_use_tls",
        "value": True,
        "category": "email",
        "description": "Use TLS for SMTP connection",
        "is_public": False,
    },
    {
        "key": "from_email",
        "value": "noreply@cloudhost.dz",
        "category": "email",
        "description": "Default sender email address",
        "is_public": False,
    },
    {
        "key": "from_name",
        "value": "CloudHost",
        "category": "email",
        "description": "Default sender name",
        "is_public": False,
    },

    # Security settings
    {
        "key": "password_min_length",
        "value": 8,
        "category": "security",
        "description": "Minimum password length",
        "is_public": False,
    },
    {
        "key": "password_require_uppercase",
        "value": True,
        "category": "security",
        "description": "Require uppercase letters in passwords",
        "is_public": False,
    },
    {
        "key": "password_require_lowercase",
        "value": True,
        "category": "security",
        "description": "Require lowercase letters in passwords",
        "is_public": False,
    },
    {
        "key": "password_require_numbers",
        "value": True,
        "category": "security",
        "description": "Require numbers in passwords",
        "is_public": False,
    },
    {
        "key": "password_require_symbols",
        "value": False,
        "category": "security",
        "description": "Require symbols in passwords",
        "is_public": False,
    },
    {
        "key": "session_timeout",
        "value": 3600,
        "category": "security",
        "description": "Session timeout in seconds (1 hour default)",
        "is_public": False,
    },
    {
        "key": "max_login_attempts",
        "value": 5,
        "category": "security",
        "description": "Maximum failed login attempts before account lockout",
        "is_public": False,
    },
    {
        "key": "lockout_duration",
        "value": 900,
        "category": "security",
        "description": "Account lockout duration in seconds (15 minutes default)",
        "is_public": False,
    },
    {
        "key": "require_2fa",
        "value": False,
        "category": "security",
        "description": "Require two-factor authentication for all users",
        "is_public": False,
    },

    # Notification settings
    {
        "key": "email_notifications",
        "value": True,
        "category": "notifications",
        "description": "Enable email notifications",
        "is_public": False,
    },
    {
        "key": "sms_notifications",
        "value": False,
        "category": "notifications",
        "description": "Enable SMS notifications",
        "is_public": False,
    },
    {
        "key": "push_notifications",
        "value": False,
        "category": "notifications",
        "description": "Enable push notifications",
        "is_public": False,
    },
    {
        "key": "maintenance_notifications",
        "value": True,
        "category": "notifications",
        "description": "Send maintenance notifications to users",
        "is_public": False,
    },
    {
        "key": "security_notifications",
        "value": True,
        "category": "notifications",
        "description": "Send security-related notifications",
        "is_public": False,
    },
    {
        "key": "marketing_notifications",
        "value": False,
        "category": "notifications",
        "description": "Send marketing and promotional notifications",
        "is_public": False,
    },

    # Backup settings
    {
        "key": "backup_enabled",
        "value": True,
        "category": "backup",
        "description": "Enable automatic database backups",
        "is_public": False,
    },
    {
        "key": "backup_frequency",
        "value": "daily",
        "category": "backup",
        "description": "Backup frequency (daily, weekly, monthly)",
        "is_public": False,
    },
    {
        "key": "backup_retention_days",
        "value": 30,
        "category": "backup",
        "description": "Number of days to retain backups",
        "is_public": False,
    },
    {
        "key": "backup_location",
        "value": "/app/backups",
        "category": "backup",
        "description": "Backup storage location",
        "is_public": False,
    },
    {
        "key": "auto_backup",
        "value": True,
        "category": "backup",
        "description": "Enable automatic scheduled backups",
        "is_public": False,
    },

    # API settings
    {
        "key": "api_rate_limit",
        "value": 100,
        "category": "api",
        "description": "API rate limit (requests per minute)",
        "is_public": False,
    },
    {
        "key": "api_key_expiry_days",
        "value": 365,
        "category": "api",
        "description": "API key expiration period in days",
        "is_public": False,
    },
    {
        "key": "api_versioning_enabled",
        "value": True,
        "category": "api",
        "description": "Enable API versioning",
        "is_public": False,
    },
    {
        "key": "api_documentation_enabled",
        "value": True,
        "category": "api",
        "description": "Enable API documentation (Swagger/OpenAPI)",
        "is_public": True,
    },

    # Storage settings
    {
        "key": "max_file_size",
        "value": 10485760,
        "category": "storage",
        "description": "Maximum file size in bytes (10MB default)",
        "is_public": False,
    },
    {
        "key": "allowed_file_types",
        "value": ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif", "zip"],
        "category": "storage",
        "description": "Allowed file types for uploads",
        "is_public": False,
    },
    {
        "key": "storage_provider",
        "value": "local",
        "category": "storage",
        "description": "Storage provider (local, s3, azure, gcp)",
        "is_public": False,
    },
    {
        "key": "storage_path",
        "value": "/app/uploads",
        "category": "storage",
        "description": "Local storage path for uploaded files",
        "is_public": False,
    },
    {
        "key": "s3_bucket",
        "value": "",
        "category": "storage",
        "description": "AWS S3 bucket name",
        "is_public": False,
    },
    {
        "key": "s3_region",
        "value": "us-east-1",
        "category": "storage",
        "description": "AWS S3 region",
        "is_public": False,
    },
    {
        "key": "s3_access_key",
        "value": "",
        "category": "storage",
        "description": "AWS S3 access key",
        "is_public": False,
    },
    {
        "key": "s3_secret_key",
        "value": "",
        "category": "storage",
        "description": "AWS S3 secret key",
        "is_public": False,
    },

    # SMS settings
    {
        "key": "sms_provider",
        "value": "custom",
        "category": "sms",
        "description": "SMS provider (custom, twilio, infobip, mock)",
        "is_public": False,
    },
    {
        "key": "sms_enabled",
        "value": False,
        "category": "sms",
        "description": "Enable SMS functionality",
        "is_public": False,
    },
    {
        "key": "twilio_account_sid",
        "value": "",
        "category": "sms",
        "description": "Twilio account SID",
        "is_public": False,
    },
    {
        "key": "twilio_auth_token",
        "value": "",
        "category": "sms",
        "description": "Twilio authentication token",
        "is_public": False,
    },
    {
        "key": "twilio_phone_number",
        "value": "",
        "category": "sms",
        "description": "Twilio phone number for sending SMS",
        "is_public": False,
    },
    {
        "key": "sms_sender_name",
        "value": "CloudHost",
        "category": "sms",
        "description": "SMS sender name/ID",
        "is_public": False,
    },
]


def get_settings() -> List[Dict]:
    """Get list of default system settings."""
    return SYSTEM_SETTINGS

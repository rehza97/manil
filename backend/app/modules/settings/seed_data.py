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
            # Hosting (staff/admin ops)
            "hosting:view", "hosting:approve", "hosting:admin", "hosting:monitor",
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
            # Hosting (own resources only; ownership checks enforced by routes)
            "hosting:view", "hosting:request", "hosting:upgrade", "hosting:manage",
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
            # Customer access - view customer info to assist with tickets
            "customers:view",
            # KYC access - view KYC documents to verify customer identity
            "kyc:view", "kyc:download",
            # Product/Order/Invoice access - view to help customers with questions
            "products:view",
            "orders:view",
            "invoices:view",
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
            # Customer access - view and edit customer info for support
            "customers:view", "customers:edit",
            # KYC access - view and download KYC documents
            "kyc:view", "kyc:download",
            # Product/Order/Invoice access - view to help customers
            "products:view",
            "orders:view",
            "invoices:view",
            # Reports - view support reports and analytics
            "reports:view",
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
        "value": "twilio",
        "category": "sms",
        "description": "SMS provider (twilio, nexmo, custom)",
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

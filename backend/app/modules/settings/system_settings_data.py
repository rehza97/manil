"""
System settings definitions.

Predefined system settings with defaults, validation, and categories.
"""
from typing import Dict, Any, List


# Setting categories
class SettingCategory:
    """Setting category constants."""
    GENERAL = "general"
    EMAIL = "email"
    NOTIFICATION = "notification"
    SECURITY = "security"
    BACKUP = "backup"
    API = "api"


# System settings with defaults
SYSTEM_SETTINGS: List[Dict[str, Any]] = [
    # ========================================================================
    # General Settings
    # ========================================================================
    {
        "key": "general.app_name",
        "value": {"value": "CloudManager", "type": "string"},
        "category": SettingCategory.GENERAL,
        "description": "Application name displayed throughout the system",
        "is_public": True,
    },
    {
        "key": "general.company_name",
        "value": {"value": "CloudManager SARL", "type": "string"},
        "category": SettingCategory.GENERAL,
        "description": "Company legal name for invoices and documents",
        "is_public": True,
    },
    {
        "key": "general.company_address",
        "value": {
            "street": "123 Rue Didouche Mourad",
            "city": "Algiers",
            "postal_code": "16000",
            "country": "Algeria",
            "type": "object"
        },
        "category": SettingCategory.GENERAL,
        "description": "Company address for invoices and legal documents",
        "is_public": False,
    },
    {
        "key": "general.company_contact",
        "value": {
            "phone": "+213 (0) 21 123 456",
            "fax": "+213 (0) 21 123 457",
            "email": "contact@cloudmanager.dz",
            "website": "www.cloudmanager.dz",
            "type": "object"
        },
        "category": SettingCategory.GENERAL,
        "description": "Company contact information",
        "is_public": True,
    },
    {
        "key": "general.company_legal",
        "value": {
            "nif": "001234567890123",
            "rc": "16/00-1234567",
            "ai": "16123456789012",
            "type": "object"
        },
        "category": SettingCategory.GENERAL,
        "description": "Company legal registration numbers",
        "is_public": False,
    },
    {
        "key": "general.timezone",
        "value": {"value": "Africa/Algiers", "type": "string"},
        "category": SettingCategory.GENERAL,
        "description": "Default timezone for the application",
        "is_public": True,
    },
    {
        "key": "general.language",
        "value": {"value": "en", "options": ["en", "fr", "ar"], "type": "enum"},
        "category": SettingCategory.GENERAL,
        "description": "Default application language",
        "is_public": True,
    },
    {
        "key": "general.currency",
        "value": {"value": "DZD", "symbol": "DZD", "format": "{amount} DZD", "type": "object"},
        "category": SettingCategory.GENERAL,
        "description": "Default currency for invoices and pricing",
        "is_public": True,
    },
    {
        "key": "general.date_format",
        "value": {"value": "DD/MM/YYYY", "type": "string"},
        "category": SettingCategory.GENERAL,
        "description": "Date display format",
        "is_public": True,
    },
    {
        "key": "general.time_format",
        "value": {"value": "24h", "options": ["12h", "24h"], "type": "enum"},
        "category": SettingCategory.GENERAL,
        "description": "Time display format (12-hour or 24-hour)",
        "is_public": True,
    },

    # ========================================================================
    # Email Settings
    # ========================================================================
    {
        "key": "email.provider",
        "value": {"value": "smtp", "options": ["smtp", "sendgrid"], "type": "enum"},
        "category": SettingCategory.EMAIL,
        "description": "Email service provider",
        "is_public": False,
    },
    {
        "key": "email.smtp_config",
        "value": {
            "host": "localhost",
            "port": 587,
            "user": "",
            "use_tls": True,
            "type": "object"
        },
        "category": SettingCategory.EMAIL,
        "description": "SMTP server configuration (password stored separately)",
        "is_public": False,
    },
    {
        "key": "email.from_address",
        "value": {"value": "noreply@cloudmanager.dz", "type": "string"},
        "category": SettingCategory.EMAIL,
        "description": "Default sender email address",
        "is_public": False,
    },
    {
        "key": "email.from_name",
        "value": {"value": "CloudManager", "type": "string"},
        "category": SettingCategory.EMAIL,
        "description": "Default sender name",
        "is_public": False,
    },
    {
        "key": "email.reply_to",
        "value": {"value": "support@cloudmanager.dz", "type": "string"},
        "category": SettingCategory.EMAIL,
        "description": "Reply-to email address",
        "is_public": False,
    },
    {
        "key": "email.daily_limit",
        "value": {"value": 1000, "type": "integer"},
        "category": SettingCategory.EMAIL,
        "description": "Maximum emails to send per day",
        "is_public": False,
    },
    {
        "key": "email.rate_limit",
        "value": {"value": 10, "per": "minute", "type": "object"},
        "category": SettingCategory.EMAIL,
        "description": "Email sending rate limit",
        "is_public": False,
    },
    {
        "key": "email.retry_config",
        "value": {
            "max_attempts": 3,
            "retry_delay": 300,
            "backoff_multiplier": 2,
            "type": "object"
        },
        "category": SettingCategory.EMAIL,
        "description": "Email retry configuration (delay in seconds)",
        "is_public": False,
    },

    # ========================================================================
    # Notification Settings
    # ========================================================================
    {
        "key": "notification.email_enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.NOTIFICATION,
        "description": "Enable email notifications",
        "is_public": False,
    },
    {
        "key": "notification.sms_enabled",
        "value": {"value": False, "type": "boolean"},
        "category": SettingCategory.NOTIFICATION,
        "description": "Enable SMS notifications",
        "is_public": False,
    },
    {
        "key": "notification.ticket_events",
        "value": {
            "created": True,
            "replied": True,
            "assigned": True,
            "status_changed": True,
            "closed": True,
            "type": "object"
        },
        "category": SettingCategory.NOTIFICATION,
        "description": "Ticket notification events to trigger",
        "is_public": False,
    },
    {
        "key": "notification.order_events",
        "value": {
            "created": True,
            "approved": True,
            "shipped": True,
            "delivered": True,
            "cancelled": True,
            "type": "object"
        },
        "category": SettingCategory.NOTIFICATION,
        "description": "Order notification events to trigger",
        "is_public": False,
    },
    {
        "key": "notification.invoice_events",
        "value": {
            "issued": True,
            "sent": True,
            "payment_received": True,
            "overdue": True,
            "type": "object"
        },
        "category": SettingCategory.NOTIFICATION,
        "description": "Invoice notification events to trigger",
        "is_public": False,
    },
    {
        "key": "notification.digest_enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.NOTIFICATION,
        "description": "Enable daily notification digest",
        "is_public": False,
    },
    {
        "key": "notification.digest_time",
        "value": {"value": "09:00", "type": "string"},
        "category": SettingCategory.NOTIFICATION,
        "description": "Time to send daily digest (24-hour format)",
        "is_public": False,
    },
    {
        "key": "notification.quiet_hours",
        "value": {
            "enabled": True,
            "start": "22:00",
            "end": "08:00",
            "type": "object"
        },
        "category": SettingCategory.NOTIFICATION,
        "description": "Quiet hours when notifications are suppressed",
        "is_public": False,
    },

    # ========================================================================
    # Security Settings
    # ========================================================================
    {
        "key": "security.password_policy",
        "value": {
            "min_length": 8,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special": True,
            "type": "object"
        },
        "category": SettingCategory.SECURITY,
        "description": "Password complexity requirements",
        "is_public": False,
    },
    {
        "key": "security.password_expiry",
        "value": {"value": 90, "enabled": False, "type": "object"},
        "category": SettingCategory.SECURITY,
        "description": "Password expiry in days (0 = never)",
        "is_public": False,
    },
    {
        "key": "security.session_timeout",
        "value": {"value": 3600, "type": "integer"},
        "category": SettingCategory.SECURITY,
        "description": "Session timeout in seconds (3600 = 1 hour)",
        "is_public": False,
    },
    {
        "key": "security.max_login_attempts",
        "value": {"value": 5, "type": "integer"},
        "category": SettingCategory.SECURITY,
        "description": "Maximum failed login attempts before lockout",
        "is_public": False,
    },
    {
        "key": "security.lockout_duration",
        "value": {"value": 900, "type": "integer"},
        "category": SettingCategory.SECURITY,
        "description": "Account lockout duration in seconds (900 = 15 minutes)",
        "is_public": False,
    },
    {
        "key": "security.2fa_required",
        "value": {
            "admin": True,
            "corporate": False,
            "client": False,
            "type": "object"
        },
        "category": SettingCategory.SECURITY,
        "description": "Require 2FA for specific roles",
        "is_public": False,
    },
    {
        "key": "security.ip_whitelist_enabled",
        "value": {"value": False, "type": "boolean"},
        "category": SettingCategory.SECURITY,
        "description": "Enable IP address whitelisting",
        "is_public": False,
    },
    {
        "key": "security.ip_whitelist",
        "value": {"value": [], "type": "array"},
        "category": SettingCategory.SECURITY,
        "description": "List of whitelisted IP addresses/ranges",
        "is_public": False,
    },
    {
        "key": "security.rate_limiting",
        "value": {
            "enabled": True,
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "type": "object"
        },
        "category": SettingCategory.SECURITY,
        "description": "API rate limiting configuration",
        "is_public": False,
    },

    # ========================================================================
    # Backup Settings
    # ========================================================================
    {
        "key": "backup.enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.BACKUP,
        "description": "Enable automatic backups",
        "is_public": False,
    },
    {
        "key": "backup.schedule",
        "value": {
            "frequency": "daily",
            "time": "02:00",
            "type": "object"
        },
        "category": SettingCategory.BACKUP,
        "description": "Backup schedule configuration",
        "is_public": False,
    },
    {
        "key": "backup.retention",
        "value": {
            "daily": 7,
            "weekly": 4,
            "monthly": 12,
            "type": "object"
        },
        "category": SettingCategory.BACKUP,
        "description": "Backup retention policy (number of backups to keep)",
        "is_public": False,
    },
    {
        "key": "backup.storage_path",
        "value": {"value": "/backups", "type": "string"},
        "category": SettingCategory.BACKUP,
        "description": "Backup storage directory path",
        "is_public": False,
    },
    {
        "key": "backup.compression_enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.BACKUP,
        "description": "Enable backup compression",
        "is_public": False,
    },
    {
        "key": "backup.encryption_enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.BACKUP,
        "description": "Enable backup encryption",
        "is_public": False,
    },
    {
        "key": "backup.include_attachments",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.BACKUP,
        "description": "Include file attachments in backups",
        "is_public": False,
    },

    # ========================================================================
    # API Settings
    # ========================================================================
    {
        "key": "api.enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.API,
        "description": "Enable public API access",
        "is_public": True,
    },
    {
        "key": "api.base_url",
        "value": {"value": "https://api.cloudmanager.dz/v1", "type": "string"},
        "category": SettingCategory.API,
        "description": "API base URL",
        "is_public": True,
    },
    {
        "key": "api.documentation_url",
        "value": {"value": "https://api.cloudmanager.dz/docs", "type": "string"},
        "category": SettingCategory.API,
        "description": "API documentation URL",
        "is_public": True,
    },
    {
        "key": "api.rate_limit",
        "value": {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "requests_per_day": 10000,
            "type": "object"
        },
        "category": SettingCategory.API,
        "description": "API rate limiting per API key",
        "is_public": True,
    },
    {
        "key": "api.token_expiry",
        "value": {"value": 3600, "type": "integer"},
        "category": SettingCategory.API,
        "description": "API token expiry in seconds (3600 = 1 hour)",
        "is_public": False,
    },
    {
        "key": "api.webhook_enabled",
        "value": {"value": True, "type": "boolean"},
        "category": SettingCategory.API,
        "description": "Enable webhook functionality",
        "is_public": False,
    },
    {
        "key": "api.webhook_retry",
        "value": {
            "max_attempts": 3,
            "retry_delay": 60,
            "type": "object"
        },
        "category": SettingCategory.API,
        "description": "Webhook retry configuration",
        "is_public": False,
    },
    {
        "key": "api.cors_origins",
        "value": {
            "value": ["https://cloudmanager.dz", "http://localhost:3000"],
            "type": "array"
        },
        "category": SettingCategory.API,
        "description": "Allowed CORS origins",
        "is_public": False,
    },
]


def get_system_settings() -> List[Dict[str, Any]]:
    """Get all system settings."""
    return SYSTEM_SETTINGS


def get_settings_by_category(category: str) -> List[Dict[str, Any]]:
    """Get settings filtered by category."""
    return [s for s in SYSTEM_SETTINGS if s["category"] == category]


def get_public_settings() -> List[Dict[str, Any]]:
    """Get all public settings."""
    return [s for s in SYSTEM_SETTINGS if s["is_public"]]


def get_setting_categories() -> List[str]:
    """Get list of all setting categories."""
    return [
        SettingCategory.GENERAL,
        SettingCategory.EMAIL,
        SettingCategory.NOTIFICATION,
        SettingCategory.SECURITY,
        SettingCategory.BACKUP,
        SettingCategory.API,
    ]

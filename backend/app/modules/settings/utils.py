"""
Settings utility functions.

Helper functions for retrieving and updating system settings.
"""
from typing import Any, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.settings.models import SystemSetting


class SettingsManager:
    """Helper class for managing system settings."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._cache: Dict[str, Any] = {}

    async def get(self, key: str, default: Any = None, use_cache: bool = True) -> Any:
        """
        Get a setting value by key.

        Args:
            key: Setting key
            default: Default value if setting not found
            use_cache: Use cached value if available

        Returns:
            Setting value or default
        """
        # Check cache
        if use_cache and key in self._cache:
            return self._cache[key]

        # Query database
        query = select(SystemSetting).where(SystemSetting.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            value = setting.value.get("value", default)
            self._cache[key] = value
            return value

        return default

    async def set(self, key: str, value: Any, updated_by_id: Optional[str] = None) -> bool:
        """
        Set a setting value.

        Args:
            key: Setting key
            value: New value
            updated_by_id: User ID making the change

        Returns:
            True if successful
        """
        query = select(SystemSetting).where(SystemSetting.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            # Update existing setting
            setting.value["value"] = value
            setting.updated_by_id = updated_by_id
            await self.db.commit()

            # Update cache
            self._cache[key] = value
            return True

        return False

    async def get_category(self, category: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get all settings in a category.

        Args:
            category: Category name
            use_cache: Use cached values if available

        Returns:
            Dictionary of setting key-value pairs
        """
        query = select(SystemSetting).where(SystemSetting.category == category)
        result = await self.db.execute(query)
        settings = result.scalars().all()

        category_settings = {}
        for setting in settings:
            value = setting.value.get("value") if isinstance(setting.value, dict) else None
            category_settings[setting.key] = value

            # Update cache
            if use_cache:
                self._cache[setting.key] = value

        return category_settings

    async def get_public(self) -> Dict[str, Any]:
        """
        Get all public settings.

        Returns:
            Dictionary of public setting key-value pairs
        """
        query = select(SystemSetting).where(SystemSetting.is_public == True)
        result = await self.db.execute(query)
        settings = result.scalars().all()

        public_settings = {}
        for setting in settings:
            value = setting.value.get("value") if isinstance(setting.value, dict) else None
            public_settings[setting.key] = value

        return public_settings

    def clear_cache(self, key: Optional[str] = None):
        """
        Clear settings cache.

        Args:
            key: Specific key to clear, or None to clear all
        """
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()


# Convenience functions for common settings
async def get_app_name(db: AsyncSession) -> str:
    """Get application name."""
    manager = SettingsManager(db)
    return await manager.get("general.app_name", "CloudManager")


async def get_company_name(db: AsyncSession) -> str:
    """Get company name."""
    manager = SettingsManager(db)
    return await manager.get("general.company_name", "CloudManager SARL")


async def get_timezone(db: AsyncSession) -> str:
    """Get default timezone."""
    manager = SettingsManager(db)
    return await manager.get("general.timezone", "Africa/Algiers")


async def get_notification_email_enabled(db: AsyncSession) -> bool:
    """Whether system allows sending email notifications (notification.email_enabled)."""
    manager = SettingsManager(db)
    return bool(await manager.get("notification.email_enabled", True))


async def get_notification_sms_enabled(db: AsyncSession) -> bool:
    """Whether system allows sending SMS notifications (notification.sms_enabled)."""
    manager = SettingsManager(db)
    return bool(await manager.get("notification.sms_enabled", True))


def _notification_events_key(event: str) -> tuple[str, str] | None:
    """Map event e.g. 'ticket.created' -> ('notification.ticket_events', 'created')."""
    if not event or "." not in event:
        return None
    domain, key = event.split(".", 1)
    mapping = {
        "ticket": "notification.ticket_events",
        "order": "notification.order_events",
        "invoice": "notification.invoice_events",
        "quote": "notification.quote_events",
        "kyc": "notification.kyc_events",
    }
    setting_key = mapping.get(domain)
    return (setting_key, key) if setting_key else None


async def is_within_quiet_hours(db: AsyncSession) -> bool:
    """
    Check if current time is within quiet hours.
    Returns True if notifications should be blocked (within quiet hours).
    """
    from datetime import datetime
    import pytz

    manager = SettingsManager(db)
    quiet_hours = await manager.get("notification.quiet_hours", None)

    if not quiet_hours or not isinstance(quiet_hours, dict):
        return False  # No quiet hours configured

    if not quiet_hours.get("enabled", False):
        return False  # Quiet hours disabled

    start_hour = quiet_hours.get("start", 22)  # Default 10 PM
    end_hour = quiet_hours.get("end", 7)  # Default 7 AM

    # Get current time in configured timezone
    timezone_str = await manager.get("general.timezone", "Africa/Algiers")
    try:
        tz = pytz.timezone(timezone_str)
    except Exception:
        tz = pytz.UTC

    current_hour = datetime.now(tz).hour

    # Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if start_hour > end_hour:
        return current_hour >= start_hour or current_hour < end_hour
    else:
        return start_hour <= current_hour < end_hour


async def notification_gate_allows(
    db: AsyncSession,
    channel: str,
    event: Optional[str] = None,
    user_id: Optional[str] = None,
    skip_quiet_hours: bool = False
) -> bool:
    """
    Check if system allows sending a notification.

    Args:
        db: Database session
        channel: 'email' | 'sms' | 'push'
        event: e.g. 'ticket.created', 'order.approved', 'invoice.sent'. Optional.
        user_id: User ID to check user-specific preferences. Optional.
        skip_quiet_hours: Skip quiet hours check (for urgent notifications).

    Returns:
        True if notification should be sent, False otherwise.

    Checks (in order):
    1. Global channel toggle (email_enabled, sms_enabled)
    2. Event-level toggle (if event provided)
    3. Quiet hours (unless skip_quiet_hours=True)
    4. User preferences (if user_id provided)
    """
    # 1. Check global channel toggle
    if channel == "email":
        if not await get_notification_email_enabled(db):
            return False
    elif channel == "sms":
        if not await get_notification_sms_enabled(db):
            return False
    elif channel == "push":
        # Push notifications follow email enabled setting for now
        if not await get_notification_email_enabled(db):
            return False
    else:
        return False

    # 2. Check event-level toggle
    if event:
        ev = _notification_events_key(event)
        if ev:
            manager = SettingsManager(db)
            ev_cfg = await manager.get(ev[0], {})
            if isinstance(ev_cfg, dict) and ev[1] in ev_cfg:
                if not ev_cfg[ev[1]]:
                    return False

    # 3. Check quiet hours (unless skipped for urgent notifications)
    if not skip_quiet_hours and await is_within_quiet_hours(db):
        return False

    # 4. Check user preferences (if user_id provided)
    if user_id and event:
        user_allows = await check_user_notification_preference(db, user_id, channel, event)
        if not user_allows:
            return False

    return True


async def check_user_notification_preference(
    db: AsyncSession,
    user_id: str,
    channel: str,
    event: str
) -> bool:
    """
    Check if user allows notifications for this channel and event type.

    Maps events to preference keys:
    - ticket.* -> ticketUpdates
    - order.* -> orderUpdates
    - invoice.* -> invoiceUpdates

    Returns True if user allows (or no preference set), False if explicitly disabled.
    """
    from app.modules.settings.repository import UserNotificationPreferencesRepository

    repo = UserNotificationPreferencesRepository(db)
    user_prefs = await repo.get_by_user_id(user_id)

    if not user_prefs:
        return True  # No user preferences, allow by default

    prefs = user_prefs.preferences
    if not prefs or not isinstance(prefs, dict):
        return True

    # Map event to preference key
    event_domain = event.split(".")[0] if "." in event else event
    pref_key_map = {
        "ticket": "ticketUpdates",
        "order": "orderUpdates",
        "invoice": "invoiceUpdates",
        "quote": "orderUpdates",  # Quotes grouped with orders
        "kyc": "accountUpdates",
        "marketing": "marketing",
    }

    pref_key = pref_key_map.get(event_domain)
    if not pref_key:
        return True  # Unknown event type, allow by default

    # Check channel preferences
    channel_prefs = prefs.get(channel, {})
    if isinstance(channel_prefs, dict):
        return channel_prefs.get(pref_key, True)

    return True


async def get_company_info_for_pdf(db: AsyncSession) -> Dict[str, Any]:
    """Build company_info dict for PDF templates (app_name, company_name from general settings)."""
    app = await get_app_name(db)
    company = await get_company_name(db)
    return {"name": app, "legal_name": company}


# Cache for role -> permission slugs (DB-backed). TTL 60s.
_role_permission_cache: Dict[str, Any] = {}
_ROLE_PERMISSION_CACHE_TTL = 60


async def get_role_id_by_slug(db: AsyncSession, slug: str) -> Optional[Any]:
    """
    Get role ID by slug. Used when creating users (e.g. registration -> client role).
    """
    from app.modules.settings.models import Role
    result = await db.execute(select(Role.id).where(Role.slug == slug, Role.is_active == True))
    return result.scalar_one_or_none()


async def get_role_permission_slugs_by_id_cached(
    db: AsyncSession, role_id: str
) -> Optional[set]:
    """
    Get permission slugs for a role by ID. Uses short TTL cache.
    Returns None if role not found.
    """
    import time
    now = time.time()
    cache_key = f"role_perms_id:{role_id}"
    ent = _role_permission_cache.get(cache_key)
    if ent and (now - ent.get("_ts", 0)) < _ROLE_PERMISSION_CACHE_TTL:
        return ent.get("slugs")
    try:
        from app.modules.settings.repository import RoleRepository
        from app.modules.settings.service import RoleService
        from uuid import UUID
        role_repo = RoleRepository(db)
        role = await role_repo.get_by_id(UUID(role_id))
        if not role:
            return None
        svc = RoleService(db)
        slugs = await svc.get_role_permissions(role.id, include_inherited=True)
        _role_permission_cache[cache_key] = {"slugs": slugs, "_ts": now}
        return slugs
    except Exception:
        return None


async def get_role_permission_slugs_cached(
    db: AsyncSession, role_slug: str
) -> Optional[set]:
    """
    Get permission slugs for a role from DB (settings Role), with short TTL cache.
    Returns None on failure or if role not found -> use fallback ROLE_PERMISSIONS.
    """
    import time

    now = time.time()
    cache_key = f"role_perms:{role_slug}"
    ent = _role_permission_cache.get(cache_key)
    if ent and (now - ent.get("_ts", 0)) < _ROLE_PERMISSION_CACHE_TTL:
        return ent.get("slugs")

    try:
        from app.modules.settings.repository import RoleRepository
        from app.modules.settings.service import RoleService

        role_repo = RoleRepository(db)
        role = await role_repo.get_by_slug(role_slug)
        if not role:
            return None
        svc = RoleService(db)
        slugs = await svc.get_role_permissions(role.id, include_inherited=True)
        _role_permission_cache[cache_key] = {"slugs": slugs, "_ts": now}
        return slugs
    except Exception:
        return None


async def get_email_config(db: AsyncSession) -> Dict[str, Any]:
    """
    Get email configuration from DB.
    Returns all email.* settings including SMTP config (host, port, user, use_tls).
    Password remains in env (SMTP_PASSWORD) for security.
    """
    manager = SettingsManager(db)
    return await manager.get_category("email")


async def get_email_display_config(db: AsyncSession) -> Dict[str, Optional[str]]:
    """
    Get from_address, from_name, reply_to from DB (display/header-only).
    """
    from app.config.settings import get_settings

    cfg = await get_email_config(db)
    if not isinstance(cfg, dict):
        cfg = {}
    s = get_settings()
    return {
        "from_address": cfg.get("email.from_address") or s.EMAIL_FROM,
        "from_name": cfg.get("email.from_name") or s.EMAIL_FROM_NAME,
        "reply_to": cfg.get("email.reply_to") or None,
    }


async def get_email_smtp_config(db: AsyncSession) -> Dict[str, Any]:
    """
    Get SMTP connection config from DB (host, port, user, use_tls).
    Password remains in env (SMTP_PASSWORD) for security.
    Falls back to env if DB config not available.
    """
    from app.config.settings import get_settings

    cfg = await get_email_config(db)
    if not isinstance(cfg, dict):
        cfg = {}
    s = get_settings()

    smtp_cfg = cfg.get("email.smtp_config", {})
    if not isinstance(smtp_cfg, dict):
        smtp_cfg = {}
    if isinstance(smtp_cfg, dict):
        port_val = smtp_cfg.get("port")
        if port_val is not None:
            try:
                port = int(port_val)
            except (ValueError, TypeError):
                port = getattr(s, "SMTP_PORT", 587)
        else:
            port = getattr(s, "SMTP_PORT", 587)
        return {
            "host": smtp_cfg.get("host") or getattr(s, "SMTP_HOST", "localhost"),
            "port": port,
            "user": smtp_cfg.get("user") or getattr(s, "SMTP_USERNAME", ""),
            "use_tls": smtp_cfg.get("use_tls", getattr(s, "SMTP_USE_TLS", True)),
            # Password always from env for security
            "password": getattr(s, "SMTP_PASSWORD", ""),
        }

    # Fallback to env if DB config not available
    return {
        "host": getattr(s, "SMTP_HOST", "localhost"),
        "port": getattr(s, "SMTP_PORT", 587),
        "user": getattr(s, "SMTP_USERNAME", ""),
        "use_tls": getattr(s, "SMTP_USE_TLS", True),
        "password": getattr(s, "SMTP_PASSWORD", ""),
    }


async def get_sms_config(db: AsyncSession) -> Dict[str, Any]:
    """
    Get SMS provider and Twilio config from DB.
    Returns provider ("twilio" | "custom"), twilio {account_sid, auth_token, from_number}.
    Env used as fallback when DB values empty.
    """
    from app.config.settings import get_settings

    manager = SettingsManager(db)
    sms_cfg = await manager.get_category("sms")
    s = get_settings()
    provider = (sms_cfg.get("sms.provider") or "").strip().lower() or (
        getattr(s, "SMS_PROVIDER", "custom") or "custom"
    )
    if provider not in ("twilio", "custom"):
        provider = "custom"
    account_sid = sms_cfg.get("sms.twilio.account_sid") or getattr(
        s, "TWILIO_ACCOUNT_SID", None
    ) or ""
    auth_token = sms_cfg.get("sms.twilio.auth_token") or getattr(
        s, "TWILIO_AUTH_TOKEN", None
    ) or ""
    from_number = sms_cfg.get("sms.twilio.from_number") or getattr(
        s, "TWILIO_FROM_NUMBER", None
    ) or getattr(s, "TWILIO_PHONE_NUMBER", None) or ""
    return {
        "provider": provider,
        "twilio": {
            "account_sid": account_sid.strip() if isinstance(account_sid, str) else "",
            "auth_token": auth_token.strip() if isinstance(auth_token, str) else "",
            "from_number": (from_number or "").strip() if isinstance(from_number, str) else "",
        },
    }


async def is_2fa_required(db: AsyncSession, role: str) -> bool:
    """Check if 2FA is required for a role."""
    manager = SettingsManager(db)
    config = await manager.get("security.2fa_required", {"admin": True, "corporate": False, "client": False})
    return config.get(role, False)


async def get_session_timeout(db: AsyncSession) -> int:
    """Get session timeout in seconds (used for JWT access token expiry)."""
    manager = SettingsManager(db)
    return await manager.get("security.session_timeout", 3600)


async def get_max_login_attempts(db: AsyncSession) -> int:
    """Get max failed login attempts before lockout."""
    manager = SettingsManager(db)
    return await manager.get("security.max_login_attempts", 5)


async def get_lockout_duration(db: AsyncSession) -> int:
    """Get lockout duration in seconds after max failed attempts."""
    manager = SettingsManager(db)
    return await manager.get("security.lockout_duration", 900)


async def get_rate_limit(db: AsyncSession) -> Dict[str, Any]:
    """Get API rate limit configuration."""
    manager = SettingsManager(db)
    return await manager.get("security.rate_limiting", {
        "enabled": True,
        "requests_per_minute": 60,
        "requests_per_hour": 1000
    })


# In-memory cache for rate limit config (TTL 60s) for middleware
_rate_limit_cache: Dict[str, Any] = {}
_RATE_LIMIT_CACHE_TTL = 60


async def get_rate_limit_cached() -> Dict[str, Any]:
    """
    Get rate limit config from DB with short TTL cache.
    Used by rate-limit middleware; avoids DB on every request.
    """
    import time
    from app.config.database import AsyncSessionLocal

    now = time.time()
    if _rate_limit_cache and (now - _rate_limit_cache.get("_ts", 0)) < _RATE_LIMIT_CACHE_TTL:
        return _rate_limit_cache.get("config", {})

    async with AsyncSessionLocal() as db:
        config = await get_rate_limit(db)
    if isinstance(config, dict):
        _rate_limit_cache["config"] = config
        _rate_limit_cache["_ts"] = now
    return config if isinstance(config, dict) else {}

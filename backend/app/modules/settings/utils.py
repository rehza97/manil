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
            value = setting.value.get("value")
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
            value = setting.value.get("value")
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


async def get_email_config(db: AsyncSession) -> Dict[str, Any]:
    """Get email configuration."""
    manager = SettingsManager(db)
    return await manager.get_category("email")


async def is_2fa_required(db: AsyncSession, role: str) -> bool:
    """Check if 2FA is required for a role."""
    manager = SettingsManager(db)
    config = await manager.get("security.2fa_required", {"admin": True, "corporate": False, "client": False})
    return config.get(role, False)


async def get_session_timeout(db: AsyncSession) -> int:
    """Get session timeout in seconds."""
    manager = SettingsManager(db)
    return await manager.get("security.session_timeout", 3600)


async def get_rate_limit(db: AsyncSession) -> Dict[str, int]:
    """Get API rate limit configuration."""
    manager = SettingsManager(db)
    return await manager.get("security.rate_limiting", {
        "enabled": True,
        "requests_per_minute": 60,
        "requests_per_hour": 1000
    })

"""
Seed settings data script.

Populates the database with initial roles and permissions.
Run this after applying migrations.
"""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config.settings import get_settings
from app.modules.settings.models import Permission, Role
from app.modules.settings.seed_data import get_permissions, get_roles

settings = get_settings()


async def seed_permissions(session: AsyncSession) -> dict:
    """Seed permissions into database."""
    print("\n📋 Seeding permissions...")

    permissions_data = get_permissions()
    permission_map = {}  # Map slug to Permission object
    created_count = 0
    skipped_count = 0

    for perm_data in permissions_data:
        # Check if permission already exists
        result = await session.execute(
            select(Permission).where(Permission.slug == perm_data["slug"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            permission_map[perm_data["slug"]] = existing
            skipped_count += 1
            print(f"  ⏭️  Skipped: {perm_data['slug']} (already exists)")
        else:
            permission = Permission(
                name=perm_data["name"],
                slug=perm_data["slug"],
                description=perm_data["description"],
                category=perm_data["category"],
                resource=perm_data["resource"],
                action=perm_data["action"],
                is_system=True,  # All seed permissions are system permissions
                is_active=True,
            )
            session.add(permission)
            await session.flush()
            permission_map[perm_data["slug"]] = permission
            created_count += 1
            print(f"  ✅ Created: {perm_data['slug']}")

    await session.commit()
    print(f"\n✅ Permissions seeded: {created_count} created, {skipped_count} skipped")
    return permission_map


async def seed_roles(session: AsyncSession, permission_map: dict) -> None:
    """Seed roles into database."""
    print("\n👥 Seeding roles...")

    roles_data = get_roles()
    created_count = 0
    skipped_count = 0

    for role_data in roles_data:
        # Check if role already exists
        result = await session.execute(
            select(Role).where(Role.slug == role_data["slug"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            skipped_count += 1
            print(f"  ⏭️  Skipped: {role_data['slug']} (already exists)")
        else:
            # Get permission objects
            role_permissions = []
            for perm_slug in role_data["permissions"]:
                if perm_slug in permission_map:
                    role_permissions.append(permission_map[perm_slug])
                else:
                    print(f"  ⚠️  Warning: Permission '{perm_slug}' not found for role '{role_data['slug']}'")

            # Create role
            role = Role(
                name=role_data["name"],
                slug=role_data["slug"],
                description=role_data["description"],
                hierarchy_level=role_data["hierarchy_level"],
                is_system=role_data["is_system"],
                is_active=True,
                permissions=role_permissions,
            )
            session.add(role)
            created_count += 1
            print(f"  ✅ Created: {role_data['slug']} ({len(role_permissions)} permissions)")

    await session.commit()
    print(f"\n✅ Roles seeded: {created_count} created, {skipped_count} skipped")


async def seed_system_settings(session: AsyncSession) -> None:
    """Seed system settings into database."""
    print("\n⚙️  Seeding system settings...")

    from app.modules.settings.models import SystemSetting
    from app.modules.settings.system_settings_data import get_system_settings

    settings_data = get_system_settings()
    created_count = 0
    skipped_count = 0

    for setting_data in settings_data:
        # Check if setting already exists
        result = await session.execute(
            select(SystemSetting).where(SystemSetting.key == setting_data["key"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            skipped_count += 1
            print(f"  ⏭️  Skipped: {setting_data['key']} (already exists)")
        else:
            setting = SystemSetting(
                key=setting_data["key"],
                value=setting_data["value"],
                category=setting_data["category"],
                description=setting_data["description"],
                is_public=setting_data["is_public"],
            )
            session.add(setting)
            created_count += 1
            print(f"  ✅ Created: {setting_data['key']}")

    await session.commit()
    print(f"\n✅ System settings seeded: {created_count} created, {skipped_count} skipped")


async def main():
    """Main seeding function."""
    print("🌱 Starting settings data seeding...")
    print(f"Database: {settings.DATABASE_URL}")

    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
    )

    # Create session
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    try:
        async with async_session() as session:
            # Seed permissions first
            permission_map = await seed_permissions(session)

            # Seed roles with permissions
            await seed_roles(session, permission_map)

            # Seed system settings
            await seed_system_settings(session)

            print("\n✅ Settings data seeding completed successfully!")
            print(f"   - {len(permission_map)} permissions")
            print(f"   - {len(get_roles())} roles")
            from app.modules.settings.system_settings_data import get_system_settings
            print(f"   - {len(get_system_settings())} system settings")

    except Exception as e:
        print(f"\n❌ Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

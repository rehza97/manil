"""
Database initialization and validation module.

This module handles automatic database creation, schema validation,
and initial data seeding for first-launch automation.
"""

import asyncio
from typing import Optional

import asyncpg
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import engine, Base, AsyncSessionLocal
from app.config.settings import get_settings
from app.modules.auth.models import User
from app.core.security import get_password_hash

settings = get_settings()


def _is_connection_error(exc: BaseException) -> bool:
    """True if the exception indicates DB connection lost or refused (e.g. during stack restart)."""
    if isinstance(exc, OSError) and getattr(exc, "errno", None) == 111:
        return True
    if type(exc).__name__ in ("ConnectionDoesNotExistError", "ConnectionRefusedError"):
        return True
    msg = str(exc).lower()
    if "connection" in msg and ("refused" in msg or "closed" in msg or "does not exist" in msg):
        return True
    if isinstance(exc, DBAPIError) and exc.orig is not None:
        return _is_connection_error(exc.orig)
    return False


async def check_database_exists(database_name: str) -> bool:
    """
    Check if database exists in PostgreSQL.

    Args:
        database_name: Name of the database to check

    Returns:
        True if database exists, False otherwise
    """
    # Parse database URL to get connection details
    db_url = settings.DATABASE_URL.replace(
        'postgresql+asyncpg://', 'postgresql://')
    parts = db_url.split('/')
    base_url = '/'.join(parts[:-1]) + '/postgres'

    try:
        conn = await asyncpg.connect(base_url)
        result = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            database_name
        )
        await conn.close()
        return result is not None
    except Exception as e:
        print(f"Error checking database existence: {e}")
        return False


async def create_database(database_name: str) -> bool:
    """
    Create database if it doesn't exist.

    Args:
        database_name: Name of the database to create

    Returns:
        True if database was created or already exists, False on error
    """
    db_url = settings.DATABASE_URL.replace(
        'postgresql+asyncpg://', 'postgresql://')
    parts = db_url.split('/')
    base_url = '/'.join(parts[:-1]) + '/postgres'

    try:
        conn = await asyncpg.connect(base_url)
        await conn.execute(f'CREATE DATABASE {database_name}')
        await conn.close()
        print(f"✅ Database '{database_name}' created successfully")
        return True
    except asyncpg.DuplicateDatabaseError:
        print(f"ℹ️  Database '{database_name}' already exists")
        return True
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False


async def create_tables() -> bool:
    """
    Create all database tables from SQLAlchemy models.

    Returns:
        True if tables were created successfully, False otherwise
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False


async def check_admin_exists(db: AsyncSession) -> bool:
    """
    Check if admin user exists in database.

    Args:
        db: Database session

    Returns:
        True if admin exists, False otherwise
    """
    try:
        from sqlalchemy import select
        from app.modules.settings.models import Role
        admin_role = await db.execute(
            select(Role.id).where(Role.slug == "admin")
        )
        admin_role_id = admin_role.scalar_one_or_none()
        if not admin_role_id:
            return False
        result = await db.execute(
            text("SELECT 1 FROM users WHERE role_id = :role_id LIMIT 1"),
            {"role_id": str(admin_role_id)}
        )
        return result.scalar() is not None
    except Exception:
        return False


async def create_admin_user(db: AsyncSession) -> Optional[User]:
    """
    Create default admin user for initial setup.

    Args:
        db: Database session

    Returns:
        Admin user object if created, None otherwise
    """
    try:
        admin_email = "admin@cloudmanager.dz"
        admin_password = "Admin123"  # Should be changed on first login

        # Check if admin already exists
        existing_admin = await db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": admin_email}
        )
        if existing_admin.scalar():
            print(f"✅ Admin user already exists: {admin_email}")
            return None

        from sqlalchemy import select
        from app.modules.settings.models import Role
        admin_role_result = await db.execute(
            select(Role).where(Role.slug == "admin", Role.is_active == True)
        )
        admin_role = admin_role_result.scalar_one_or_none()
        if not admin_role:
            print("⚠️  Admin role not found. Run seed_permissions_and_roles first.")
            return None
        admin = User(
            email=admin_email,
            password_hash=get_password_hash(admin_password),
            full_name="System Administrator",
            role_id=admin_role.id,
            is_active=True,
            created_by=None,  # No creator for system admin
            updated_by=None,
        )

        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print(f"✅ Admin user created: {admin_email}")
        print(f"⚠️  Default password: {admin_password}")
        print("🔒 IMPORTANT: Change the password immediately after first login!")

        return admin
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        await db.rollback()
        return None


async def initialize_database() -> bool:
    """
    Initialize database with all required setup.

    This function:
    1. Checks if database exists
    2. Creates database if missing
    3. Creates all tables
    4. Seeds initial admin user

    Returns:
        True if initialization successful, False otherwise
    """
    print("\n🚀 Starting database initialization...\n")

    # Extract database name from URL
    db_name = settings.DATABASE_URL.split('/')[-1]

    # Check and create database
    db_exists = await check_database_exists(db_name)
    if not db_exists:
        print(f"📦 Database '{db_name}' not found, creating...")
        if not await create_database(db_name):
            return False
    else:
        print(f"✅ Database '{db_name}' exists")

    # Create tables
    print("📋 Creating database tables...")
    if not await create_tables():
        return False

    try:
        await _run_seeds()
    except BaseException as e:
        if _is_connection_error(e):
            print(
                "\n❌ Database initialization failed: database connection lost or refused. "
                "This can happen during a stack restart. Ensure PostgreSQL is running and try again.\n"
            )
            raise RuntimeError(
                "Database connection lost or refused during initialization"
            ) from e
        raise

    print("\n✅ Database initialization completed successfully!\n")
    return True


async def _run_seeds() -> None:
    """Run all seed steps. Raises on connection errors so caller can return False."""
    # Seed permissions and roles first (admin user needs admin role)
    print("🔐 Seeding default permissions and roles...")
    async with AsyncSessionLocal() as db:
        from app.modules.settings.service import seed_permissions_and_roles
        if await seed_permissions_and_roles(db):
            print("✅ Permissions and roles seeded successfully")
        else:
            print("⚠️  Warning: Failed to seed permissions and roles")

    # Seed admin user
    print("👤 Checking for admin user...")
    async with AsyncSessionLocal() as db:
        admin_exists = await check_admin_exists(db)
        if not admin_exists:
            print("👤 Creating default admin user...")
            await create_admin_user(db)
        else:
            print("✅ Admin user already exists")

    # Seed system settings
    print("⚙️  Seeding default system settings...")
    async with AsyncSessionLocal() as db:
        from app.modules.settings.service import seed_system_settings
        if await seed_system_settings(db):
            print("✅ System settings seeded successfully")
        else:
            print("⚠️  Warning: Failed to seed system settings")

    # Seed VPS hosting data
    print("🖥️  Seeding VPS hosting plans and permissions...")
    async with AsyncSessionLocal() as db:
        from app.modules.hosting.seed_data import seed_all_hosting_data
        try:
            await seed_all_hosting_data(db)
            print("✅ VPS hosting data seeded successfully")
        except Exception as e:
            print(f"⚠️  Warning: Failed to seed VPS hosting data: {e}")

    # Seed comprehensive demo data (users, products, subscriptions, DNS)
    print("🎯 Seeding comprehensive demo data...")
    async with AsyncSessionLocal() as db:
        from app.modules.hosting.seed_demo_data import seed_all_demo_data
        try:
            await seed_all_demo_data(db)
            print("✅ Demo data seeded successfully")
        except Exception as e:
            print(f"⚠️  Warning: Failed to seed demo data: {e}")
            import traceback
            traceback.print_exc()

    # Seed ticket system data (support groups, categories, templates, rules)
    print("🎫 Seeding ticket system data...")
    async with AsyncSessionLocal() as db:
        from app.modules.tickets.seed_data import seed_all_ticket_data
        try:
            await seed_all_ticket_data(db)
            print("✅ Ticket system data seeded successfully")
        except Exception as e:
            print(f"⚠️  Warning: Failed to seed ticket data: {e}")
            import traceback
            traceback.print_exc()

    # Seeding production-like report data (customers, quotes, orders, invoices, VPS, tickets, audit, metrics)
    print("📊 Seeding production-like report data...")
    order_ids: list[str] = []
    vps_subscription_ids: list[str] = []
    container_pairs: list[tuple[str, str]] = []

    async with AsyncSessionLocal() as db:
        try:
            from app.modules.customers.seed_data import seed_production_customers
            await seed_production_customers(db)
            print("  ✅ Production customers")
        except Exception as e:
            print(f"  ⚠️  Production customers: {e}")

    async with AsyncSessionLocal() as db:
        try:
            from app.modules.quotes.seed_data import seed_production_quotes
            await seed_production_quotes(db)
            print("  ✅ Production quotes")
        except Exception as e:
            print(f"  ⚠️  Production quotes: {e}")

    async with AsyncSessionLocal() as db:
        try:
            from app.modules.orders.seed_data import seed_production_orders
            order_ids = await seed_production_orders(db)
            print("  ✅ Production orders")
        except Exception as e:
            print(f"  ⚠️  Production orders: {e}")

    # VPS subscriptions disabled - no auto-creation (vps_subscription_ids stays [])

    async with AsyncSessionLocal() as db:
        try:
            from app.modules.invoices.seed_data import seed_production_invoices
            await seed_production_invoices(db, order_ids, vps_subscription_ids)
            print("  ✅ Production invoices")
        except Exception as e:
            print(f"  ⚠️  Production invoices: {e}")

    async with AsyncSessionLocal() as db:
        try:
            from app.modules.tickets.seed_production_data import seed_production_tickets
            await seed_production_tickets(db)
            print("  ✅ Production tickets")
        except Exception as e:
            print(f"  ⚠️  Production tickets: {e}")

    async with AsyncSessionLocal() as db:
        try:
            from app.modules.audit.seed_data import seed_production_audit_logs
            await seed_production_audit_logs(db)
            print("  ✅ Production audit logs")
        except Exception as e:
            print(f"  ⚠️  Production audit logs: {e}")

    # Container metrics disabled (no VPS seeding)

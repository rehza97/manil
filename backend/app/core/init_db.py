"""
Database initialization and validation module.

This module handles automatic database creation, schema validation,
and initial data seeding for first-launch automation.
"""

import asyncio
from typing import Optional

import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import engine, Base, AsyncSessionLocal
from app.config.settings import get_settings
from app.modules.auth.models import User, UserRole
from app.core.security import get_password_hash

settings = get_settings()


async def check_database_exists(database_name: str) -> bool:
    """
    Check if database exists in PostgreSQL.

    Args:
        database_name: Name of the database to check

    Returns:
        True if database exists, False otherwise
    """
    # Parse database URL to get connection details
    db_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
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
    db_url = settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
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
        result = await db.execute(
            text("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1")
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
        admin_password = "Admin@123456"  # Should be changed on first login

        admin = User(
            email=admin_email,
            password_hash=get_password_hash(admin_password),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
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

    # Seed admin user
    print("👤 Checking for admin user...")
    async with AsyncSessionLocal() as db:
        admin_exists = await check_admin_exists(db)
        if not admin_exists:
            print("👤 Creating default admin user...")
            await create_admin_user(db)
        else:
            print("✅ Admin user already exists")

    print("\n✅ Database initialization completed successfully!\n")
    return True

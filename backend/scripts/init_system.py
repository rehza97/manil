"""
System initialization script for first-launch automation.

Run this script to set up the entire CloudManager system:
- Database creation and initialization
- Schema validation
- Redis connection check
- Storage directory creation
- Initial data seeding

Usage:
    python -m scripts.init_system
"""

from app.config.settings import get_settings
from app.config.redis import get_redis
from app.core.schema_validator import validate_schema, check_migrations_applied
from app.core.init_db import initialize_database
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


settings = get_settings()


async def check_redis_connection() -> bool:
    """
    Check if Redis is accessible.

    Returns:
        True if Redis is accessible, False otherwise
    """
    print("\n🔌 Checking Redis connection...")
    try:
        redis = await get_redis()
        await redis.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("⚠️  Make sure Redis is running")
        return False


def create_storage_directories() -> bool:
    """
    Create required storage directories.

    Returns:
        True if directories created successfully
    """
    print("\n📁 Creating storage directories...")

    directories = [
        "storage/uploads",
        "storage/temp",
        "storage/pdfs",
        "storage/attachments",
        "storage/backups",
        "logs",
    ]

    try:
        for directory in directories:
            path = Path(directory)
            path.mkdir(parents=True, exist_ok=True)
            print(f"✅ Created directory: {directory}")
        return True
    except Exception as e:
        print(f"❌ Error creating directories: {e}")
        return False


def display_welcome_message():
    """Display welcome message with system information."""
    print("\n" + "=" * 60)
    print("  CloudManager v1.0 - System Initialization")
    print("=" * 60)
    print(f"\n📦 Application: {settings.APP_NAME}")
    print(f"🔢 Version: {settings.APP_VERSION}")
    print(f"🗄️  Database: PostgreSQL")
    print(f"💾 Cache: Redis")
    print(f"🐍 Python: {sys.version.split()[0]}")
    print("\n" + "=" * 60 + "\n")


def display_completion_message(success: bool):
    """
    Display completion message.

    Args:
        success: Whether initialization was successful
    """
    print("\n" + "=" * 60)
    if success:
        print("  ✅ System Initialization Completed Successfully!")
        print("=" * 60)
        print("\n📝 Next Steps:")
        print("   1. Review database credentials")
        print("   2. Change default admin password")
        print("   3. Configure email/SMS settings")
        print("   4. Start the application: uvicorn app.main:app")
        print("\n🔐 Default Admin Credentials:")
        print("   Email: admin@cloudmanager.dz")
        print("   Password: Admin123")
        print("   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n")
    else:
        print("  ❌ System Initialization Failed")
        print("=" * 60)
        print("\n📝 Troubleshooting:")
        print("   1. Check database connection")
        print("   2. Verify Redis is running")
        print("   3. Check error messages above")
        print("   4. Review configuration in .env file\n")


async def run_initialization():
    """
    Run complete system initialization process.

    Returns:
        True if all steps completed successfully
    """
    display_welcome_message()

    steps = []

    # Step 1: Initialize database
    db_success = await initialize_database()
    steps.append(("Database Initialization", db_success))

    # Step 2: Validate schema
    schema_success = await validate_schema()
    steps.append(("Schema Validation", schema_success))

    # Step 3: Check migrations
    migrations_success = await check_migrations_applied()
    steps.append(("Migrations Check", migrations_success))

    # Step 4: Check Redis
    redis_success = await check_redis_connection()
    steps.append(("Redis Connection", redis_success))

    # Step 5: Create storage directories
    storage_success = create_storage_directories()
    steps.append(("Storage Directories", storage_success))

    # Display summary
    print("\n" + "=" * 60)
    print("  Initialization Summary")
    print("=" * 60 + "\n")

    all_success = True
    for step_name, success in steps:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {step_name}")
        if not success:
            all_success = False

    display_completion_message(all_success)

    return all_success


if __name__ == "__main__":
    try:
        success = asyncio.run(run_initialization())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Initialization interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)

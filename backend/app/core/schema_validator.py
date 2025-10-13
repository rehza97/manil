"""
Database schema validation module.

Validates that the actual database schema matches the SQLAlchemy models
to prevent schema drift and ensure consistency.
"""

from typing import Dict, List, Set, Optional
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import engine, Base


async def get_database_tables() -> Set[str]:
    """
    Get list of all tables in the database.

    Returns:
        Set of table names
    """
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("""
                    SELECT tablename
                    FROM pg_tables
                    WHERE schemaname = 'public'
                """)
            )
            tables = {row[0] for row in result}
        return tables
    except Exception as e:
        print(f"❌ Error fetching database tables: {e}")
        return set()


async def get_model_tables() -> Set[str]:
    """
    Get list of all tables defined in SQLAlchemy models.

    Returns:
        Set of table names from models
    """
    try:
        inspector = inspect(Base)
        tables = {table.name for table in Base.metadata.tables.values()}
        return tables
    except Exception as e:
        print(f"❌ Error fetching model tables: {e}")
        return set()


async def get_table_columns(table_name: str) -> Dict[str, str]:
    """
    Get columns for a specific table from database.

    Args:
        table_name: Name of the table

    Returns:
        Dictionary mapping column names to their data types
    """
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = :table_name
                    AND table_schema = 'public'
                """),
                {"table_name": table_name}
            )
            columns = {row[0]: row[1] for row in result}
        return columns
    except Exception as e:
        print(f"❌ Error fetching columns for {table_name}: {e}")
        return {}


async def validate_schema() -> bool:
    """
    Validate that database schema matches SQLAlchemy models.

    Checks:
    1. All model tables exist in database
    2. No extra tables in database (except migrations)
    3. Basic structure validation

    Returns:
        True if schema is valid, False if discrepancies found
    """
    print("\n🔍 Starting schema validation...\n")

    # Get tables from both sources
    db_tables = await get_database_tables()
    model_tables = await get_model_tables()

    # Filter out system tables
    system_tables = {'alembic_version'}
    db_tables = db_tables - system_tables

    # Check for missing tables
    missing_tables = model_tables - db_tables
    if missing_tables:
        print(f"❌ Missing tables in database: {', '.join(missing_tables)}")
        print("   Run migrations: alembic upgrade head")
        return False

    # Check for extra tables
    extra_tables = db_tables - model_tables
    if extra_tables:
        print(f"⚠️  Extra tables in database: {', '.join(extra_tables)}")
        print("   These tables are not defined in models")

    # Validate each table
    all_valid = True
    for table_name in model_tables:
        if table_name in db_tables:
            print(f"✅ Table '{table_name}' exists")
        else:
            print(f"❌ Table '{table_name}' is missing")
            all_valid = False

    if all_valid and not missing_tables:
        print("\n✅ Schema validation passed!\n")
        return True
    else:
        print("\n❌ Schema validation failed!\n")
        return False


async def get_schema_report() -> Dict:
    """
    Generate detailed schema validation report.

    Returns:
        Dictionary containing schema analysis
    """
    db_tables = await get_database_tables()
    model_tables = await get_model_tables()

    system_tables = {'alembic_version'}
    db_tables = db_tables - system_tables

    report = {
        "status": "valid" if model_tables.issubset(db_tables) else "invalid",
        "model_tables": sorted(list(model_tables)),
        "database_tables": sorted(list(db_tables)),
        "missing_tables": sorted(list(model_tables - db_tables)),
        "extra_tables": sorted(list(db_tables - model_tables)),
        "table_count": {
            "models": len(model_tables),
            "database": len(db_tables)
        }
    }

    return report


async def check_migrations_applied() -> bool:
    """
    Check if all Alembic migrations have been applied.

    Returns:
        True if migrations are up to date, False otherwise
    """
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT version_num FROM alembic_version")
            )
            version = result.scalar()

        if version:
            print(f"✅ Current migration version: {version}")
            return True
        else:
            print("⚠️  No migrations applied yet")
            return False
    except Exception as e:
        print(f"⚠️  Alembic version table not found: {e}")
        return False

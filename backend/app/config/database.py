"""
Database configuration and session management.
Uses SQLAlchemy 2.0 with async support.
"""
from typing import AsyncGenerator, Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config.settings import get_settings

settings = get_settings()

# -----------------------------------------------------------------------------
# Async engine & session (primary path for new code)
# -----------------------------------------------------------------------------

# Create async engine (asyncpg)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get an async database session.

    Example:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            return await get_all_items(db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database tables.
    Only for development. Use Alembic migrations in production.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialize database with admin user
    from app.core.init_db import initialize_database

    await initialize_database()


async def close_db() -> None:
    """Close async database connections."""
    await engine.dispose()


# -----------------------------------------------------------------------------
# Synchronous engine & session (for legacy sync services/routes)
# -----------------------------------------------------------------------------

# We create a dedicated synchronous engine using a sync driver (psycopg2),
# instead of using engine.sync_engine. The latter still relies on the async
# driver and can trigger MissingGreenlet errors when used in normal sync code.
sync_database_url = settings.DATABASE_URL.replace("+asyncpg", "")

sync_engine = create_engine(
    sync_database_url,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def get_sync_db() -> Generator[Session, None, None]:
    """
    Dependency to get a synchronous SQLAlchemy session.

    Use this in routes/services that are written with the sync ORM APIs
    (e.g., session.query(...)).
    """
    with SyncSessionLocal() as session:
        try:
            yield session
        finally:
            session.close()

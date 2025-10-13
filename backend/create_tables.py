"""
Temporary script to create all database tables from SQLAlchemy models.
This is useful for development until all migrations are created.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config.settings import get_settings
from app.config.database import Base

# Import all models to register them with Base.metadata
from app.modules.auth.models import User
from app.modules.audit.models import AuditLog
from app.modules.customers.models import Customer

async def create_tables():
    """Create all tables defined in SQLAlchemy models."""
    settings = get_settings()

    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=True
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ All tables created successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())

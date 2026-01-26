"""
Celery tasks for ticket auto-close functionality.
"""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.celery_app import celery_app
from app.config.database import AsyncSessionLocal
from app.modules.tickets.services.auto_close_service import AutoCloseService
from app.core.logging import logger


@celery_app.task(name="tickets.auto_close_resolved_tickets")
def auto_close_resolved_tickets():
    """
    Celery task to automatically close resolved tickets after X days.

    This task should be scheduled to run daily (e.g., at 2 AM).
    """
    logger.info("Starting auto-close resolved tickets task")

    try:
        # Create async database session
        async def run_auto_close():
            async with AsyncSessionLocal() as db:
                service = AutoCloseService(db)
                result = await service.close_resolved_tickets()
                return result

        # Run the async function
        import asyncio
        result = asyncio.run(run_auto_close())

        logger.info(
            f"Auto-close task completed: {result['closed_count']} tickets closed, "
            f"{len(result['errors'])} errors"
        )

        return {
            "success": True,
            "closed_count": result["closed_count"],
            "errors_count": len(result["errors"]),
            "auto_close_days": result["auto_close_days"],
        }

    except Exception as e:
        logger.error(f"Auto-close task failed: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }

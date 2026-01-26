"""
Celery application configuration.

Configures Celery for background task processing with Redis broker.
"""
from celery import Celery

from app.config.settings import get_settings

# Import all models to ensure SQLAlchemy can resolve relationships
# This prevents "failed to locate a name" errors in Celery workers
from app.modules.products.models import Product, ProductCategory  # noqa: F401
from app.modules.quotes.models import Quote, QuoteItem, QuoteTimeline  # noqa: F401
from app.modules.customers.models import Customer  # noqa: F401
from app.modules.invoices.models import Invoice  # noqa: F401
from app.modules.auth.models import User  # noqa: F401
from app.modules.tickets.models import Ticket  # noqa: F401

settings = get_settings()

# Create Celery app instance
celery_app = Celery(
    "cloudmanager",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.modules.hosting.tasks", "app.modules.tickets.tasks.auto_close_tasks"],
)

# Celery configuration
celery_app.conf.update(
    # Task serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max per task
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    
    # Result backend
    result_backend=settings.REDIS_URL,
    result_expires=3600,  # Results expire after 1 hour

    # Task routing - Disabled to use default 'celery' queue for all tasks
    # task_routes={
    #     "hosting.*": {"queue": "hosting"},
    #     "default": {"queue": "default"},
    # },

    # Worker configuration
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,

    # Broker startup behavior (Celery 6+ compatibility)
    broker_connection_retry_on_startup=True,
    
    # Beat schedule (imported from celery_config)
    beat_schedule={},  # Will be populated from celery_config
)

# Import beat schedule (after app creation to avoid circular import)
def configure_beat_schedule():
    """Configure Celery Beat schedule."""
    from app.core.celery_config import CELERYBEAT_SCHEDULE
    celery_app.conf.beat_schedule = CELERYBEAT_SCHEDULE

# Configure schedule
configure_beat_schedule()


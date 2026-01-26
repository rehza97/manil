"""
Celery Beat schedule configuration.

Defines scheduled tasks for periodic execution.
"""
from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    # Collect VPS metrics every 5 minutes
    "collect-vps-metrics": {
        "task": "hosting.collect_all_metrics",
        "schedule": crontab(minute="*/5"),
    },

    # Reconcile missing VPS containers every 5 minutes (safety net)
    "reconcile-vps-containers": {
        "task": "hosting.reconcile_missing_vps_containers",
        "schedule": crontab(minute="*/5"),
        "kwargs": {"limit": 100},
    },
    
    # Generate recurring invoices daily at midnight UTC
    "generate-vps-invoices": {
        "task": "hosting.generate_recurring_invoices",
        "schedule": crontab(hour=0, minute=0),
    },
    
    # Check overdue invoices daily at 2 AM UTC
    "check-vps-overdue": {
        "task": "hosting.check_overdue_invoices",
        "schedule": crontab(hour=2, minute=0),
    },
    
    # Auto-close resolved tickets daily at 3 AM UTC
    "auto-close-resolved-tickets": {
        "task": "tickets.auto_close_resolved_tickets",
        "schedule": crontab(hour=3, minute=0),
    },
    
    # Cleanup old metrics weekly on Sunday at 4 AM UTC
    "cleanup-vps-metrics": {
        "task": "hosting.cleanup_old_metrics",
        "schedule": crontab(day_of_week=0, hour=4, minute=0),
    },
}








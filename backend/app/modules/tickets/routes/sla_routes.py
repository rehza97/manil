"""API routes for SLA management and metrics."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permission
from app.core.permissions import Permission
from app.modules.tickets.services.sla_service import SLAService
from app.modules.tickets.services.metrics_service import MetricsService

router = APIRouter(prefix="/sla", tags=["sla"])


@router.get("/metrics", response_model=dict)
def get_sla_metrics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get SLA performance metrics."""
    return SLAService.get_sla_metrics(db, days)


@router.get("/breaches/active", response_model=list)
def get_active_breaches(
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get all active SLA breaches."""
    return SLAService.get_active_breaches(db)


@router.get("/metrics/agent/{agent_id}", response_model=dict)
def get_agent_metrics(
    agent_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get metrics for a specific agent."""
    return MetricsService.get_agent_metrics(db, agent_id, days)


@router.get("/metrics/overall", response_model=dict)
def get_overall_metrics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get overall system metrics."""
    return MetricsService.get_overall_metrics(db, days)


@router.get("/metrics/daily", response_model=list)
def get_daily_metrics(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: None = Depends(require_permission(Permission.TICKETS_VIEW)),
):
    """Get daily metrics for the past N days."""
    return MetricsService.get_daily_metrics(db, days)

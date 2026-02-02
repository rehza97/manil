"""
Operations Report Service

Four reports: SLA compliance, agent performance, ticket category analysis, quality metrics.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import Ticket
from .aggregation_service import AggregationService
from .base_report_service import BaseReportService


class OperationsReportService(BaseReportService):
    """Operations reports: SLA, agent, category, quality."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.agg = AggregationService(db)

    async def get_sla_compliance_report(
        self,
        priority: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Response/resolution SLA tracking by priority."""
        metrics = await self.agg.get_sla_compliance_metrics(priority)
        details = [
            {"metric": "total_resolved", "value": metrics["total_resolved"]},
            {"metric": "with_first_response",
                "value": metrics["with_first_response"]},
            {"metric": "response_rate", "value": metrics["response_rate"]},
        ]
        return {**metrics, "priority": priority, "details": details}

    async def get_agent_performance_report(
        self,
        agent_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Tickets per agent, resolution counts."""
        rows = await self.agg.get_agent_performance_metrics(agent_id)
        return {"agents": rows, "agent_id": agent_id}

    async def get_ticket_category_analysis_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Volume by category."""
        end = end_date or datetime.now(timezone.utc)
        q = select(Ticket.category_id, func.count(Ticket.id)).where(
            and_(Ticket.deleted_at.is_(None), Ticket.created_at <= end)
        ).group_by(Ticket.category_id)
        rows = (await self.db.execute(q)).all()
        details = [{"category_id": r[0], "count": r[1]} for r in rows]
        return {"details": details, "end_date": end}

    async def get_quality_metrics_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """First response rate, reopening rate (simplified)."""
        end = end_date or datetime.now(timezone.utc)
        q_total = select(func.count(Ticket.id)).where(
            and_(Ticket.deleted_at.is_(None), Ticket.resolved_at.isnot(
                None), Ticket.created_at <= end)
        )
        total = (await self.db.scalar(q_total)) or 0
        q_first = select(func.count(Ticket.id)).where(
            and_(Ticket.deleted_at.is_(None), Ticket.first_response_at.isnot(
                None), Ticket.resolved_at.isnot(None), Ticket.created_at <= end)
        )
        with_first = (await self.db.scalar(q_first)) or 0
        fcr = (with_first / total * 100) if total else 0
        details = [
            {"metric": "total_resolved", "value": total},
            {"metric": "with_first_response", "value": with_first},
            {"metric": "first_contact_rate", "value": round(fcr, 2)},
        ]
        return {
            "total_resolved": total,
            "with_first_response": with_first,
            "first_contact_rate": round(fcr, 2),
            "details": details,
        }

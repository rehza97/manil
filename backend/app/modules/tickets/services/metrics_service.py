"""Performance metrics service for agents and teams."""
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from app.modules.tickets.models import Ticket, TicketReply, TicketStatus

logger = logging.getLogger(__name__)


class MetricsService:
    """Service for calculating performance metrics."""

    @staticmethod
    def get_agent_metrics(db: Session, agent_id: str, days: int = 30) -> dict:
        """Get performance metrics for an agent.

        Args:
            db: Database session
            agent_id: Agent user ID
            days: Number of days to analyze

        Returns:
            Dictionary with agent metrics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Tickets assigned
        assigned_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.assigned_to == agent_id,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        # Resolved tickets
        resolved_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.assigned_to == agent_id,
                    Ticket.status == TicketStatus.CLOSED,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        # Average first response time
        tickets_with_response = db.execute(
            select(Ticket.first_response_at - Ticket.created_at).where(
                and_(
                    Ticket.assigned_to == agent_id,
                    Ticket.first_response_at.isnot(None),
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalars().all()

        avg_first_response_minutes = 0
        if tickets_with_response:
            total_minutes = sum(
                [td.total_seconds() / 60 for td in tickets_with_response if td]
            )
            avg_first_response_minutes = total_minutes / len(tickets_with_response)

        # Average resolution time
        tickets_with_resolution = db.execute(
            select(Ticket.resolved_at - Ticket.created_at).where(
                and_(
                    Ticket.assigned_to == agent_id,
                    Ticket.resolved_at.isnot(None),
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalars().all()

        avg_resolution_minutes = 0
        if tickets_with_resolution:
            total_minutes = sum(
                [td.total_seconds() / 60 for td in tickets_with_resolution if td]
            )
            avg_resolution_minutes = total_minutes / len(tickets_with_resolution)

        # Reply count
        total_replies = db.execute(
            select(func.count(TicketReply.id)).where(
                and_(
                    TicketReply.user_id == agent_id,
                    TicketReply.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        # Open tickets
        open_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.assigned_to == agent_id,
                    Ticket.status.in_([
                        TicketStatus.OPEN,
                        TicketStatus.IN_PROGRESS,
                    ]),
                )
            )
        ).scalar() or 0

        # Resolution rate
        resolution_rate = (
            (resolved_tickets / assigned_tickets * 100)
            if assigned_tickets > 0
            else 0
        )

        return {
            "agent_id": agent_id,
            "period_days": days,
            "assigned_tickets": assigned_tickets,
            "resolved_tickets": resolved_tickets,
            "open_tickets": open_tickets,
            "resolution_rate": round(resolution_rate, 2),
            "avg_first_response_minutes": round(avg_first_response_minutes, 2),
            "avg_resolution_minutes": round(avg_resolution_minutes, 2),
            "total_replies": total_replies,
        }

    @staticmethod
    def get_team_metrics(db: Session, agent_ids: list[str], days: int = 30) -> dict:
        """Get aggregated metrics for a team.

        Args:
            db: Database session
            agent_ids: List of agent user IDs
            days: Number of days to analyze

        Returns:
            Dictionary with team metrics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Team-wide metrics
        assigned_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.assigned_to.in_(agent_ids) if agent_ids else True,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        resolved_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.assigned_to.in_(agent_ids) if agent_ids else True,
                    Ticket.status == TicketStatus.CLOSED,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        open_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.assigned_to.in_(agent_ids) if agent_ids else True,
                    Ticket.status.in_([
                        TicketStatus.OPEN,
                        TicketStatus.IN_PROGRESS,
                    ]),
                )
            )
        ).scalar() or 0

        total_replies = db.execute(
            select(func.count(TicketReply.id)).where(
                and_(
                    TicketReply.user_id.in_(agent_ids) if agent_ids else True,
                    TicketReply.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        # Team resolution rate
        team_resolution_rate = (
            (resolved_tickets / assigned_tickets * 100)
            if assigned_tickets > 0
            else 0
        )

        # Get individual agent metrics
        agent_metrics = [
            MetricsService.get_agent_metrics(db, agent_id, days)
            for agent_id in agent_ids
        ]

        # Average metrics across team
        if agent_metrics:
            avg_first_response = sum(
                [m["avg_first_response_minutes"] for m in agent_metrics]
            ) / len(agent_metrics)
            avg_resolution = sum(
                [m["avg_resolution_minutes"] for m in agent_metrics]
            ) / len(agent_metrics)
        else:
            avg_first_response = 0
            avg_resolution = 0

        return {
            "team_size": len(agent_ids),
            "period_days": days,
            "total_assigned": assigned_tickets,
            "total_resolved": resolved_tickets,
            "total_open": open_tickets,
            "team_resolution_rate": round(team_resolution_rate, 2),
            "avg_first_response_minutes": round(avg_first_response, 2),
            "avg_resolution_minutes": round(avg_resolution, 2),
            "total_replies": total_replies,
            "agent_metrics": agent_metrics,
        }

    @staticmethod
    def get_overall_metrics(db: Session, days: int = 30) -> dict:
        """Get overall system metrics.

        Args:
            db: Database session
            days: Number of days to analyze

        Returns:
            Dictionary with overall metrics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Total tickets
        total_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.created_at >= cutoff_date
            )
        ).scalar() or 0

        # By status
        open_count = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.status == TicketStatus.OPEN,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        answered_count = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.status == TicketStatus.ANSWERED,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        resolved_count = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.status == TicketStatus.RESOLVED,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        closed_count = db.execute(
            select(func.count(Ticket.id)).where(
                and_(
                    Ticket.status == TicketStatus.CLOSED,
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        # Average metrics
        avg_first_response = db.execute(
            select(
                func.avg(
                    func.extract("epoch", Ticket.first_response_at - Ticket.created_at) / 60
                )
            ).where(
                and_(
                    Ticket.first_response_at.isnot(None),
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        avg_resolution = db.execute(
            select(
                func.avg(
                    func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 60
                )
            ).where(
                and_(
                    Ticket.resolved_at.isnot(None),
                    Ticket.created_at >= cutoff_date,
                )
            )
        ).scalar() or 0

        return {
            "period_days": days,
            "total_tickets": total_tickets,
            "status_distribution": {
                "open": open_count,
                "answered": answered_count,
                "resolved": resolved_count,
                "closed": closed_count,
            },
            "avg_first_response_minutes": round(float(avg_first_response), 2),
            "avg_resolution_minutes": round(float(avg_resolution), 2),
        }

    @staticmethod
    def get_daily_metrics(db: Session, days: int = 7) -> list[dict]:
        """Get daily metrics for the past N days.

        Args:
            db: Database session
            days: Number of days to analyze

        Returns:
            List of daily metrics
        """
        results = []

        for i in range(days):
            date = datetime.now(timezone.utc) - timedelta(days=i)
            date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)

            created = db.execute(
                select(func.count(Ticket.id)).where(
                    and_(
                        Ticket.created_at >= date_start,
                        Ticket.created_at <= date_end,
                    )
                )
            ).scalar() or 0

            resolved = db.execute(
                select(func.count(Ticket.id)).where(
                    and_(
                        Ticket.resolved_at >= date_start,
                        Ticket.resolved_at <= date_end,
                    )
                )
            ).scalar() or 0

            results.append({
                "date": date.date().isoformat(),
                "tickets_created": created,
                "tickets_resolved": resolved,
            })

        return results

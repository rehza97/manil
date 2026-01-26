"""
Ticket Report Service

Provides comprehensive ticket analytics and reports.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import Ticket, TicketReply
from app.modules.auth.models import User
from .schemas import (
    TicketStatusReport,
    TicketPriorityReport,
    TicketCategoryReport,
    AgentPerformance,
    TeamPerformance,
    ResponseTimeMetrics,
    ResolutionTimeMetrics,
    OpenVsClosedReport,
)


class TicketReportService:
    """Service for ticket reports and analytics"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_tickets_by_status(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TicketStatusReport]:
        """
        Get tickets grouped by status

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        # Build query conditions
        conditions = [Ticket.deleted_at.is_(None)]

        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Ticket.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1  # Avoid division by zero

        # Get count by status
        query = select(
            Ticket.status,
            func.count(Ticket.id).label("count")
        ).where(
            and_(*conditions)
        ).group_by(Ticket.status)

        result = await self.db.execute(query)
        data = result.all()

        return [
            TicketStatusReport(
                status=row.status,
                count=row.count,
                percentage=round((row.count / total) * 100, 2)
            )
            for row in data
        ]

    async def get_tickets_by_priority(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TicketPriorityReport]:
        """
        Get tickets grouped by priority with avg resolution time

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Ticket.deleted_at.is_(None)]

        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Ticket.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1

        # Get count and avg resolution time by priority
        query = select(
            Ticket.priority,
            func.count(Ticket.id).label("count"),
            func.avg(
                func.extract(
                    'epoch',
                    Ticket.resolved_at - Ticket.created_at
                ) / 3600  # Convert to hours
            ).label("avg_resolution_hours")
        ).where(
            and_(*conditions)
        ).group_by(Ticket.priority)

        result = await self.db.execute(query)
        data = result.all()

        return [
            TicketPriorityReport(
                priority=row.priority,
                count=row.count,
                percentage=round((row.count / total) * 100, 2),
                avg_resolution_time=round(row.avg_resolution_hours, 2) if row.avg_resolution_hours else None
            )
            for row in data
        ]

    async def get_tickets_by_category(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TicketCategoryReport]:
        """
        Get tickets grouped by category

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Ticket.deleted_at.is_(None)]

        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)

        # Get total count
        total_query = select(func.count(Ticket.id)).where(and_(*conditions))
        total = await self.db.scalar(total_query) or 1

        # Get count by category
        query = select(
            func.coalesce(Ticket.category_id, 0).label("category_id"),
            func.count(Ticket.id).label("count"),
            func.avg(
                func.extract(
                    'epoch',
                    Ticket.resolved_at - Ticket.created_at
                ) / 3600
            ).label("avg_resolution_hours")
        ).where(
            and_(*conditions)
        ).group_by(Ticket.category_id)

        result = await self.db.execute(query)
        data = result.all()

        return [
            TicketCategoryReport(
                category="Uncategorized" if row.category_id == 0 else f"Category {row.category_id}",
                category_id=row.category_id if row.category_id > 0 else None,
                count=row.count,
                percentage=round((row.count / total) * 100, 2),
                avg_resolution_time=round(row.avg_resolution_hours, 2) if row.avg_resolution_hours else None
            )
            for row in data
        ]

    async def get_tickets_by_agent(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AgentPerformance]:
        """
        Get agent performance metrics

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [Ticket.deleted_at.is_(None)]

        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)

        # Get ticket counts by agent
        query = select(
            Ticket.assigned_to_id,
            User.full_name,
            func.count(Ticket.id).label("total_tickets"),
            func.sum(
                case(
                    (Ticket.status.in_(["open", "in_progress", "waiting_for_response"]), 1),
                    else_=0
                )
            ).label("open_tickets"),
            func.sum(
                case(
                    (Ticket.status.in_(["resolved", "closed"]), 1),
                    else_=0
                )
            ).label("resolved_tickets"),
            func.avg(
                func.extract(
                    'epoch',
                    Ticket.first_response_at - Ticket.created_at
                ) / 3600
            ).label("avg_response_hours"),
            func.avg(
                func.extract(
                    'epoch',
                    Ticket.resolved_at - Ticket.created_at
                ) / 3600
            ).label("avg_resolution_hours")
        ).join(
            User, User.id == Ticket.assigned_to_id, isouter=True
        ).where(
            and_(
                *conditions,
                Ticket.assigned_to_id.isnot(None)
            )
        ).group_by(Ticket.assigned_to_id, User.full_name)

        result = await self.db.execute(query)
        data = result.all()

        return [
            AgentPerformance(
                agent_id=row.assigned_to_id,
                agent_name=row.full_name or "Unknown Agent",
                total_tickets=row.total_tickets,
                open_tickets=row.open_tickets,
                resolved_tickets=row.resolved_tickets,
                avg_response_time=round(row.avg_response_hours, 2) if row.avg_response_hours else None,
                avg_resolution_time=round(row.avg_resolution_hours, 2) if row.avg_resolution_hours else None,
                resolution_rate=round((row.resolved_tickets / row.total_tickets) * 100, 2) if row.total_tickets > 0 else 0.0
            )
            for row in data
        ]

    async def get_tickets_by_team(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TeamPerformance]:
        """
        Get team performance metrics

        Note: This is a simplified version. In a real implementation,
        you would need a teams table and team memberships.

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        # For now, we'll return a single "Support Team" with all agents
        agent_performances = await self.get_tickets_by_agent(start_date, end_date)

        if not agent_performances:
            return []

        # Aggregate all agent metrics
        total_tickets = sum(a.total_tickets for a in agent_performances)
        open_tickets = sum(a.open_tickets for a in agent_performances)
        resolved_tickets = sum(a.resolved_tickets for a in agent_performances)

        # Calculate averages
        response_times = [a.avg_response_time for a in agent_performances if a.avg_response_time]
        resolution_times = [a.avg_resolution_time for a in agent_performances if a.avg_resolution_time]

        avg_response_time = sum(response_times) / len(response_times) if response_times else None
        avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else None

        return [
            TeamPerformance(
                team_name="Support Team",
                total_tickets=total_tickets,
                open_tickets=open_tickets,
                resolved_tickets=resolved_tickets,
                avg_response_time=round(avg_response_time, 2) if avg_response_time else None,
                avg_resolution_time=round(avg_resolution_time, 2) if avg_resolution_time else None,
                resolution_rate=round((resolved_tickets / total_tickets) * 100, 2) if total_tickets > 0 else 0.0,
                agents=agent_performances
            )
        ]

    async def get_response_time_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ResponseTimeMetrics:
        """
        Get response time analytics

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [
            Ticket.deleted_at.is_(None),
            Ticket.first_response_at.isnot(None)
        ]

        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)

        # Calculate response time statistics
        query = select(
            func.avg(
                func.extract(
                    'epoch',
                    Ticket.first_response_at - Ticket.created_at
                ) / 3600
            ).label("avg_hours"),
            func.min(
                func.extract(
                    'epoch',
                    Ticket.first_response_at - Ticket.created_at
                ) / 3600
            ).label("min_hours"),
            func.max(
                func.extract(
                    'epoch',
                    Ticket.first_response_at - Ticket.created_at
                ) / 3600
            ).label("max_hours"),
            func.count(Ticket.id).label("total_count")
        ).where(and_(*conditions))

        result = await self.db.execute(query)
        stats = result.first()

        # Note: SLA compliance would need SLA policies to be properly calculated
        # For now, we'll use a simple 24-hour SLA
        sla_hours = 24

        within_sla_query = select(func.count(Ticket.id)).where(
            and_(
                *conditions,
                func.extract('epoch', Ticket.first_response_at - Ticket.created_at) / 3600 <= sla_hours
            )
        )
        within_sla = await self.db.scalar(within_sla_query) or 0

        total_count = stats.total_count if stats and stats.total_count else 0
        breached_sla = total_count - within_sla

        return ResponseTimeMetrics(
            avg_first_response_time=round(stats.avg_hours, 2) if stats and stats.avg_hours else None,
            median_first_response_time=None,  # Would need percentile function
            min_response_time=round(stats.min_hours, 2) if stats and stats.min_hours else None,
            max_response_time=round(stats.max_hours, 2) if stats and stats.max_hours else None,
            within_sla=within_sla,
            breached_sla=breached_sla,
            sla_compliance_rate=round((within_sla / total_count) * 100, 2) if total_count > 0 else 0.0
        )

    async def get_resolution_time_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ResolutionTimeMetrics:
        """
        Get resolution time analytics

        Args:
            start_date: Filter start date
            end_date: Filter end date
        """
        conditions = [
            Ticket.deleted_at.is_(None),
            Ticket.resolved_at.isnot(None)
        ]

        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)

        # Calculate resolution time statistics
        query = select(
            func.avg(
                func.extract(
                    'epoch',
                    Ticket.resolved_at - Ticket.created_at
                ) / 3600
            ).label("avg_hours"),
            func.min(
                func.extract(
                    'epoch',
                    Ticket.resolved_at - Ticket.created_at
                ) / 3600
            ).label("min_hours"),
            func.max(
                func.extract(
                    'epoch',
                    Ticket.resolved_at - Ticket.created_at
                ) / 3600
            ).label("max_hours"),
            func.count(Ticket.id).label("total_count")
        ).where(and_(*conditions))

        result = await self.db.execute(query)
        stats = result.first()

        # SLA for resolution (e.g., 72 hours)
        sla_hours = 72

        within_sla_query = select(func.count(Ticket.id)).where(
            and_(
                *conditions,
                func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600 <= sla_hours
            )
        )
        within_sla = await self.db.scalar(within_sla_query) or 0

        total_count = stats.total_count if stats and stats.total_count else 0
        breached_sla = total_count - within_sla

        return ResolutionTimeMetrics(
            avg_resolution_time=round(stats.avg_hours, 2) if stats and stats.avg_hours else None,
            median_resolution_time=None,  # Would need percentile function
            min_resolution_time=round(stats.min_hours, 2) if stats and stats.min_hours else None,
            max_resolution_time=round(stats.max_hours, 2) if stats and stats.max_hours else None,
            within_sla=within_sla,
            breached_sla=breached_sla,
            sla_compliance_rate=round((within_sla / total_count) * 100, 2) if total_count > 0 else 0.0
        )

    async def get_open_vs_closed_report(
        self,
        period: str = "month"
    ) -> List[OpenVsClosedReport]:
        """
        Get open vs closed tickets report

        Args:
            period: Time period (today, week, month, quarter, year)
        """
        # Calculate date range
        end_date = datetime.now(timezone.utc)

        if period == "today":
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        # Get tickets grouped by date
        query = select(
            func.date(Ticket.created_at).label("date"),
            func.count(
                case(
                    (Ticket.status.in_(["open", "in_progress", "waiting_for_response"]), 1),
                    else_=None
                )
            ).label("open_count"),
            func.count(
                case(
                    (Ticket.status.in_(["resolved", "closed"]), 1),
                    else_=None
                )
            ).label("closed_count"),
            func.count(Ticket.id).label("total_count")
        ).where(
            and_(
                Ticket.deleted_at.is_(None),
                Ticket.created_at >= start_date,
                Ticket.created_at <= end_date
            )
        ).group_by(func.date(Ticket.created_at)).order_by(func.date(Ticket.created_at))

        result = await self.db.execute(query)
        data = result.all()

        return [
            OpenVsClosedReport(
                period=str(row.date),
                open_count=row.open_count,
                closed_count=row.closed_count,
                total_count=row.total_count,
                closure_rate=round((row.closed_count / row.total_count) * 100, 2) if row.total_count > 0 else 0.0
            )
            for row in data
        ]

    async def get_tickets_for_export(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch flat list of tickets as dicts for CSV/Excel/PDF export.

        Returns dicts with keys: id, subject, status, priority, created_at,
        customer_id, assigned_to_id, first_response_at, resolved_at.
        """
        conditions = [Ticket.deleted_at.is_(None)]
        if start_date:
            conditions.append(Ticket.created_at >= start_date)
        if end_date:
            conditions.append(Ticket.created_at <= end_date)
        query = select(Ticket).where(and_(*conditions)).order_by(Ticket.created_at.desc())
        result = await self.db.execute(query)
        tickets = result.scalars().all()
        return [
            {
                "id": t.id,
                "subject": t.title,
                "status": t.status,
                "priority": t.priority or "",
                "created_at": t.created_at.isoformat() if t.created_at else "",
                "customer_id": t.customer_id or "",
                "assigned_to_id": t.assigned_to or "",
                "first_response_at": t.first_response_at.isoformat() if t.first_response_at else "",
                "resolved_at": t.resolved_at.isoformat() if t.resolved_at else "",
            }
            for t in tickets
        ]

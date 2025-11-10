"""Workload balancing service for intelligent ticket assignment."""
from typing import Optional, Dict, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import Ticket
from app.core.logging import logger


class WorkloadBalancingService:
    """
    Service for balancing ticket assignments across support agents.

    Implements round-robin and load-based assignment strategies.
    """

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def get_agent_workload(self, agent_id: str) -> int:
        """
        Get current workload (open tickets) for an agent.

        Args:
            agent_id: Agent user ID

        Returns:
            Count of open tickets assigned to agent
        """
        query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to == agent_id,
                Ticket.status.in_(["open", "answered", "in_progress", "waiting_for_response"]),
                Ticket.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_all_agents_workload(self, agent_ids: List[str]) -> Dict[str, int]:
        """
        Get workload for multiple agents.

        Args:
            agent_ids: List of agent user IDs

        Returns:
            Dictionary mapping agent_id to workload count
        """
        workloads = {}
        for agent_id in agent_ids:
            workloads[agent_id] = await self.get_agent_workload(agent_id)
        return workloads

    async def get_least_loaded_agent(self, agent_ids: List[str]) -> Optional[str]:
        """
        Find agent with least workload (round-robin based).

        Args:
            agent_ids: List of agent user IDs

        Returns:
            Agent ID with least workload, or None if list is empty
        """
        if not agent_ids:
            return None

        workloads = await self.get_all_agents_workload(agent_ids)
        least_loaded = min(workloads.items(), key=lambda x: x[1])

        logger.info(f"Least loaded agent: {least_loaded[0]} with {least_loaded[1]} tickets")
        return least_loaded[0]

    async def get_agent_statistics(self, agent_id: str) -> Dict:
        """
        Get detailed workload statistics for an agent.

        Args:
            agent_id: Agent user ID

        Returns:
            Dictionary with various statistics
        """
        # Total open tickets
        open_query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to == agent_id,
                Ticket.status.in_(["open", "answered", "in_progress", "waiting_for_response"]),
                Ticket.deleted_at.is_(None),
            )
        )
        open_result = await self.db.execute(open_query)
        open_tickets = open_result.scalar() or 0

        # High priority tickets
        high_priority_query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to == agent_id,
                Ticket.priority.in_(["high", "urgent"]),
                Ticket.status.in_(["open", "answered", "in_progress", "waiting_for_response"]),
                Ticket.deleted_at.is_(None),
            )
        )
        high_priority_result = await self.db.execute(high_priority_query)
        high_priority_tickets = high_priority_result.scalar() or 0

        # Resolved tickets
        resolved_query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to == agent_id,
                Ticket.status == "resolved",
                Ticket.deleted_at.is_(None),
            )
        )
        resolved_result = await self.db.execute(resolved_query)
        resolved_tickets = resolved_result.scalar() or 0

        return {
            "agent_id": agent_id,
            "open_tickets": open_tickets,
            "high_priority_tickets": high_priority_tickets,
            "resolved_tickets": resolved_tickets,
            "total_workload_score": open_tickets + (high_priority_tickets * 2),  # Weighted score
        }

    async def suggest_auto_assignment(self, agent_ids: List[str]) -> Optional[str]:
        """
        Suggest best agent for auto-assignment based on:
        1. Least workload (open tickets)
        2. Priority-weighted workload
        3. Availability

        Args:
            agent_ids: List of available agent user IDs

        Returns:
            Suggested agent ID, or None if no agents available
        """
        if not agent_ids:
            logger.warning("No agents available for auto-assignment")
            return None

        # Get all statistics
        stats = {}
        for agent_id in agent_ids:
            stats[agent_id] = await self.get_agent_statistics(agent_id)

        # Find agent with lowest workload score
        best_agent = min(stats.items(), key=lambda x: x[1]["total_workload_score"])

        logger.info(
            f"Auto-assignment suggestion: {best_agent[0]} "
            f"with score {best_agent[1]['total_workload_score']}"
        )
        return best_agent[0]

    async def get_team_statistics(self, agent_ids: List[str]) -> Dict:
        """
        Get aggregated team statistics.

        Args:
            agent_ids: List of agent user IDs in team

        Returns:
            Dictionary with team-wide statistics
        """
        open_query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to.in_(agent_ids),
                Ticket.status.in_(["open", "answered", "in_progress", "waiting_for_response"]),
                Ticket.deleted_at.is_(None),
            )
        )
        open_result = await self.db.execute(open_query)
        total_open = open_result.scalar() or 0

        high_priority_query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to.in_(agent_ids),
                Ticket.priority.in_(["high", "urgent"]),
                Ticket.status.in_(["open", "answered", "in_progress", "waiting_for_response"]),
                Ticket.deleted_at.is_(None),
            )
        )
        high_priority_result = await self.db.execute(high_priority_query)
        high_priority_total = high_priority_result.scalar() or 0

        resolved_query = select(func.count()).select_from(Ticket).where(
            and_(
                Ticket.assigned_to.in_(agent_ids),
                Ticket.status == "resolved",
                Ticket.deleted_at.is_(None),
            )
        )
        resolved_result = await self.db.execute(resolved_query)
        resolved_total = resolved_result.scalar() or 0

        return {
            "team_size": len(agent_ids),
            "total_open_tickets": total_open,
            "total_high_priority": high_priority_total,
            "total_resolved": resolved_total,
            "average_tickets_per_agent": (
                total_open / len(agent_ids) if agent_ids else 0
            ),
        }

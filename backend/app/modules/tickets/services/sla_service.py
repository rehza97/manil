"""SLA (Service Level Agreement) management and breach tracking."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from app.modules.tickets.models import (
    SLAPolicy,
    SLABreach,
    Ticket,
    TicketStatus,
    TicketPriority,
)

logger = logging.getLogger(__name__)


class SLAService:
    """Service for managing SLA policies and breach tracking."""

    @staticmethod
    def create_policy(
        db: Session,
        name: str,
        first_response_time: int,
        resolution_time: int,
        description: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> SLAPolicy:
        """Create an SLA policy.

        Args:
            db: Database session
            name: Policy name
            first_response_time: Minutes to first response
            resolution_time: Minutes to resolution
            description: Optional description
            priority: Optional priority level (applies to specific priority)

        Returns:
            Created SLA policy
        """
        policy = SLAPolicy(
            id=str(uuid4()),
            name=name,
            description=description,
            first_response_time=first_response_time,
            resolution_time=resolution_time,
            priority=priority,
        )

        db.add(policy)
        db.commit()
        db.refresh(policy)

        logger.info(f"SLA policy created: {policy.id} - {policy.name}")
        return policy

    @staticmethod
    def get_applicable_policy(
        db: Session,
        ticket: Ticket,
    ) -> Optional[SLAPolicy]:
        """Get applicable SLA policy for a ticket.

        Priority-specific policies override general policies.

        Args:
            db: Database session
            ticket: Ticket instance

        Returns:
            Applicable SLA policy or None
        """
        # Try priority-specific policy first
        if ticket.priority:
            policy = db.execute(
                select(SLAPolicy).where(
                    and_(
                        SLAPolicy.priority == ticket.priority,
                        SLAPolicy.is_active.is_(True),
                    )
                )
            ).first()
            if policy:
                return policy[0]

        # Fall back to general policy
        policy = db.execute(
            select(SLAPolicy).where(
                and_(
                    SLAPolicy.priority.is_(None),
                    SLAPolicy.is_active.is_(True),
                )
            )
        ).first()

        return policy[0] if policy else None

    @staticmethod
    def check_and_create_breaches(db: Session, ticket_id: str) -> list[SLABreach]:
        """Check for SLA breaches and create breach records if needed.

        Args:
            db: Database session
            ticket_id: Ticket ID

        Returns:
            List of detected breaches
        """
        ticket = db.execute(select(Ticket).where(Ticket.id == ticket_id)).first()
        if not ticket:
            return []

        ticket = ticket[0]
        policy = SLAService.get_applicable_policy(db, ticket)

        if not policy:
            return []

        breaches = []
        now = datetime.now(timezone.utc)

        # Check first response SLA
        if (
            ticket.first_response_at is None
            and ticket.created_at is not None
        ):
            expected_by = ticket.created_at + timedelta(
                minutes=policy.first_response_time
            )
            if now > expected_by:
                # Check if breach already exists
                existing_breach = db.execute(
                    select(SLABreach).where(
                        and_(
                            SLABreach.ticket_id == ticket_id,
                            SLABreach.policy_id == policy.id,
                            SLABreach.breach_type == "first_response",
                        )
                    )
                ).first()

                if not existing_breach:
                    breach = SLABreach(
                        id=str(uuid4()),
                        ticket_id=ticket_id,
                        policy_id=policy.id,
                        breach_type="first_response",
                        expected_by=expected_by,
                        breached_at=now,
                    )
                    db.add(breach)
                    breaches.append(breach)
                    logger.warning(
                        f"First response SLA breached for ticket {ticket_id}"
                    )

        # Check resolution SLA
        if (
            ticket.resolved_at is None
            and ticket.status != TicketStatus.CLOSED
            and ticket.status != TicketStatus.RESOLVED
        ):
            expected_by = ticket.created_at + timedelta(
                minutes=policy.resolution_time
            )
            if now > expected_by:
                # Check if breach already exists
                existing_breach = db.execute(
                    select(SLABreach).where(
                        and_(
                            SLABreach.ticket_id == ticket_id,
                            SLABreach.policy_id == policy.id,
                            SLABreach.breach_type == "resolution",
                        )
                    )
                ).first()

                if not existing_breach:
                    breach = SLABreach(
                        id=str(uuid4()),
                        ticket_id=ticket_id,
                        policy_id=policy.id,
                        breach_type="resolution",
                        expected_by=expected_by,
                        breached_at=now,
                    )
                    db.add(breach)
                    breaches.append(breach)
                    logger.warning(
                        f"Resolution SLA breached for ticket {ticket_id}"
                    )

        if breaches:
            db.commit()

        return breaches

    @staticmethod
    def resolve_breaches(db: Session, ticket_id: str) -> None:
        """Mark SLA breaches as resolved when ticket is resolved.

        Args:
            db: Database session
            ticket_id: Ticket ID
        """
        breaches = db.execute(
            select(SLABreach).where(
                and_(
                    SLABreach.ticket_id == ticket_id,
                    SLABreach.is_resolved.is_(False),
                )
            )
        ).scalars().all()

        now = datetime.now(timezone.utc)
        for breach in breaches:
            breach.is_resolved = True
            breach.resolved_at = now

        db.commit()
        logger.info(f"Resolved {len(breaches)} SLA breaches for ticket {ticket_id}")

    @staticmethod
    def get_ticket_breaches(db: Session, ticket_id: str) -> list[dict]:
        """Get all SLA breaches for a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID

        Returns:
            List of breach information
        """
        breaches = db.execute(
            select(SLABreach).where(SLABreach.ticket_id == ticket_id)
        ).scalars().all()

        result = []
        for breach in breaches:
            result.append({
                "id": breach.id,
                "breach_type": breach.breach_type,
                "expected_by": breach.expected_by,
                "breached_at": breach.breached_at,
                "is_resolved": breach.is_resolved,
                "resolved_at": breach.resolved_at,
            })

        return result

    @staticmethod
    def get_active_breaches(db: Session) -> list[dict]:
        """Get all active (unresolved) SLA breaches.

        Args:
            db: Database session

        Returns:
            List of active breach information
        """
        breaches = db.execute(
            select(SLABreach, Ticket).join(Ticket).where(
                SLABreach.is_resolved.is_(False)
            )
        ).all()

        result = []
        for breach, ticket in breaches:
            result.append({
                "id": breach.id,
                "ticket_id": breach.ticket_id,
                "ticket_title": ticket.title,
                "breach_type": breach.breach_type,
                "expected_by": breach.expected_by,
                "breached_at": breach.breached_at,
                "hours_overdue": (
                    (datetime.now(timezone.utc) - breach.expected_by).total_seconds() / 3600
                ),
            })

        return result

    @staticmethod
    def get_sla_metrics(db: Session, days: int = 30) -> dict:
        """Get SLA performance metrics.

        Args:
            db: Database session
            days: Number of days to analyze

        Returns:
            Dictionary with SLA metrics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Total breaches
        total_breaches = db.execute(
            select(func.count(SLABreach.id)).where(
                SLABreach.created_at >= cutoff_date
            )
        ).scalar()

        # First response breaches
        first_response_breaches = db.execute(
            select(func.count(SLABreach.id)).where(
                and_(
                    SLABreach.breach_type == "first_response",
                    SLABreach.created_at >= cutoff_date,
                )
            )
        ).scalar()

        # Resolution breaches
        resolution_breaches = db.execute(
            select(func.count(SLABreach.id)).where(
                and_(
                    SLABreach.breach_type == "resolution",
                    SLABreach.created_at >= cutoff_date,
                )
            )
        ).scalar()

        # Resolved breaches
        resolved_breaches = db.execute(
            select(func.count(SLABreach.id)).where(
                and_(
                    SLABreach.is_resolved.is_(True),
                    SLABreach.created_at >= cutoff_date,
                )
            )
        ).scalar()

        # Compliance rate
        total_tickets = db.execute(
            select(func.count(Ticket.id)).where(
                Ticket.created_at >= cutoff_date
            )
        ).scalar()

        breached_tickets = db.execute(
            select(func.count(func.distinct(SLABreach.ticket_id))).where(
                SLABreach.created_at >= cutoff_date
            )
        ).scalar()

        compliance_rate = (
            ((total_tickets - breached_tickets) / total_tickets * 100)
            if total_tickets > 0
            else 100
        )

        return {
            "period_days": days,
            "total_breaches": total_breaches or 0,
            "first_response_breaches": first_response_breaches or 0,
            "resolution_breaches": resolution_breaches or 0,
            "resolved_breaches": resolved_breaches or 0,
            "total_tickets": total_tickets or 0,
            "breached_tickets": breached_tickets or 0,
            "compliance_rate": round(compliance_rate, 2),
        }

    @staticmethod
    def get_policy_effectiveness(db: Session, policy_id: str, days: int = 30) -> dict:
        """Get effectiveness metrics for a specific SLA policy.

        Args:
            db: Database session
            policy_id: SLA policy ID
            days: Number of days to analyze

        Returns:
            Dictionary with policy effectiveness metrics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        policy = db.execute(select(SLAPolicy).where(SLAPolicy.id == policy_id)).first()
        if not policy:
            return {}

        policy = policy[0]

        # Breaches for this policy
        breaches = db.execute(
            select(func.count(SLABreach.id)).where(
                and_(
                    SLABreach.policy_id == policy_id,
                    SLABreach.created_at >= cutoff_date,
                )
            )
        ).scalar()

        # Tickets affected by this policy
        tickets_with_policy = db.execute(
            select(func.count(func.distinct(Ticket.id))).where(
                and_(
                    Ticket.created_at >= cutoff_date,
                    Ticket.priority == policy.priority if policy.priority else True,
                )
            )
        ).scalar()

        effectiveness = (
            ((tickets_with_policy - (breaches or 0)) / tickets_with_policy * 100)
            if tickets_with_policy and tickets_with_policy > 0
            else 100
        )

        return {
            "policy_name": policy.name,
            "total_breaches": breaches or 0,
            "tickets_covered": tickets_with_policy or 0,
            "effectiveness_rate": round(effectiveness, 2),
            "first_response_time_minutes": policy.first_response_time,
            "resolution_time_minutes": policy.resolution_time,
        }

"""Tag service for managing ticket tags and organization."""
import logging
from typing import Optional
from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session

from app.modules.tickets.models import Tag, TicketTag, Ticket
from app.modules.tickets.schemas import TagCreate, TagUpdate, TagResponse
from app.core.exceptions import (
    NotFoundException,
    ConflictException,
    ValidationException,
)

logger = logging.getLogger(__name__)


class TagService:
    """Service for managing tags."""

    @staticmethod
    def create_tag(db: Session, tag_data: TagCreate, user_id: str) -> TagResponse:
        """Create a new tag.

        Args:
            db: Database session
            tag_data: Tag creation data
            user_id: ID of user creating the tag

        Returns:
            TagResponse: Created tag data

        Raises:
            ConflictException: If tag name already exists
        """
        # Check if tag with same name exists
        existing = db.execute(
            select(Tag).where(Tag.name == tag_data.name).where(Tag.deleted_at.is_(None))
        ).first()

        if existing:
            raise ConflictException(f"Tag with name '{tag_data.name}' already exists")

        # Create new tag
        tag = Tag(
            id=str(uuid4()),
            name=tag_data.name,
            description=tag_data.description,
            color=tag_data.color,
            created_by=user_id,
        )

        db.add(tag)
        db.commit()
        db.refresh(tag)

        logger.info(f"Tag created: {tag.id} - {tag.name}")
        return TagResponse.model_validate(tag)

    @staticmethod
    def get_tag(db: Session, tag_id: str) -> TagResponse:
        """Get tag by ID.

        Args:
            db: Database session
            tag_id: Tag ID

        Returns:
            TagResponse: Tag data

        Raises:
            NotFoundException: If tag not found
        """
        tag = db.execute(
            select(Tag).where(
                and_(Tag.id == tag_id, Tag.deleted_at.is_(None))
            )
        ).first()

        if not tag:
            raise NotFoundException(f"Tag {tag_id} not found")

        return TagResponse.model_validate(tag[0])

    @staticmethod
    def list_tags(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
    ) -> tuple[list[TagResponse], int]:
        """List all tags with pagination.

        Args:
            db: Database session
            skip: Number of items to skip
            limit: Maximum items to return
            search: Optional search term

        Returns:
            Tuple of tags list and total count
        """
        query = select(Tag).where(Tag.deleted_at.is_(None))

        if search:
            search_term = f"%{search}%"
            query = query.where(Tag.name.ilike(search_term))

        # Get total count
        count = db.execute(select(func.count()).select_from(Tag)).scalar()

        # Get paginated results
        tags = db.execute(
            query.order_by(Tag.created_at.desc()).offset(skip).limit(limit)
        ).scalars().all()

        return [TagResponse.model_validate(tag) for tag in tags], count

    @staticmethod
    def update_tag(
        db: Session,
        tag_id: str,
        tag_data: TagUpdate,
    ) -> TagResponse:
        """Update a tag.

        Args:
            db: Database session
            tag_id: Tag ID
            tag_data: Tag update data

        Returns:
            TagResponse: Updated tag data

        Raises:
            NotFoundException: If tag not found
            ConflictException: If new name already exists
        """
        tag = db.execute(
            select(Tag).where(
                and_(Tag.id == tag_id, Tag.deleted_at.is_(None))
            )
        ).first()

        if not tag:
            raise NotFoundException(f"Tag {tag_id} not found")

        tag = tag[0]

        # Check if new name already exists
        if tag_data.name and tag_data.name != tag.name:
            existing = db.execute(
                select(Tag).where(
                    and_(
                        Tag.name == tag_data.name,
                        Tag.id != tag_id,
                        Tag.deleted_at.is_(None),
                    )
                )
            ).first()
            if existing:
                raise ConflictException(f"Tag with name '{tag_data.name}' already exists")

        # Update fields
        if tag_data.name:
            tag.name = tag_data.name
        if tag_data.description is not None:
            tag.description = tag_data.description
        if tag_data.color:
            tag.color = tag_data.color

        tag.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(tag)

        logger.info(f"Tag updated: {tag.id}")
        return TagResponse.model_validate(tag)

    @staticmethod
    def delete_tag(db: Session, tag_id: str) -> None:
        """Soft delete a tag.

        Args:
            db: Database session
            tag_id: Tag ID

        Raises:
            NotFoundException: If tag not found
        """
        tag = db.execute(
            select(Tag).where(
                and_(Tag.id == tag_id, Tag.deleted_at.is_(None))
            )
        ).first()

        if not tag:
            raise NotFoundException(f"Tag {tag_id} not found")

        tag = tag[0]
        tag.deleted_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(f"Tag deleted: {tag.id}")

    @staticmethod
    def assign_tag_to_ticket(db: Session, ticket_id: str, tag_id: str) -> None:
        """Assign a tag to a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID
            tag_id: Tag ID

        Raises:
            NotFoundException: If ticket or tag not found
            ConflictException: If tag already assigned
        """
        # Verify ticket exists
        ticket = db.execute(
            select(Ticket).where(
                and_(Ticket.id == ticket_id, Ticket.deleted_at.is_(None))
            )
        ).first()

        if not ticket:
            raise NotFoundException(f"Ticket {ticket_id} not found")

        # Verify tag exists
        tag = db.execute(
            select(Tag).where(
                and_(Tag.id == tag_id, Tag.deleted_at.is_(None))
            )
        ).first()

        if not tag:
            raise NotFoundException(f"Tag {tag_id} not found")

        # Check if already assigned
        existing = db.execute(
            select(TicketTag).where(
                and_(
                    TicketTag.ticket_id == ticket_id,
                    TicketTag.tag_id == tag_id,
                )
            )
        ).first()

        if existing:
            raise ConflictException(f"Tag already assigned to ticket")

        # Create assignment
        ticket_tag = TicketTag(
            id=str(uuid4()),
            ticket_id=ticket_id,
            tag_id=tag_id,
        )

        # Increment tag usage count
        tag = tag[0]
        tag.usage_count += 1

        db.add(ticket_tag)
        db.commit()

        logger.info(f"Tag {tag_id} assigned to ticket {ticket_id}")

    @staticmethod
    def remove_tag_from_ticket(db: Session, ticket_id: str, tag_id: str) -> None:
        """Remove a tag from a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID
            tag_id: Tag ID

        Raises:
            NotFoundException: If assignment not found
        """
        assignment = db.execute(
            select(TicketTag).where(
                and_(
                    TicketTag.ticket_id == ticket_id,
                    TicketTag.tag_id == tag_id,
                )
            )
        ).first()

        if not assignment:
            raise NotFoundException(f"Tag not assigned to ticket")

        # Decrement tag usage count
        tag = db.execute(select(Tag).where(Tag.id == tag_id)).first()
        if tag:
            tag = tag[0]
            tag.usage_count = max(0, tag.usage_count - 1)

        db.delete(assignment[0])
        db.commit()

        logger.info(f"Tag {tag_id} removed from ticket {ticket_id}")

    @staticmethod
    def get_ticket_tags(db: Session, ticket_id: str) -> list[TagResponse]:
        """Get all tags for a ticket.

        Args:
            db: Database session
            ticket_id: Ticket ID

        Returns:
            List of tags assigned to ticket
        """
        ticket_tags = db.execute(
            select(Tag).join(TicketTag).where(
                and_(
                    TicketTag.ticket_id == ticket_id,
                    Tag.deleted_at.is_(None),
                )
            )
        ).scalars().all()

        return [TagResponse.model_validate(tag) for tag in ticket_tags]

    @staticmethod
    def get_tags_by_ticket_ids(
        db: Session,
        ticket_ids: list[str],
    ) -> dict[str, list[TagResponse]]:
        """Get all tags for multiple tickets.

        Args:
            db: Database session
            ticket_ids: List of ticket IDs

        Returns:
            Dictionary mapping ticket ID to list of tags
        """
        if not ticket_ids:
            return {}

        ticket_tags = db.execute(
            select(TicketTag, Tag).join(Tag).where(
                and_(
                    TicketTag.ticket_id.in_(ticket_ids),
                    Tag.deleted_at.is_(None),
                )
            )
        ).all()

        result = {ticket_id: [] for ticket_id in ticket_ids}
        for ticket_tag, tag in ticket_tags:
            result[ticket_tag.ticket_id].append(TagResponse.model_validate(tag))

        return result

    @staticmethod
    def get_tag_statistics(db: Session) -> dict:
        """Get statistics for all tags.

        Args:
            db: Database session

        Returns:
            Dictionary with tag statistics
        """
        total_tags = db.execute(
            select(func.count(Tag.id)).where(Tag.deleted_at.is_(None))
        ).scalar()

        top_tags = db.execute(
            select(Tag).where(Tag.deleted_at.is_(None))
            .order_by(Tag.usage_count.desc())
            .limit(10)
        ).scalars().all()

        return {
            "total_tags": total_tags,
            "top_tags": [TagResponse.model_validate(tag) for tag in top_tags],
        }

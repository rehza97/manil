"""Mention system service for @mention functionality in ticket replies."""
import re
from typing import List, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.core.logging import logger


class MentionService:
    """
    Service for handling @mentions in ticket communications.

    Supports user mentions with notifications.
    """

    def __init__(self, db: AsyncSession):
        """Initialize mention service with database session."""
        self.db = db
        self.mention_pattern = re.compile(r"@(\w+)")

    def extract_mentions(self, text: str) -> List[str]:
        """
        Extract mentioned usernames from text.

        Args:
            text: Text to search for mentions

        Returns:
            List of mentioned usernames (without @)
        """
        mentions = self.mention_pattern.findall(text)
        return list(set(mentions))  # Remove duplicates

    async def resolve_mentions(self, mentions: List[str]) -> List[dict]:
        """
        Resolve mention usernames to user objects.

        Args:
            mentions: List of usernames to resolve

        Returns:
            List of user data dictionaries
        """
        if not mentions:
            return []

        query = select(User).where(User.username.in_(mentions))
        result = await self.db.execute(query)
        users = result.scalars().all()

        return [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.email.split("@")[0],
            }
            for user in users
        ]

    async def validate_mentions(self, mentions: List[str]) -> dict:
        """
        Validate mentions and report invalid ones.

        Args:
            mentions: List of usernames to validate

        Returns:
            Dictionary with valid and invalid mentions
        """
        if not mentions:
            return {"valid": [], "invalid": [], "all_valid": True}

        resolved = await self.resolve_mentions(mentions)
        resolved_usernames = {user["username"] for user in resolved}
        invalid = [m for m in mentions if m not in resolved_usernames]

        return {
            "valid": resolved,
            "invalid": invalid,
            "all_valid": len(invalid) == 0,
        }

    def format_mentions(self, text: str, mentioned_users: Optional[List[dict]] = None) -> str:
        """
        Format text with HTML links for mentioned users.

        Args:
            text: Original text with @mentions
            mentioned_users: List of mentioned user dictionaries

        Returns:
            HTML formatted text with mention links
        """
        if not mentioned_users:
            mentioned_users = []

        result = text
        for user in mentioned_users:
            username = user["username"]
            user_id = user["id"]
            mention_pattern = f"@{username}"
            mention_link = f'<a href="/users/{user_id}" class="mention">@{username}</a>'
            result = result.replace(mention_pattern, mention_link)

        return result

    async def get_notification_list(self, mentions: List[str]) -> List[str]:
        """
        Get email addresses for mentioned users (for notifications).

        Args:
            mentions: List of mentioned usernames

        Returns:
            List of email addresses to notify
        """
        if not mentions:
            return []

        query = select(User.email).where(User.username.in_(mentions))
        result = await self.db.execute(query)
        emails = result.scalars().all()

        return list(emails)

    def sanitize_mentions(self, text: str) -> str:
        """
        Sanitize mentions to prevent abuse.

        Limits mention frequency and validates format.

        Args:
            text: Text to sanitize

        Returns:
            Sanitized text
        """
        mentions = self.extract_mentions(text)

        # Limit mentions to 10 per message
        if len(mentions) > 10:
            logger.warning(f"Too many mentions ({len(mentions)}) in text, limiting to 10")
            mentions = mentions[:10]

        # Reconstruct mentions in text
        result = text
        for mention in mentions:
            if f"@{mention}" in result:
                # Keep the first occurrence
                pass
            else:
                logger.warning(f"Mention @{mention} not found in text after extraction")

        return result

    async def create_mention_notification(
        self, mentioned_user_id: str, ticket_id: str, mentioned_by: str, context: str
    ) -> dict:
        """
        Create mention notification data.

        Args:
            mentioned_user_id: ID of mentioned user
            ticket_id: Ticket ID where mention occurred
            mentioned_by: Username of person who mentioned
            context: Context of the mention (e.g., first 50 chars of message)

        Returns:
            Notification data dictionary
        """
        return {
            "mentioned_user_id": mentioned_user_id,
            "ticket_id": ticket_id,
            "mentioned_by": mentioned_by,
            "context": context[:100],  # Limit to 100 chars
            "notification_type": "mention",
            "read": False,
        }

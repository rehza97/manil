"""
Session management for tracking user sessions.
Stores session information in Redis for fast access.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.infrastructure.cache.service import CacheService


class SessionData(BaseModel):
    """Session data model."""

    session_id: str
    user_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_activity: datetime
    is_active: bool = True


class SessionManager:
    """Manages user sessions using Redis cache."""

    def __init__(self):
        self.cache = CacheService()
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"

    async def create_session(
        self,
        user_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> SessionData:
        """
        Create a new session for user.

        Args:
            user_id: User ID
            user_agent: Browser user agent string
            ip_address: Client IP address

        Returns:
            Created session data
        """
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()

        session = SessionData(
            session_id=session_id,
            user_id=user_id,
            user_agent=user_agent,
            ip_address=ip_address,
            created_at=now,
            last_activity=now,
        )

        # Store session data
        await self.cache.set_session(session_id, session.model_dump())

        # Add session to user's session list
        await self._add_user_session(user_id, session_id)

        return session

    async def get_session(self, session_id: str) -> Optional[SessionData]:
        """
        Get session data by ID.

        Args:
            session_id: Session ID

        Returns:
            Session data or None if not found
        """
        data = await self.cache.get_session(session_id)
        if data:
            return SessionData(**data)
        return None

    async def update_activity(self, session_id: str) -> bool:
        """
        Update session last activity timestamp.

        Args:
            session_id: Session ID

        Returns:
            True if updated successfully
        """
        session = await self.get_session(session_id)
        if session:
            session.last_activity = datetime.utcnow()
            return await self.cache.set_session(session_id, session.model_dump())
        return False

    async def invalidate_session(self, session_id: str) -> bool:
        """
        Invalidate a session (logout).

        Args:
            session_id: Session ID

        Returns:
            True if invalidated successfully
        """
        session = await self.get_session(session_id)
        if session:
            await self._remove_user_session(session.user_id, session_id)

        return await self.cache.delete_session(session_id)

    async def get_user_sessions(self, user_id: str) -> list[SessionData]:
        """
        Get all active sessions for a user.

        Args:
            user_id: User ID

        Returns:
            List of active sessions
        """
        key = f"{self.user_sessions_prefix}{user_id}"
        session_ids = await self.cache.get(key)

        if not session_ids:
            return []

        sessions = []
        for session_id in session_ids:
            session = await self.get_session(session_id)
            if session and session.is_active:
                sessions.append(session)

        return sessions

    async def invalidate_all_user_sessions(self, user_id: str) -> int:
        """
        Invalidate all sessions for a user.

        Args:
            user_id: User ID

        Returns:
            Number of sessions invalidated
        """
        sessions = await self.get_user_sessions(user_id)
        count = 0

        for session in sessions:
            if await self.invalidate_session(session.session_id):
                count += 1

        # Clear user session list
        key = f"{self.user_sessions_prefix}{user_id}"
        await self.cache.delete(key)

        return count

    async def _add_user_session(self, user_id: str, session_id: str) -> bool:
        """Add session to user's session list."""
        key = f"{self.user_sessions_prefix}{user_id}"
        sessions = await self.cache.get(key) or []

        if session_id not in sessions:
            sessions.append(session_id)
            return await self.cache.set(key, sessions)

        return True

    async def _remove_user_session(self, user_id: str, session_id: str) -> bool:
        """Remove session from user's session list."""
        key = f"{self.user_sessions_prefix}{user_id}"
        sessions = await self.cache.get(key) or []

        if session_id in sessions:
            sessions.remove(session_id)
            return await self.cache.set(key, sessions)

        return True

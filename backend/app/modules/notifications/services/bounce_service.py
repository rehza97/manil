"""
Email bounce handling service.

Processes bounce events from email providers and manages bounce records.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.modules.tickets.models import EmailBounce, EmailBounceType
from app.core.logging import logger


class BounceService:
    """Service for handling email bounces."""

    @staticmethod
    def classify_bounce_type(
        bounce_reason: str,
        bounce_code: Optional[str] = None,
    ) -> str:
        """
        Classify bounce type as permanent or temporary.

        Args:
            bounce_reason: Bounce reason message
            bounce_code: Bounce code from provider (if available)

        Returns:
            'permanent' or 'temporary'
        """
        reason_lower = bounce_reason.lower()
        
        # Permanent bounce indicators
        permanent_indicators = [
            "550", "551", "552", "553", "554",  # SMTP permanent failure codes
            "invalid", "does not exist", "no such user", "user unknown",
            "mailbox unavailable", "address rejected", "blacklisted",
            "spam", "blocked", "banned", "permanent failure",
        ]
        
        # Temporary bounce indicators
        temporary_indicators = [
            "421", "450", "451", "452",  # SMTP temporary failure codes
            "temporary", "timeout", "over quota", "mailbox full",
            "try again", "retry", "server busy", "rate limit",
        ]
        
        # Check bounce code first
        if bounce_code:
            if bounce_code.startswith(("550", "551", "552", "553", "554")):
                return EmailBounceType.PERMANENT.value
            if bounce_code.startswith(("421", "450", "451", "452")):
                return EmailBounceType.TEMPORARY.value
        
        # Check reason text
        for indicator in permanent_indicators:
            if indicator in reason_lower:
                return EmailBounceType.PERMANENT.value
        
        for indicator in temporary_indicators:
            if indicator in reason_lower:
                return EmailBounceType.TEMPORARY.value
        
        # Default to permanent if unclear
        return EmailBounceType.PERMANENT.value

    @staticmethod
    def process_bounce(
        db: Session,
        email_address: str,
        bounce_reason: str,
        bounce_type: Optional[str] = None,
        bounce_code: Optional[str] = None,
        bounce_timestamp: Optional[datetime] = None,
    ) -> EmailBounce:
        """
        Process a bounce event and create/update bounce record.

        Args:
            db: Database session
            email_address: Bounced email address
            bounce_reason: Bounce reason message
            bounce_type: Bounce type (permanent/temporary) - auto-classified if None
            bounce_code: Bounce code from provider
            bounce_timestamp: Bounce timestamp (defaults to now)

        Returns:
            Created or updated EmailBounce record
        """
        if bounce_timestamp is None:
            bounce_timestamp = datetime.now(timezone.utc)
        
        # Classify bounce type if not provided
        if bounce_type is None:
            bounce_type = BounceService.classify_bounce_type(bounce_reason, bounce_code)
        
        # Check if bounce record already exists
        existing = db.execute(
            select(EmailBounce).where(EmailBounce.email_address == email_address)
        ).scalar_one_or_none()
        
        if existing:
            # Update existing record
            existing.bounce_type = bounce_type
            existing.bounce_reason = bounce_reason
            existing.bounce_timestamp = bounce_timestamp
            existing.retry_count += 1
            existing.last_retry_at = bounce_timestamp
            
            # Mark as invalid if permanent
            if bounce_type == EmailBounceType.PERMANENT.value:
                existing.is_invalid = True
            
            db.commit()
            db.refresh(existing)
            
            logger.info(f"Updated bounce record for {email_address}: {bounce_type}")
            return existing
        else:
            # Create new bounce record
            bounce = EmailBounce(
                email_address=email_address,
                bounce_type=bounce_type,
                bounce_reason=bounce_reason,
                bounce_timestamp=bounce_timestamp,
                is_invalid=(bounce_type == EmailBounceType.PERMANENT.value),
                retry_count=1,
                last_retry_at=bounce_timestamp,
            )
            
            db.add(bounce)
            db.commit()
            db.refresh(bounce)
            
            logger.info(f"Created bounce record for {email_address}: {bounce_type}")
            return bounce

    @staticmethod
    def is_email_invalid(db: Session, email_address: str) -> bool:
        """
        Check if an email address is marked as invalid (permanent bounce).

        Args:
            db: Database session
            email_address: Email address to check

        Returns:
            True if email is invalid, False otherwise
        """
        bounce = db.execute(
            select(EmailBounce).where(
                and_(
                    EmailBounce.email_address == email_address,
                    EmailBounce.is_invalid.is_(True),
                )
            )
        ).scalar_one_or_none()
        
        return bounce is not None

    @staticmethod
    def mark_email_valid(db: Session, email_address: str) -> bool:
        """
        Mark an email address as valid (remove invalid flag).

        Args:
            db: Database session
            email_address: Email address to mark as valid

        Returns:
            True if updated, False if not found
        """
        bounce = db.execute(
            select(EmailBounce).where(EmailBounce.email_address == email_address)
        ).scalar_one_or_none()
        
        if bounce:
            bounce.is_invalid = False
            db.commit()
            logger.info(f"Marked email as valid: {email_address}")
            return True
        
        return False

    @staticmethod
    def get_bounces(
        db: Session,
        bounce_type: Optional[str] = None,
        is_invalid: Optional[bool] = None,
        limit: int = 100,
    ) -> list[EmailBounce]:
        """
        Get bounce records with filtering.

        Args:
            db: Database session
            bounce_type: Filter by bounce type
            is_invalid: Filter by invalid status
            limit: Maximum number of records

        Returns:
            List of EmailBounce records
        """
        query = select(EmailBounce)
        
        conditions = []
        if bounce_type:
            conditions.append(EmailBounce.bounce_type == bounce_type)
        if is_invalid is not None:
            conditions.append(EmailBounce.is_invalid == is_invalid)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(EmailBounce.bounce_timestamp.desc()).limit(limit)
        
        result = db.execute(query)
        return list(result.scalars().all())

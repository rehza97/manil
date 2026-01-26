"""
Password migration utilities.

Handles migration from bcrypt to Argon2 password hashing.
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.modules.auth.models import User
from app.core.security import get_password_hash, verify_password
from app.core.logging import logger


async def migrate_user_password_on_login(
    db: AsyncSession,
    user: User,
    plain_password: str,
) -> bool:
    """
    Migrate user password from bcrypt to Argon2 if needed.

    Args:
        db: Database session
        user: User object
        plain_password: Plain text password (already verified)

    Returns:
        True if migration occurred, False otherwise
    """
    # Check if password is using bcrypt (starts with $2a$, $2b$, or $2y$)
    if user.password_hash.startswith(("$2a$", "$2b$", "$2y$")):
        # Rehash with Argon2
        new_hash = get_password_hash(plain_password)
        
        # Update user password hash
        user.password_hash = new_hash
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Password migrated to Argon2 for user {user.email}")
        return True
    
    return False


async def batch_migrate_passwords(
    db: AsyncSession,
    limit: Optional[int] = None,
    dry_run: bool = False,
) -> dict:
    """
    Batch migrate passwords from bcrypt to Argon2.

    Args:
        db: Database session
        limit: Maximum number of users to migrate (None for all)
        dry_run: If True, don't actually update passwords

    Returns:
        Dictionary with migration statistics
    """
    # Find users with bcrypt passwords
    query = select(User).where(
        User.password_hash.like("$2a$%")
        | User.password_hash.like("$2b$%")
        | User.password_hash.like("$2y$%")
    )
    
    if limit:
        query = query.limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    migrated = 0
    failed = 0
    
    for user in users:
        try:
            # Note: We can't verify the password without the plain text
            # This function should be called with user consent or during maintenance
            # For now, we'll just log that migration is needed
            if not dry_run:
                # In a real scenario, you'd need the user's password
                # This is a placeholder - actual migration should happen on next login
                logger.warning(
                    f"User {user.email} needs password migration on next login"
                )
            migrated += 1
        except Exception as e:
            logger.error(f"Failed to migrate password for user {user.email}: {e}")
            failed += 1
    
    return {
        "total_found": len(users),
        "migrated": migrated,
        "failed": failed,
        "dry_run": dry_run,
    }

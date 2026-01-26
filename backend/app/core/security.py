"""
Security utilities for authentication and password handling.
Includes JWT token management and password hashing.

JWT: Access tokens (30 min), refresh tokens (7 days), type "access"|"refresh".
Algorithm HS256. Decode via decode_token(); validate "type" and "exp" in payload.

Logout: Currently client-side only (tokens cleared in storage). For production,
consider a server-side token blacklist (e.g. Redis) and revoke on logout.
"""
import secrets
from datetime import datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config.settings import get_settings
from app.core.logging import logger

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using Argon2 (with bcrypt fallback for compatibility).

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time delta

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Create a JWT refresh token.

    Args:
        data: Data to encode in the token

    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any] | None:
    """
    Decode and validate a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def generate_reset_token() -> str:
    """
    Generate a secure random token for password reset.

    Returns:
        Random URL-safe token string
    """
    return secrets.token_urlsafe(32)


def create_reset_token(email: str) -> str:
    """
    Create a JWT token for password reset.

    Args:
        email: User email address

    Returns:
        Encoded JWT token for password reset
    """
    expire = datetime.utcnow() + timedelta(hours=1)  # 1 hour validity
    to_encode = {"sub": email, "exp": expire, "type": "reset"}
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_reset_token(token: str) -> str | None:
    """
    Verify and decode a password reset token.

    Args:
        token: Password reset JWT token

    Returns:
        User email if token is valid, None otherwise
    """
    payload = decode_token(token)
    if payload and payload.get("type") == "reset":
        return payload.get("sub")
    return None


def generate_reset_code() -> str:
    """
    Generate a 6-digit password reset code.

    Returns:
        6-digit code string
    """
    return f"{secrets.randbelow(1000000):06d}"


async def store_reset_code(email: str, code: str, method: str) -> bool:
    """
    Store password reset code in Redis with 1 hour expiration.

    Args:
        email: User email address
        code: 6-digit reset code
        method: Reset method ('email' or 'sms')

    Returns:
        True if stored successfully
    """
    try:
        from app.config.redis import get_redis
        import json
        from datetime import datetime, timezone
        
        redis_client = await get_redis()
        key = f"password_reset_code:{email}"
        value = json.dumps({
            "code": code,
            "method": method,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        # Store for 1 hour (3600 seconds)
        await redis_client.setex(key, 3600, value)
        return True
    except Exception as e:
        logger.error(f"Failed to store reset code in Redis: {e}")
        return False


async def verify_reset_code(email: str, code: str) -> bool:
    """
    Verify password reset code from Redis.

    Args:
        email: User email address
        code: 6-digit reset code to verify

    Returns:
        True if code is valid and not expired
    """
    try:
        from app.config.redis import get_redis
        import json
        
        redis_client = await get_redis()
        key = f"password_reset_code:{email}"
        stored_data = await redis_client.get(key)
        
        if not stored_data:
            return False
        
        data = json.loads(stored_data)
        return data.get("code") == code
    except Exception as e:
        logger.error(f"Failed to verify reset code from Redis: {e}")
        return False


async def delete_reset_code(email: str) -> None:
    """
    Delete password reset code from Redis after use.

    Args:
        email: User email address
    """
    try:
        from app.config.redis import get_redis
        redis_client = await get_redis()
        key = f"password_reset_code:{email}"
        await redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Failed to delete reset code from Redis: {e}")


def create_pending_2fa_token(user_id: str) -> str:
    """
    Create a short-lived JWT for 2FA-at-login flow.
    Used when password is correct but 2FA must be verified before issuing real tokens.

    Args:
        user_id: User ID (sub)

    Returns:
        Encoded JWT with type "pending_2fa", 5 min expiry
    """
    expire = datetime.utcnow() + timedelta(minutes=5)
    to_encode = {"sub": user_id, "exp": expire, "type": "pending_2fa"}
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_pending_2fa_token(token: str) -> str | None:
    """
    Decode pending-2FA token and return user_id if valid.

    Returns:
        User ID (sub) or None if invalid/expired
    """
    payload = decode_token(token)
    if payload and payload.get("type") == "pending_2fa":
        return payload.get("sub")
    return None

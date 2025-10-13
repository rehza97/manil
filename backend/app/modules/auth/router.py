"""
Authentication API routes.
Handles user registration, login, and 2FA endpoints.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.dependencies import get_current_user_id
from app.modules.auth.session import SessionManager, SessionData
from app.modules.auth.schemas import (
    UserCreate,
    UserResponse,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    Enable2FAResponse,
    Verify2FARequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordResetResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user information
    """
    service = AuthService(db)
    user = await service.register(user_data)
    return user


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Login with email and password.

    Args:
        login_data: Login credentials
        db: Database session

    Returns:
        Access token, refresh token, and user information
    """
    service = AuthService(db)
    return await service.login(login_data.email, login_data.password)


@router.post("/refresh")
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Refresh access token using refresh token.

    Args:
        token_data: Refresh token
        db: Database session

    Returns:
        New access token
    """
    service = AuthService(db)
    return await service.refresh_access_token(token_data.refresh_token)


@router.post("/2fa/enable", response_model=Enable2FAResponse)
async def enable_2fa(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Enable 2FA for current user.

    Args:
        user_id: Current user ID
        db: Database session

    Returns:
        2FA setup information with QR code
    """
    service = AuthService(db)
    return await service.enable_2fa(user_id)


@router.post("/2fa/verify")
async def verify_2fa(
    code_data: Verify2FARequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Verify 2FA code.

    Args:
        code_data: TOTP code
        user_id: Current user ID
        db: Database session

    Returns:
        Verification result
    """
    service = AuthService(db)
    is_valid = await service.verify_2fa(user_id, code_data.code)
    return {"valid": is_valid}


@router.post("/2fa/disable", response_model=UserResponse)
async def disable_2fa(
    code_data: Verify2FARequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Disable 2FA for current user.

    Args:
        code_data: TOTP code for verification
        user_id: Current user ID
        db: Database session

    Returns:
        Updated user information
    """
    service = AuthService(db)
    user = await service.disable_2fa(user_id, code_data.code)
    return user


@router.post("/password-reset/request", response_model=PasswordResetResponse)
async def request_password_reset(
    reset_data: PasswordResetRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Request password reset token.

    Args:
        reset_data: Password reset request with email
        db: Database session

    Returns:
        Password reset confirmation message
    """
    service = AuthService(db)
    await service.request_password_reset(reset_data.email)

    # Always return success for security (don't reveal if email exists)
    return PasswordResetResponse(
        message="If the email exists, a password reset link has been sent",
        email=reset_data.email,
    )


@router.post("/password-reset/confirm", response_model=UserResponse)
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Confirm password reset with token and new password.

    Args:
        reset_data: Reset token and new password
        db: Database session

    Returns:
        Updated user information
    """
    service = AuthService(db)
    user = await service.reset_password(reset_data.token, reset_data.new_password)
    return user


@router.get("/sessions", response_model=list[SessionData])
async def get_user_sessions(
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """
    Get all active sessions for current user.

    Args:
        user_id: Current user ID

    Returns:
        List of active user sessions
    """
    session_manager = SessionManager()
    return await session_manager.get_user_sessions(user_id)


@router.delete("/sessions/{session_id}")
async def invalidate_session(
    session_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """
    Invalidate a specific session.

    Args:
        session_id: Session ID to invalidate
        user_id: Current user ID

    Returns:
        Success message
    """
    session_manager = SessionManager()

    # Verify session belongs to user
    session = await session_manager.get_session(session_id)
    if not session or session.user_id != user_id:
        return {"success": False, "message": "Session not found"}

    success = await session_manager.invalidate_session(session_id)
    return {"success": success, "message": "Session invalidated"}


@router.delete("/sessions")
async def invalidate_all_sessions(
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """
    Invalidate all sessions for current user (logout from all devices).

    Args:
        user_id: Current user ID

    Returns:
        Success message with count of invalidated sessions
    """
    session_manager = SessionManager()
    count = await session_manager.invalidate_all_user_sessions(user_id)
    return {"success": True, "count": count, "message": f"Invalidated {count} sessions"}
